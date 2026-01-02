import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import useWaitForI18n from '@/shared/hooks/use-wait-for-i18n'
import LoadingBranded from '@/shared/components/loading-branded'
import AnnouncementList from './announcement-list'
import CreateAnnouncementModal from './modals/create-announcement-modal'
import EditAnnouncementModal from './modals/edit-announcement-modal'
import { getAnnouncements, deleteAnnouncement } from '../util/api'

export type Announcement = {
  _id: string
  title: string
  content: string
  template: 'general' | 'maintenance' | 'info' | 'warning'
  startDate: string | null
  endDate: string | null
  maintenanceDate: string | null
  priority: 'low' | 'normal' | 'high' | 'urgent'
  active: boolean
  createdAt: string
  updatedAt: string
  createdBy: string
}

export default function AnnouncementListRoot() {
  const { isReady } = useWaitForI18n()
  const { t } = useTranslation()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)

  const loadAnnouncements = async () => {
    try {
      setLoading(true)
      const data = await getAnnouncements()
      setAnnouncements(data.announcements || [])
    } catch (error) {
      console.error('Error loading announcements:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isReady) {
      loadAnnouncements()
    }
  }, [isReady])

  if (!isReady) {
    return <LoadingBranded label="Loading..." />
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('delete_announcement_confirm'))) {
      return
    }

    try {
      await deleteAnnouncement(id)
      await loadAnnouncements()
    } catch (error) {
      console.error('Error deleting announcement:', error)
      alert(t('error_deleting_announcement'))
    }
  }

  const handleCreateSuccess = () => {
    setShowCreateModal(false)
    loadAnnouncements()
  }

  const handleEditSuccess = () => {
    setEditingAnnouncement(null)
    loadAnnouncements()
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>{t('announcements')}</h1>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          {t('create_announcement')}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">{t('loading')}</span>
          </div>
        </div>
      ) : (
        <AnnouncementList
          announcements={announcements}
          onEdit={setEditingAnnouncement}
          onDelete={handleDelete}
        />
      )}

      {showCreateModal && (
        <CreateAnnouncementModal
          show={showCreateModal}
          onHide={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {editingAnnouncement && (
        <EditAnnouncementModal
          show={!!editingAnnouncement}
          announcement={editingAnnouncement}
          onHide={() => setEditingAnnouncement(null)}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  )
}

