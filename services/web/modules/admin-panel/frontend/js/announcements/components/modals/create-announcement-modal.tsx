import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { OLModal, OLModalHeader, OLModalTitle, OLModalBody, OLModalFooter } from '@/shared/components/ol/ol-modal'
import OLButton from '@/shared/components/ol/ol-button'
import OLForm from '@/shared/components/ol/ol-form'
import OLFormGroup from '@/shared/components/ol/ol-form-group'
import OLFormLabel from '@/shared/components/ol/ol-form-label'
import OLFormControl from '@/shared/components/ol/ol-form-control'
import OLFormCheckbox from '@/shared/components/ol/ol-form-checkbox'
import OLFormSelect from '@/shared/components/ol/ol-form-select'
import { createAnnouncement } from '../../util/api'
import Notification from '@/shared/components/notification'

type CreateAnnouncementModalProps = {
  show: boolean
  onHide: () => void
  onSuccess: () => void
}

const TEMPLATES = [
  { value: 'general', label: 'General' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'info', label: 'Information' },
  { value: 'warning', label: 'Warning' },
]

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

export default function CreateAnnouncementModal({
  show,
  onHide,
  onSuccess,
}: CreateAnnouncementModalProps) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    template: 'general' as const,
    startDate: '',
    endDate: '',
    maintenanceDate: '',
    priority: 'normal' as const,
    active: true,
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await createAnnouncement({
        ...formData,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        maintenanceDate: formData.maintenanceDate || null,
      })
      onSuccess()
    } catch (err: any) {
      setError(err?.data?.error || t('error_creating_announcement'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <OLModal show={show} onHide={onHide} size="lg">
      <OLModalHeader>
        <OLModalTitle>{t('create_announcement')}</OLModalTitle>
      </OLModalHeader>

      <OLModalBody>
        {error && (
          <div className="notification-list mb-3">
            <Notification type="error" content={error} />
          </div>
        )}

        <OLForm onSubmit={handleSubmit}>
          <OLFormGroup controlId="title">
            <OLFormLabel>{t('title')} *</OLFormLabel>
            <OLFormControl
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </OLFormGroup>

          <OLFormGroup controlId="content">
            <OLFormLabel>{t('content')} *</OLFormLabel>
            <OLFormControl
              as="textarea"
              rows={6}
              name="content"
              value={formData.content}
              onChange={handleChange}
              required
            />
          </OLFormGroup>

          <div className="row">
            <div className="col-md-6">
              <OLFormGroup controlId="template">
                <OLFormLabel>{t('template')}</OLFormLabel>
                <OLFormSelect
                  name="template"
                  value={formData.template}
                  onChange={handleChange}
                >
                  {TEMPLATES.map(template => (
                    <option key={template.value} value={template.value}>
                      {t(`template_${template.value}`)}
                    </option>
                  ))}
                </OLFormSelect>
              </OLFormGroup>
            </div>

            <div className="col-md-6">
              <OLFormGroup controlId="priority">
                <OLFormLabel>{t('priority')}</OLFormLabel>
                <OLFormSelect
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                >
                  {PRIORITIES.map(priority => (
                    <option key={priority.value} value={priority.value}>
                      {t(`priority_${priority.value}`)}
                    </option>
                  ))}
                </OLFormSelect>
              </OLFormGroup>
            </div>
          </div>

          <div className="row">
            <div className="col-md-4">
              <OLFormGroup controlId="startDate">
                <OLFormLabel>{t('start_date')}</OLFormLabel>
                <OLFormControl
                  type="datetime-local"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                />
              </OLFormGroup>
            </div>

            <div className="col-md-4">
              <OLFormGroup controlId="endDate">
                <OLFormLabel>{t('end_date')}</OLFormLabel>
                <OLFormControl
                  type="datetime-local"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                />
              </OLFormGroup>
            </div>

            <div className="col-md-4">
              <OLFormGroup controlId="maintenanceDate">
                <OLFormLabel>{t('maintenance_date')}</OLFormLabel>
                <OLFormControl
                  type="datetime-local"
                  name="maintenanceDate"
                  value={formData.maintenanceDate}
                  onChange={handleChange}
                />
              </OLFormGroup>
            </div>
          </div>

          <OLFormGroup controlId="active">
            <OLFormCheckbox
              name="active"
              checked={formData.active}
              onChange={handleChange}
              label={t('active')}
            />
          </OLFormGroup>
        </OLForm>
      </OLModalBody>

      <OLModalFooter>
        <OLButton variant="secondary" onClick={onHide}>
          {t('cancel')}
        </OLButton>
        <OLButton
          variant="primary"
          onClick={handleSubmit}
          disabled={!formData.title || !formData.content || loading}
          isLoading={loading}
        >
          {t('create')}
        </OLButton>
      </OLModalFooter>
    </OLModal>
  )
}

