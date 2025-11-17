import {
  OLModal,
  OLModalBody,
  OLModalFooter,
  OLModalHeader,
  OLModalTitle,
} from '@/shared/components/ol/ol-modal'
import OLButton from '@/shared/components/ol/ol-button'
import OLFormControl from '@/shared/components/ol/ol-form-control'
import { useCallback, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSloptex } from '../context/sloptex-context'

export function SloptexSettingsModal() {
  const { t } = useTranslation()
  const { settingsOpen, closeSettings, saveKey, removeKey, saving, status } =
    useSloptex()
  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (settingsOpen) {
      setApiKey('')
      setError(null)
    }
  }, [settingsOpen])

  const handleSave = useCallback(async () => {
    try {
      if (!apiKey.trim()) {
        setError(t('sloptex_enter_valid_key'))
        return
      }
      setError(null)
      await saveKey(apiKey.trim())
      closeSettings()
    } catch (err: any) {
      setError(err?.message || t('sloptex_save_failed'))
    }
  }, [apiKey, closeSettings, saveKey, t])

  const handleRemove = useCallback(async () => {
    try {
      setError(null)
      await removeKey()
      closeSettings()
    } catch (err: any) {
      setError(err?.message || t('sloptex_remove_failed'))
    }
  }, [closeSettings, removeKey, t])

  return (
    <OLModal show={settingsOpen} onHide={closeSettings}>
      <OLModalHeader closeButton>
        <OLModalTitle>{t('sloptex_settings_title')}</OLModalTitle>
      </OLModalHeader>
      <OLModalBody>
        <p className="text-muted">{t('sloptex_settings_description')}</p>
        <label htmlFor="sloptex-api-key" className="form-label">
          {t('sloptex_api_key_label')}
        </label>
        <OLFormControl
          id="sloptex-api-key"
          value={apiKey}
          onChange={event => setApiKey(event.target.value)}
          placeholder="AIza..."
          type="password"
        />
        {error && <div className="text-danger mt-2">{error}</div>}
        {status?.hasApiKey && (
          <div className="mt-3">
            <strong>{t('sloptex_key_on_file')}</strong>
            <p className="text-muted">{t('sloptex_key_on_file_hint')}</p>
          </div>
        )}
      </OLModalBody>
      <OLModalFooter>
        <OLButton variant="secondary" onClick={closeSettings}>
          {t('cancel')}
        </OLButton>
        {status?.hasApiKey && (
          <OLButton
            variant="outline-danger"
            onClick={handleRemove}
            isLoading={saving}
          >
            {t('sloptex_remove_key')}
          </OLButton>
        )}
        <OLButton variant="primary" onClick={handleSave} isLoading={saving}>
          {t('sloptex_save_key')}
        </OLButton>
      </OLModalFooter>
    </OLModal>
  )
}

