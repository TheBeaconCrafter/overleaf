import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import MaterialIcon from './material-icon'
import OLTooltip from './ol/ol-tooltip'
import { useAnnouncements } from '@/shared/context/announcement-context'

function AnnouncementWarningIcon() {
  const { t } = useTranslation()
  const { hasActiveAnnouncements, announcements, openModal } = useAnnouncements()

  console.log('[AnnouncementWarningIcon] hasActiveAnnouncements:', hasActiveAnnouncements, 'announcements:', announcements)

  if (!hasActiveAnnouncements) {
    return null
  }

  const handleClick = () => {
    openModal()
  }

  const buttonContent = (
    <button
      className="btn btn-ghost ide-redesign-toolbar-button-subdued ide-redesign-toolbar-button-icon announcement-warning-btn"
      onClick={handleClick}
      aria-label={t('view_announcements')}
      style={{ 
        color: '#0d6efd',
        marginRight: '0.5rem',
        padding: '0.375rem 0.5rem',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
        minWidth: '2rem',
        height: '2rem'
      }}
      type="button"
    >
      <MaterialIcon
        type="warning"
        accessibilityLabel={t('view_announcements')}
        className="icon-small"
        style={{ color: '#0d6efd' }}
      />
    </button>
  )

  return (
    <OLTooltip
      id="announcement-warning"
      description={t('view_announcements')}
      overlayProps={{ placement: 'bottom' }}
    >
      {buttonContent}
    </OLTooltip>
  )
}

export default memo(AnnouncementWarningIcon)

