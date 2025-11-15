import logger from '@overleaf/logger'
import { db } from '../../infrastructure/mongodb.js'
import UserSessionsRedis from '../User/UserSessionsRedis.mjs'
import RedisWrapper from '../../infrastructure/RedisWrapper.js'
import Settings from '@overleaf/settings'

const rclient = UserSessionsRedis.client()
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

    // Check each user for active sessions, current project, and storage
    const usersWithStatus = await Promise.all(
      users.map(async user => {
        const isOnline = await _isUserOnline(user)
        const currentProject = isOnline ? await _getUserCurrentProject(user) : null
        const storageUsed = await _getUserStorageUsed(user)

        return {
          _id: user._id.toString(),
          email: user.email || '',
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          isOnline,
          currentProject,
          storageUsed,
        }
      })
    )

    // Sort: online users first, then alphabetically by email
    usersWithStatus.sort((a, b) => {
      if (a.isOnline !== b.isOnline) {
        return b.isOnline ? 1 : -1
      }
      return (a.email || '').localeCompare(b.email || '')
    })

    const onlineCount = usersWithStatus.filter(u => u.isOnline).length

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
 * Check if a user has an active session in Redis
 * @param {Object} user - User object with _id
 * @returns {Promise<boolean>}
 */
async function _isUserOnline(user) {
  try {
    // Verify Redis client is available
    if (!rclient) {
      logger.error(
        { userId: user._id },
        'Redis client is not available for session check'
      )
      return false
    }

    const sessionSetKey = UserSessionsRedis.sessionSetKey(user)
    logger.debug(
      { userId: user._id, sessionSetKey },
      'Checking user session in Redis'
    )

    // Add timeout to Redis query to prevent hanging
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        logger.warn(
          { userId: user._id, sessionSetKey },
          'Redis session check timeout after 5 seconds'
        )
        resolve([])
      }, 5000)
    })

    const sessionPromise = rclient.smembers(sessionSetKey)
    const sessions = await Promise.race([sessionPromise, timeoutPromise])

    const isOnline = sessions && sessions.length > 0
    logger.debug(
      { userId: user._id, sessionCount: sessions?.length, isOnline },
      'User online status determined'
    )

    return isOnline
  } catch (error) {
    logger.warn(
      { error, userId: user._id, errorMessage: error.message, errorStack: error.stack },
      'Error checking if user is online - returning false'
    )
    return false
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
    
    // Scan for connected user keys that contain this user's ID
    const keys = await _scanRedisKeys('ConnectedUser:*')
    
    if (keys.length === 0) {
      return null
    }
    
    for (const key of keys) {
      try {
        const userData = await realtimeRedis.hgetall(key)
        
        if (userData && userData.user_id === userIdStr) {
          // Extract project_id from key: ConnectedUser:{project_id}:{client_id}
          const match = key.match(/ConnectedUser:\{([^}]+)\}:/)
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
 * @returns {Promise<Array<string>>}
 */
async function _scanRedisKeys(pattern) {
  const keys = []
  const maxKeys = 1000 // Limit to prevent performance issues
  
  try {
    let cursor = '0'
    do {
      const result = await realtimeRedis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100
      )
      cursor = result[0]
      const foundKeys = result[1]
      
      keys.push(...foundKeys)
      
      if (keys.length >= maxKeys) {
        logger.warn(
          { pattern, count: keys.length },
          'Redis scan reached max key limit'
        )
        break
      }
    } while (cursor !== '0')
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

