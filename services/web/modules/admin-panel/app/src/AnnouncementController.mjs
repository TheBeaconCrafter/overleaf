import logger from '@overleaf/logger'
import SessionManager from '../../../../app/src/Features/Authentication/SessionManager.mjs'
import { db } from '../../../../app/src/infrastructure/mongodb.mjs'
import { ObjectId } from '../../../../app/src/infrastructure/mongodb.mjs'
import HttpErrorHandler from '../../../../app/src/Features/Errors/HttpErrorHandler.mjs'
import { expressify } from '@overleaf/promise-utils'
import Path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = Path.dirname(fileURLToPath(import.meta.url))

async function announcementListPage(req, res, next) {
  try {
    logger.debug({ path: req.path }, 'Announcement list page requested')
    
    const userId = SessionManager.getLoggedInUserId(req.session)
    if (!userId) {
      logger.debug({}, 'User not logged in, redirecting to login')
      return res.redirect('/login')
    }

    const viewPath = Path.resolve(__dirname, '../views/announcement-list-react')
    logger.debug({ viewPath, userId }, 'Rendering announcement list page')

    res.render(viewPath, {
      title: 'Announcements',
    })
  } catch (err) {
    logger.err({ err, path: req.path, userId: SessionManager.getLoggedInUserId(req.session) }, 'Error rendering announcement list page')
    HttpErrorHandler.logError(err, req, res, next)
    next(err)
  }
}

async function getAnnouncements(req, res, next) {
  try {
    const announcements = await db.announcements
      .find({})
      .sort({ createdAt: -1 })
      .toArray()

    res.json({ announcements })
  } catch (err) {
    logger.err({ err }, 'Error fetching announcements')
    HttpErrorHandler.logError(err, req, res, next)
    next(err)
  }
}

async function getAnnouncement(req, res, next) {
  try {
    const { announcementId } = req.params
    if (!ObjectId.isValid(announcementId)) {
      return res.status(400).json({ error: 'Invalid announcement ID' })
    }

    const announcement = await db.announcements.findOne({
      _id: new ObjectId(announcementId),
    })

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' })
    }

    res.json({ announcement })
  } catch (err) {
    logger.err({ err }, 'Error fetching announcement')
    HttpErrorHandler.logError(err, req, res, next)
    next(err)
  }
}

async function createAnnouncement(req, res, next) {
  try {
    const {
      title,
      content,
      template,
      startDate,
      endDate,
      maintenanceDate,
      priority,
      active,
    } = req.body

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' })
    }

    const userId = SessionManager.getLoggedInUserId(req.session)
    const now = new Date()

    const announcement = {
      title,
      content,
      template: template || 'general',
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      maintenanceDate: maintenanceDate ? new Date(maintenanceDate) : null,
      priority: priority || 'normal',
      active: active !== undefined ? active : true,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
    }

    const result = await db.announcements.insertOne(announcement)
    announcement._id = result.insertedId

    logger.info(
      { announcementId: result.insertedId, userId },
      'Announcement created'
    )

    res.json({ announcement })
  } catch (err) {
    logger.err({ err }, 'Error creating announcement')
    HttpErrorHandler.logError(err, req, res, next)
    next(err)
  }
}

async function updateAnnouncement(req, res, next) {
  try {
    const { announcementId } = req.params
    if (!ObjectId.isValid(announcementId)) {
      return res.status(400).json({ error: 'Invalid announcement ID' })
    }

    const {
      title,
      content,
      template,
      startDate,
      endDate,
      maintenanceDate,
      priority,
      active,
    } = req.body

    const update = {
      updatedAt: new Date(),
    }

    if (title !== undefined) update.title = title
    if (content !== undefined) update.content = content
    if (template !== undefined) update.template = template
    if (startDate !== undefined) update.startDate = startDate ? new Date(startDate) : null
    if (endDate !== undefined) update.endDate = endDate ? new Date(endDate) : null
    if (maintenanceDate !== undefined) update.maintenanceDate = maintenanceDate ? new Date(maintenanceDate) : null
    if (priority !== undefined) update.priority = priority
    if (active !== undefined) update.active = active

    const result = await db.announcements.updateOne(
      { _id: new ObjectId(announcementId) },
      { $set: update }
    )

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Announcement not found' })
    }

    const announcement = await db.announcements.findOne({
      _id: new ObjectId(announcementId),
    })

    logger.info({ announcementId, userId: SessionManager.getLoggedInUserId(req.session) }, 'Announcement updated')

    res.json({ announcement })
  } catch (err) {
    logger.err({ err }, 'Error updating announcement')
    HttpErrorHandler.logError(err, req, res, next)
    next(err)
  }
}

async function deleteAnnouncement(req, res, next) {
  try {
    const { announcementId } = req.params
    if (!ObjectId.isValid(announcementId)) {
      return res.status(400).json({ error: 'Invalid announcement ID' })
    }

    const result = await db.announcements.deleteOne({
      _id: new ObjectId(announcementId),
    })

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Announcement not found' })
    }

    // Also delete all dismissals for this announcement
    await db.announcementDismissals.deleteMany({
      announcementId: new ObjectId(announcementId),
    })

    logger.info({ announcementId, userId: SessionManager.getLoggedInUserId(req.session) }, 'Announcement deleted')

    res.json({ success: true })
  } catch (err) {
    logger.err({ err }, 'Error deleting announcement')
    HttpErrorHandler.logError(err, req, res, next)
    next(err)
  }
}

async function getActiveAnnouncements(req, res, next) {
  try {
    const userId = SessionManager.getLoggedInUserId(req.session)
    if (!userId) {
      return res.json({ announcements: [] })
    }

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    logger.debug({ 
      now: now.toISOString(), 
      todayStart: todayStart.toISOString(), 
      todayEnd: todayEnd.toISOString(), 
      userId 
    }, 'Checking for active announcements')

    // Find active announcements that are within their date range
    const activeAnnouncements = await db.announcements
      .find({
        active: true,
        $and: [
          {
            $or: [
              { startDate: null },
              { startDate: { $lte: now } },
            ],
          },
          {
            $or: [
              { endDate: null },
              { endDate: { $gte: todayStart } },
            ],
          },
        ],
      })
      .sort({ priority: 1, createdAt: -1 })
      .toArray()

    logger.debug({ 
      count: activeAnnouncements.length, 
      announcementIds: activeAnnouncements.map(a => a._id),
      announcements: activeAnnouncements.map(a => ({
        id: a._id,
        title: a.title,
        startDate: a.startDate?.toISOString(),
        endDate: a.endDate?.toISOString(),
        maintenanceDate: a.maintenanceDate?.toISOString(),
        active: a.active
      }))
    }, 'Found active announcements')

    // Get user's dismissals
    const dismissals = await db.announcementDismissals
      .find({ userId: new ObjectId(userId) })
      .toArray()

    const dismissalMap = new Map()
    dismissals.forEach(d => {
      dismissalMap.set(d.announcementId.toString(), d)
    })

    // Filter announcements based on dismissal rules
    // Always include active announcements, but mark if they should auto-show
    const visibleAnnouncements = []
    for (const announcement of activeAnnouncements) {
      const dismissal = dismissalMap.get(announcement._id.toString())
      
      // Create announcement object with dismissal info
      const announcementWithDismissal = {
        ...announcement,
        _dismissed: !!dismissal,
        _dontShowAgain: dismissal?.dontShowAgain || false,
        _shouldAutoShow: true, // Default to true
      }
      
      if (!dismissal) {
        // Not dismissed, show it and auto-show
        visibleAnnouncements.push(announcementWithDismissal)
        continue
      }

      // Check if maintenance date is today and user hasn't seen it today
      if (announcement.maintenanceDate) {
        const maintenanceDate = new Date(announcement.maintenanceDate)
        const maintenanceDay = new Date(
          maintenanceDate.getFullYear(),
          maintenanceDate.getMonth(),
          maintenanceDate.getDate()
        )

        if (maintenanceDay.getTime() === todayStart.getTime()) {
          // It's the maintenance day, check if user has seen it today
          const dismissalDate = new Date(dismissal.dismissedAt)
          const dismissalDay = new Date(
            dismissalDate.getFullYear(),
            dismissalDate.getMonth(),
            dismissalDate.getDate()
          )

          if (dismissalDay.getTime() !== todayStart.getTime()) {
            // User dismissed it before today, show it again on maintenance day
            announcementWithDismissal._shouldAutoShow = true
            visibleAnnouncements.push(announcementWithDismissal)
            continue
          }
        }
      }

      // Check if "don't show again" was checked
      if (dismissal.dontShowAgain) {
        // Still include it in the list (for the icon), but don't auto-show
        announcementWithDismissal._shouldAutoShow = false
        
        // Check if there's a maintenance date and it's today
        if (announcement.maintenanceDate) {
          const maintenanceDate = new Date(announcement.maintenanceDate)
          const maintenanceDay = new Date(
            maintenanceDate.getFullYear(),
            maintenanceDate.getMonth(),
            maintenanceDate.getDate()
          )

          if (maintenanceDay.getTime() === todayStart.getTime()) {
            // Show on maintenance day even if "don't show again" was checked
            const dismissalDate = new Date(dismissal.dismissedAt)
            const dismissalDay = new Date(
              dismissalDate.getFullYear(),
              dismissalDate.getMonth(),
              dismissalDate.getDate()
            )

            if (dismissalDay.getTime() !== todayStart.getTime()) {
              // Auto-show on maintenance day
              announcementWithDismissal._shouldAutoShow = true
            }
          }
        }
        
        // Always include it (for the icon), even if don't show again
        visibleAnnouncements.push(announcementWithDismissal)
        continue
      }

      // User dismissed but didn't check "don't show again", so show it again
      announcementWithDismissal._shouldAutoShow = true
      visibleAnnouncements.push(announcementWithDismissal)
    }

    logger.debug({ visibleCount: visibleAnnouncements.length, visibleIds: visibleAnnouncements.map(a => a._id) }, 'Visible announcements after filtering dismissals')

    res.json({ announcements: visibleAnnouncements })
  } catch (err) {
    logger.err({ err }, 'Error fetching active announcements')
    HttpErrorHandler.logError(err, req, res, next)
    next(err)
  }
}

async function dismissAnnouncement(req, res, next) {
  try {
    const userId = SessionManager.getLoggedInUserId(req.session)
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const { announcementId } = req.params
    const { dontShowAgain } = req.body

    if (!ObjectId.isValid(announcementId)) {
      return res.status(400).json({ error: 'Invalid announcement ID' })
    }

    const announcement = await db.announcements.findOne({
      _id: new ObjectId(announcementId),
    })

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' })
    }

    // Upsert dismissal
    await db.announcementDismissals.updateOne(
      {
        userId: new ObjectId(userId),
        announcementId: new ObjectId(announcementId),
      },
      {
        $set: {
          userId: new ObjectId(userId),
          announcementId: new ObjectId(announcementId),
          dontShowAgain: dontShowAgain || false,
          dismissedAt: new Date(),
        },
      },
      { upsert: true }
    )

    res.json({ success: true })
  } catch (err) {
    logger.err({ err }, 'Error dismissing announcement')
    HttpErrorHandler.logError(err, req, res, next)
    next(err)
  }
}

export default {
  announcementListPage: expressify(announcementListPage),
  getAnnouncements: expressify(getAnnouncements),
  getAnnouncement: expressify(getAnnouncement),
  createAnnouncement: expressify(createAnnouncement),
  updateAnnouncement: expressify(updateAnnouncement),
  deleteAnnouncement: expressify(deleteAnnouncement),
  getActiveAnnouncements: expressify(getActiveAnnouncements),
  dismissAnnouncement: expressify(dismissAnnouncement),
}

