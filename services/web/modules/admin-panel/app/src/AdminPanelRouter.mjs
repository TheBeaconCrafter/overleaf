import logger from '@overleaf/logger'
import UserListController from './UserListController.mjs'
import AnnouncementController from './AnnouncementController.mjs'
import AuthorizationMiddleware from '../../../../app/src/Features/Authorization/AuthorizationMiddleware.mjs'

export default {
  apply(webRouter) {
    logger.debug({}, 'Init AdminPanel router')

    webRouter.get('/admin/user',
      AuthorizationMiddleware.ensureUserIsSiteAdmin,
      UserListController.userListPage
    )
    webRouter.post(
      '/admin/register',
      AuthorizationMiddleware.ensureUserIsSiteAdmin,
      UserListController.registerNewUser
    )
    webRouter.post('/api/user',
      AuthorizationMiddleware.ensureUserIsSiteAdmin,
      UserListController.getUsersJson
    )
    webRouter.post('/admin/user/:userId/delete',
      AuthorizationMiddleware.ensureUserIsSiteAdmin,
      UserListController.deleteNormalUser
    )
    webRouter.delete('/admin/user/:userId',
      AuthorizationMiddleware.ensureUserIsSiteAdmin,
      UserListController.purgeDeletedUser
    )
    webRouter.post('/admin/user/:userId/restore',
      AuthorizationMiddleware.ensureUserIsSiteAdmin,
      UserListController.restoreDeletedUser
    )
    webRouter.post('/admin/user/:userId/flag',
      AuthorizationMiddleware.ensureUserIsSiteAdmin,
      UserListController.flagUser
    )

    // Announcement routes
    webRouter.get('/admin/announcements',
      AuthorizationMiddleware.ensureUserIsSiteAdmin,
      AnnouncementController.announcementListPage
    )
    
    // Public routes for users (must be before parameterized routes)
    webRouter.get('/api/announcements/active',
      AnnouncementController.getActiveAnnouncements
    )
    webRouter.post('/api/announcements/:announcementId/dismiss',
      AnnouncementController.dismissAnnouncement
    )
    
    // Admin routes (parameterized routes must come after specific routes)
    webRouter.get('/api/announcements',
      AuthorizationMiddleware.ensureUserIsSiteAdmin,
      AnnouncementController.getAnnouncements
    )
    webRouter.get('/api/announcements/:announcementId',
      AuthorizationMiddleware.ensureUserIsSiteAdmin,
      AnnouncementController.getAnnouncement
    )
    webRouter.post('/api/announcements',
      AuthorizationMiddleware.ensureUserIsSiteAdmin,
      AnnouncementController.createAnnouncement
    )
    webRouter.put('/api/announcements/:announcementId',
      AuthorizationMiddleware.ensureUserIsSiteAdmin,
      AnnouncementController.updateAnnouncement
    )
    webRouter.delete('/api/announcements/:announcementId',
      AuthorizationMiddleware.ensureUserIsSiteAdmin,
      AnnouncementController.deleteAnnouncement
    )

  },
}
