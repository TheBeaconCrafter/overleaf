import classNames from 'classnames'
import { useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  SLOPTEX_ACTIONS,
  SloptexActionId,
  buildSloptexActionLabels,
} from '../actions'
import OLButton from '@/shared/components/ol/ol-button'
import OLFormControl from '@/shared/components/ol/ol-form-control'

type Props = {
  isOpen: boolean
  actionId: SloptexActionId | null
  status: { defaultModel: string } | null | undefined
  prompt: string
  onPromptChange: (value: string) => void
  onClose: () => void
  onRun: () => void
  result: string | null
  loading: boolean
  error: string | null
  actionOptions: Record<string, any> | null
  setActionOptions: (value: Record<string, any> | null) => void
}

export function SloptexPromptPanel({
  isOpen,
  actionId,
  status,
  prompt,
  onPromptChange,
  onClose,
  onRun,
  result,
  loading,
  error,
  actionOptions,
  setActionOptions,
}: Props) {
  const { t } = useTranslation()
  const labels = useMemo(() => buildSloptexActionLabels(t), [t])

  const handleStyleChange = useCallback(
    (style: string) => {
      setActionOptions({ ...(actionOptions || {}), style })
    },
    [actionOptions, setActionOptions]
  )

  if (!isOpen || !actionId) {
    return null
  }

  return (
    <div
      className={classNames('sloptex-prompt-panel', {
        'sloptex-prompt-panel-open': isOpen,
      })}
    >
      <div className="sloptex-prompt-header">
        <strong>{labels[actionId]}</strong>
        <span className="text-muted">
          {status?.defaultModel && t('sloptex_model_label', { model: status.defaultModel })}
        </span>
      </div>
      {actionId === 'style' && (
        <div className="sloptex-field-row">
          <label htmlFor="sloptex-style-select" className="form-label">
            {t('sloptex_style_label')}
          </label>
          <select
            id="sloptex-style-select"
            className="form-select form-select-sm"
            value={actionOptions?.style || 'scientific'}
            onChange={event => handleStyleChange(event.target.value)}
          >
            <option value="scientific">{t('sloptex_style_scientific')}</option>
            <option value="concise">{t('sloptex_style_concise')}</option>
            <option value="punchy">{t('sloptex_style_punchy')}</option>
          </select>
        </div>
      )}
      {actionId === 'translate' && (
        <div className="sloptex-field-row">
          <label htmlFor="sloptex-language-select" className="form-label">
            {t('sloptex_translate_label')}
          </label>
          <OLFormControl
            id="sloptex-language-select"
            size="sm"
            value={actionOptions?.targetLanguage || 'English'}
            onChange={event =>
              setActionOptions({
                ...(actionOptions || {}),
                targetLanguage: event.target.value,
              })
            }
          />
        </div>
      )}
      <OLFormControl
        as="textarea"
        rows={4}
        value={prompt}
        onChange={event => onPromptChange(event.target.value)}
        placeholder={t('sloptex_prompt_placeholder')}
      />
      {error && <div className="text-danger mt-2">{error}</div>}
      <div className="sloptex-prompt-actions">
        <OLButton variant="secondary" size="sm" onClick={onClose}>
          {t('cancel')}
        </OLButton>
        <OLButton
          variant="primary"
          size="sm"
          onClick={onRun}
          isLoading={loading}
        >
          {t('sloptex_run_action')}
        </OLButton>
      </div>
      {result && (
        <div className="sloptex-result mt-3">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <strong>{t('sloptex_result_title')}</strong>
            <OLButton
              size="sm"
              variant="outline-secondary"
              onClick={() => navigator.clipboard.writeText(result)}
            >
              {t('copy')}
            </OLButton>
          </div>
          <pre>{result}</pre>
        </div>
      )}
    </div>
  )
}

