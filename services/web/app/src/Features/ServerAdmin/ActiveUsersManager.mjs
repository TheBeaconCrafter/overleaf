import logger from '@overleaf/logger'
import { db } from '../../infrastructure/mongodb.mjs'
import RedisWrapper from '../../infrastructure/RedisWrapper.mjs'
import Settings from '@overleaf/settings'

const realtimeRedis = RedisWrapper.client('realtime')

/**
 * Get all users with their online status and current project (if any)
 * @returns {Promise<{users: Array, onlineCount: number}>}
 */
async function getAllUsersWithStatus() {
  try {
    // Get all users from MongoDB
    const users = await db.users
      .find(
        {},
        {
          projection: {
            _id: 1,
            email: 1,
            first_name: 1,
            last_name: 1,
          },
        }
      )
      .toArray()

    // Check each user for editing status, current project, and storage
    const usersWithStatus = await Promise.all(
      users.map(async user => {
        const { isOnline, projectInfo } = await _isUserOnline(user)
        
        // Get project name if we found a project ID
        let currentProject = null
        if (isOnline && projectInfo && projectInfo.id) {
          try {
            const ObjectId = await import('mongodb').then(m => m.ObjectId)
            let projectQuery
            
            // Try to convert to ObjectId, fallback to string if it fails
            try {
              projectQuery = { _id: new ObjectId(projectInfo.id) }
            } catch (e) {
              projectQuery = { _id: projectInfo.id }
            }
            
            const project = await db.projects.findOne(
              projectQuery,
              { projection: { name: 1 } }
            )
            
            if (project) {
              currentProject = {
                id: projectInfo.id,
                name: project.name || 'Untitled',
              }
            }
          } catch (projectError) {
            logger.debug(
              { error: projectError, projectId: projectInfo.id, userId: user._id },
              'Error fetching project name'
            )
          }
        }
        
        const storageUsed = await _getUserStorageUsed(user)

        const userData = {
          _id: user._id.toString(),
          email: user.email || '',
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          isOnline: Boolean(isOnline), // Ensure it's a boolean
          currentProject: currentProject,
          storageUsed,
        }

        logger.debug(
          { 
            userId: user._id, 
            email: user.email, 
            isOnline: userData.isOnline,
            hasCurrentProject: !!userData.currentProject,
            currentProject: userData.currentProject
          },
          'User status determined'
        )

        return userData
      })
    )

    // Sort: editing users first, then alphabetically by email
    usersWithStatus.sort((a, b) => {
      if (a.isOnline !== b.isOnline) {
        return b.isOnline ? 1 : -1
      }
      return (a.email || '').localeCompare(b.email || '')
    })

    const onlineCount = usersWithStatus.filter(u => Boolean(u.isOnline)).length

    logger.info(
      {
        totalUsers: usersWithStatus.length,
        editingCount: onlineCount,
        notEditingCount: usersWithStatus.length - onlineCount,
        sampleUsers: usersWithStatus.slice(0, 3).map(u => ({
          email: u.email,
          isEditing: u.isOnline,
          hasProject: !!u.currentProject,
          projectName: u.currentProject?.name,
        })),
      },
      'Editing users status summary'
    )

    return {
      users: usersWithStatus,
      onlineCount,
    }
  } catch (error) {
    logger.error({ error }, 'Error getting all users with status')
    throw error
  }
}

/**
 * Check if a user is currently connected via realtime Redis and get their project info
 * Uses realtime Redis to check for connected users with key format: connected_user:{project_id}:{client_id}
 * @param {Object} user - User object with _id
 * @returns {Promise<{isOnline: boolean, projectInfo: Object|null}>}
 */
async function _isUserOnline(user) {
  const userIdStr = user._id.toString()
  const startTime = Date.now()
  const MAX_CHECK_TIME = 3000 // 3 seconds max per user

  try {
    if (!realtimeRedis) {
      logger.debug({ userId: userIdStr }, 'Realtime Redis client not available')
      return { isOnline: false, projectInfo: null }
    }

    // Check realtime Redis for connected users
    // Use correct key format: connected_user:{project_id}:{client_id}
    try {
      // Scan for connected_user keys with timeout
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => {
          logger.debug(
            { userId: userIdStr },
            'Realtime scan timeout after 3 seconds'
          )
          resolve([])
        }, MAX_CHECK_TIME)
      })

      const scanPromise = _scanRedisKeys('connected_user:*', 200)
      const keys = await Promise.race([scanPromise, timeoutPromise])

      if (Array.isArray(keys) && keys.length > 0) {
        // Limit to first 200 keys to prevent performance issues
        const keysToCheck = keys.slice(0, 200)

        for (const key of keysToCheck) {
          // Check if we've exceeded max time
          if (Date.now() - startTime > MAX_CHECK_TIME) {
            logger.debug(
              { userId: userIdStr },
              'Check exceeded max time, stopping scan'
            )
            break
          }

          try {
            // Get user_id from the hash
            const userData = await realtimeRedis.hgetall(key)

            if (userData && userData.user_id === userIdStr) {
              // Extract project_id from key: connected_user:{project_id}:{client_id}
              const match = key.match(/connected_user:\{([^}]+)\}:/)
              if (match && match[1]) {
                const projectId = match[1]
                
                logger.debug(
                  { userId: userIdStr, key, projectId, checkTime: Date.now() - startTime },
                  'User found editing via realtime connection'
                )
                
                return { 
                  isOnline: true, 
                  projectInfo: { id: projectId } 
                }
              }
            }
          } catch (keyError) {
            // Skip this key if there's an error
            logger.debug(
              { error: keyError, key, userId: userIdStr },
              'Error checking connected user key'
            )
            continue
          }
        }
      }

      logger.debug(
        { userId: userIdStr, checkTime: Date.now() - startTime, keysScanned: keys?.length || 0 },
        'User determined to be not editing'
      )

      return { isOnline: false, projectInfo: null }
    } catch (realtimeError) {
      logger.warn(
        { error: realtimeError, userId: userIdStr },
        'Error checking realtime Redis connections'
      )
      return { isOnline: false, projectInfo: null }
    }
  } catch (error) {
    logger.warn(
      { error, userId: user._id, errorMessage: error.message },
      'Error checking if user is editing - returning false'
    )
    return { isOnline: false, projectInfo: null }
  }
}

/**
 * Get the current project a user is working on (if any)
 * Queries the real-time service Redis to find connected clients
 * @param {Object} user - User object with _id
 * @returns {Promise<Object|null>} - {id, name} or null
 */
async function _getUserCurrentProject(user) {
  try {
    const userIdStr = user._id.toString()
    
    if (!realtimeRedis) {
      return null
    }
    
    // Use correct key format: connected_user:{project_id}:{client_id}
    const keys = await _scanRedisKeys('connected_user:*', 100)
    
    if (keys.length === 0) {
      return null
    }
    
    for (const key of keys) {
      try {
        const userData = await realtimeRedis.hgetall(key)
        
        if (userData && userData.user_id === userIdStr) {
          // Extract project_id from key: connected_user:{project_id}:{client_id}
          const match = key.match(/connected_user:\{([^}]+)\}:/)
          if (match && match[1]) {
            const projectId = match[1]
            
            // Get project name from MongoDB - handle ObjectId properly
            const ObjectId = await import('mongodb').then(m => m.ObjectId)
            let projectQuery
            
            // Try to convert to ObjectId, fallback to string if it fails
            try {
              projectQuery = { _id: new ObjectId(projectId) }
            } catch (e) {
              projectQuery = { _id: projectId }
            }
            
            const project = await db.projects.findOne(
              projectQuery,
              { projection: { name: 1 } }
            )
            
            if (project) {
              return {
                id: projectId,
                name: project.name || 'Untitled',
              }
            }
          }
        }
      } catch (keyError) {
        // Skip this key if there's an error, continue to next
        logger.debug(
          { error: keyError, key },
          'Error processing key for user current project'
        )
        continue
      }
    }
    
    return null
  } catch (error) {
    logger.warn(
      { error, userId: user._id },
      'Error getting user current project'
    )
    return null
  }
}

/**
 * Scan Redis keys matching a pattern (limited to avoid performance issues)
 * @param {string} pattern - Redis key pattern
 * @param {number} maxKeys - Maximum number of keys to return (default: 200)
 * @returns {Promise<Array<string>>}
 */
async function _scanRedisKeys(pattern, maxKeys = 200) {
  const keys = []
  
  try {
    if (!realtimeRedis) {
      logger.debug({ pattern }, 'Realtime Redis client not available')
      return keys
    }

    let cursor = '0'
    do {
      const result = await realtimeRedis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        50 // Reduced from 100 for better performance
      )
      cursor = result[0]
      const foundKeys = result[1] || []
      
      keys.push(...foundKeys)
      
      if (keys.length >= maxKeys) {
        logger.debug(
          { pattern, count: keys.length },
          'Redis scan reached max key limit'
        )
        break
      }
    } while (cursor !== '0' && keys.length < maxKeys)
  } catch (error) {
    logger.error({ error, pattern }, 'Error scanning Redis keys')
  }
  
  return keys
}

/**
 * Calculate total storage used by a user's projects
 * @param {Object} user - User object with _id
 * @returns {Promise<number>} - Storage in bytes
 */
async function _getUserStorageUsed(user) {
  try {
    const userId = user._id
    
    // Get all projects owned by this user
    const projects = await db.projects
      .find(
        { owner_ref: userId },
        { projection: { _id: 1 } }
      )
      .toArray()
    
    if (!projects || projects.length === 0) {
      return 0
    }
    
    // Calculate total size of all docs in user's projects
    let totalSize = 0
    
    for (const project of projects) {
      try {
        // Get all docs for this project
        const docs = await db.docs
          .find(
            { project_id: project._id },
            { projection: { lines: 1 } }
          )
          .toArray()
        
        // Calculate size from doc lines
        for (const doc of docs) {
          if (doc.lines && Array.isArray(doc.lines)) {
            // Approximate size: sum of line lengths + newlines
            const docSize = doc.lines.reduce((sum, line) => {
              return sum + (line ? line.length : 0) + 1 // +1 for newline
            }, 0)
            totalSize += docSize
          }
        }
      } catch (projectError) {
        logger.debug(
          { error: projectError, projectId: project._id },
          'Error calculating storage for project'
        )
        // Continue to next project
      }
    }
    
    return totalSize
  } catch (error) {
    logger.warn(
      { error, userId: user._id },
      'Error calculating user storage'
    )
    return 0
  }
}

export default {
  getAllUsersWithStatus,
}

