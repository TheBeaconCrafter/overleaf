import logger from '@overleaf/logger'
import http from 'node:http'
import https from 'node:https'
import Settings from '@overleaf/settings'
import TpdsUpdateSender from '../ThirdPartyDataStore/TpdsUpdateSender.mjs'
import TpdsProjectFlusher from '../ThirdPartyDataStore/TpdsProjectFlusher.mjs'
import EditorRealTimeController from '../Editor/EditorRealTimeController.mjs'
import SystemMessageManager from '../SystemMessages/SystemMessageManager.mjs'
import ActiveUsersManager from './ActiveUsersManager.mjs'
import UserDeleter from '../User/UserDeleter.mjs'
import UserUpdater from '../User/UserUpdater.mjs'
import UserGetter from '../User/UserGetter.mjs'

const AdminController = {
  _sendDisconnectAllUsersMessage: delay => {
    return EditorRealTimeController.emitToAll(
      'forceDisconnect',
      'Sorry, we are performing a quick update to the editor and need to close it down. Please refresh the page to continue.',
      delay
    )
  },
  index: (req, res, next) => {
    let url
    const openSockets = {}
    for (url in http.globalAgent.sockets) {
      openSockets[`http://${url}`] = http.globalAgent.sockets[url].map(
        socket => socket._httpMessage.path
      )
    }

    for (url in https.globalAgent.sockets) {
      openSockets[`https://${url}`] = https.globalAgent.sockets[url].map(
        socket => socket._httpMessage.path
      )
    }

    SystemMessageManager.getMessagesFromDB(function (error, systemMessages) {
      if (error) {
        return next(error)
      }
      res.render('admin/index', {
        title: 'System Admin',
        openSockets,
        systemMessages,
      })
    })
  },

  disconnectAllUsers: (req, res) => {
    logger.warn('disconecting everyone')
    const delay = (req.query && req.query.delay) > 0 ? req.query.delay : 10
    AdminController._sendDisconnectAllUsersMessage(delay)
    res.redirect('/admin#open-close-editor')
  },

  openEditor(req, res) {
    logger.warn('opening editor')
    Settings.editorIsOpen = true
    res.redirect('/admin#open-close-editor')
  },

  closeEditor(req, res) {
    logger.warn('closing editor')
    Settings.editorIsOpen = req.body.isOpen
    res.redirect('/admin#open-close-editor')
  },

  flushProjectToTpds(req, res, next) {
    TpdsProjectFlusher.flushProjectToTpds(req.body.project_id, error => {
      if (error) {
        return next(error)
      }
      res.sendStatus(200)
    })
  },

  pollDropboxForUser(req, res) {
    const { user_id: userId } = req.body
    TpdsUpdateSender.pollDropboxForUser(userId, () => res.sendStatus(200))
  },

  createMessage(req, res, next) {
    SystemMessageManager.createMessage(req.body.content, function (error) {
      if (error) {
        return next(error)
      }
      res.redirect('/admin#system-messages')
    })
  },

  clearMessages(req, res, next) {
    SystemMessageManager.clearMessages(function (error) {
      if (error) {
        return next(error)
      }
      res.redirect('/admin#system-messages')
    })
  },

  about(req, res) {
    // TODO: Get version from package.json, or maybe use git commit hash?

    let version = 'Unknown'
    try {
      version = process.env.OVERLEAF_VERSION || Settings.version || 'Community Edition'
    } catch (error) {
      logger.error({ error }, 'Error getting version information')
    }

    res.render('admin/about', {
      title: 'About',
      version,
      nodeVersion: process.version,
    })
  },

  async activeUsers(req, res, next) {
    try {
      const { users, onlineCount} = await ActiveUsersManager.getAllUsersWithStatus()
      res.render('admin/active-users', {
        title: 'Active Users',
        users,
        onlineCount,
      })
    } catch (error) {
      logger.error({ error }, 'Error loading active users page')
      next(error)
    }
  },

  async sendPasswordReset(req, res, next) {
    const userId = req.params.userId
    try {
      const user = await UserGetter.promises.getUser(userId, { email: 1 })
      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }
      
      const OneTimeTokenHandler = await import('../Security/OneTimeTokenHandler.js').then(m => m.default)
      const data = { user_id: user._id.toString(), email: user.email }
      const token = await OneTimeTokenHandler.promises.getNewToken('password', data)
      
      const resetUrl = `${Settings.siteUrl}/user/password/set?passwordResetToken=${token}&email=${encodeURIComponent(user.email)}`
      
      logger.info({ userId, adminId: req.session?.user?._id }, 'Admin generated password reset link')
      
      res.json({ 
        success: true, 
        message: 'Password reset link generated',
        resetUrl: resetUrl
      })
    } catch (error) {
      logger.error({ error, userId }, 'Error generating password reset link')
      res.status(500).json({ error: 'Failed to generate password reset link' })
    }
  },

  async deleteUserByAdmin(req, res, next) {
    const userId = req.params.userId
    try {
      const adminUser = await UserGetter.promises.getUser(req.session.user._id)
      
      await UserDeleter.promises.deleteUser(userId, {
        deleterUser: adminUser,
        ipAddress: req.ip,
        skipEmail: false,
        force: false,
      })
      
      logger.warn({ userId, adminId: adminUser._id }, 'Admin deleted user')
      
      res.json({ success: true, message: 'User deleted successfully' })
    } catch (error) {
      logger.error({ error, userId }, 'Error deleting user')
      res.status(500).json({ error: 'Failed to delete user: ' + error.message })
    }
  },

  async changeUserEmail(req, res, next) {
    const userId = req.params.userId
    const { newEmail } = req.body
    
    if (!newEmail || !newEmail.includes('@')) {
      return res.status(400).json({ error: 'Invalid email address' })
    }
    
    try {
      const adminUser = await UserGetter.promises.getUser(req.session.user._id)
      
      const existingUser = await UserGetter.promises.getUserByAnyEmail(newEmail)
      if (existingUser && existingUser._id.toString() !== userId) {
        return res.status(400).json({ error: 'Email already in use' })
      }
      
      await UserUpdater.promises.changeEmailAddress(userId, newEmail)
      
      logger.warn(
        { userId, newEmail, adminId: adminUser._id },
        'Admin changed user email'
      )
      
      res.json({ success: true, message: 'Email changed successfully' })
    } catch (error) {
      logger.error({ error, userId, newEmail }, 'Error changing user email')
      res.status(500).json({ error: 'Failed to change email: ' + error.message })
    }
  },
}

export default AdminController
