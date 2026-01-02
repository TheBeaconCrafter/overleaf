import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { OLModal, OLModalHeader, OLModalTitle, OLModalBody, OLModalFooter } from './ol/ol-modal'
import OLButton from './ol/ol-button'
import OLFormCheckbox from './ol/ol-form-checkbox'
import type { Announcement } from '@/shared/context/announcement-context'

type AnnouncementModalProps = {
  announcement: Announcement
  onDismiss: (dontShowAgain: boolean) => void
}

function AnnouncementModal({ announcement, onDismiss }: AnnouncementModalProps) {
  const { t } = useTranslation()
  // Pre-check if "don't show again" was already set
  const [dontShowAgain, setDontShowAgain] = useState(announcement._dontShowAgain || false)
  const isDontShowAgainDisabled = announcement._dontShowAgain || false

  useEffect(() => {
    // Update state when announcement changes
    setDontShowAgain(announcement._dontShowAgain || false)
  }, [announcement._dontShowAgain])

  const handleDismiss = () => {
    onDismiss(dontShowAgain)
  }

  const getModalVariant = () => {
    switch (announcement.template) {
      case 'maintenance':
      case 'warning':
        return 'warning'
      case 'info':
        return 'info'
      default:
        return 'primary'
    }
  }

  return (
    <OLModal show onHide={handleDismiss} size="lg">
      <OLModalHeader>
        <OLModalTitle>{announcement.title}</OLModalTitle>
      </OLModalHeader>
      <OLModalBody>
        <div
          style={{ whiteSpace: 'pre-wrap' }}
          dangerouslySetInnerHTML={{ __html: announcement.content }}
        />
        {announcement.maintenanceDate && (
          <div className="mt-3">
            <strong>{t('scheduled_maintenance')}:</strong>{' '}
            {new Date(announcement.maintenanceDate).toLocaleString()}
          </div>
        )}
      </OLModalBody>
      <OLModalFooter>
        <OLFormCheckbox
          checked={dontShowAgain}
          onChange={e => !isDontShowAgainDisabled && setDontShowAgain(e.target.checked)}
          disabled={isDontShowAgainDisabled}
          label={t('dont_show_again')}
        />
        <OLButton variant={getModalVariant()} onClick={handleDismiss}>
          {t('close')}
        </OLButton>
      </OLModalFooter>
    </OLModal>
  )
}

// Re-export from context for backwards compatibility
export { useAnnouncements, type Announcement } from '@/shared/context/announcement-context'

export default AnnouncementModal

