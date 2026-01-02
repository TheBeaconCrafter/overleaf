import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import type { Announcement } from './announcement-list-root'

type AnnouncementListProps = {
  announcements: Announcement[]
  onEdit: (announcement: Announcement) => void
  onDelete: (id: string) => void
}

function AnnouncementList({
  announcements,
  onEdit,
  onDelete,
}: AnnouncementListProps) {
  const { t } = useTranslation()

  if (announcements.length === 0) {
    return (
      <div className="alert alert-info">
        {t('no_announcements')}
      </div>
    )
  }

  return (
    <div className="table-responsive">
      <table className="table table-striped">
        <thead>
          <tr>
            <th>{t('title')}</th>
            <th>{t('template')}</th>
            <th>{t('priority')}</th>
            <th>{t('start_date')}</th>
            <th>{t('end_date')}</th>
            <th>{t('maintenance_date')}</th>
            <th>{t('status')}</th>
            <th>{t('actions')}</th>
          </tr>
        </thead>
        <tbody>
          {announcements.map(announcement => (
            <tr key={announcement._id}>
              <td>{announcement.title}</td>
              <td>
                <span className="badge bg-secondary">
                  {t(`template_${announcement.template}`)}
                </span>
              </td>
              <td>
                <span className={`badge bg-${
                  announcement.priority === 'urgent' ? 'danger' :
                  announcement.priority === 'high' ? 'warning' :
                  announcement.priority === 'normal' ? 'info' : 'secondary'
                }`}>
                  {t(`priority_${announcement.priority}`)}
                </span>
              </td>
              <td>
                {announcement.startDate
                  ? new Date(announcement.startDate).toLocaleDateString()
                  : '-'}
              </td>
              <td>
                {announcement.endDate
                  ? new Date(announcement.endDate).toLocaleDateString()
                  : '-'}
              </td>
              <td>
                {announcement.maintenanceDate
                  ? new Date(announcement.maintenanceDate).toLocaleDateString()
                  : '-'}
              </td>
              <td>
                {announcement.active ? (
                  <span className="badge bg-success">{t('active')}</span>
                ) : (
                  <span className="badge bg-secondary">{t('inactive')}</span>
                )}
              </td>
              <td>
                <button
                  className="btn btn-sm btn-outline-primary me-2"
                  onClick={() => onEdit(announcement)}
                >
                  {t('edit')}
                </button>
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => onDelete(announcement._id)}
                >
                  {t('delete')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default memo(AnnouncementList)

