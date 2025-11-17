import { memo, useCallback, useMemo, useState } from 'react'
import OLButton from '@/shared/components/ol/ol-button'
import OLTooltip from '@/shared/components/ol/ol-tooltip'
import { useTranslation } from 'react-i18next'
import { useSloptex } from '../context/sloptex-context'
import {
  SLOPTEX_ACTIONS,
  SLOPTEX_SECTIONS,
  SloptexActionId,
  buildSloptexActionLabels,
} from '../actions'
import classNames from 'classnames'
import { EditorView } from '@codemirror/view'
import { replaceSelection, getPrimarySelection } from '../utils'
import { SloptexSettingsModal } from './sloptex-settings-modal'
import { SloptexSelectionOverlay } from './sloptex-selection-overlay'
import { SloptexPromptPanel } from './sloptex-prompt-panel'
import { diffLines } from 'diff'
import { SloptexInlineEditState } from '../types'

type Props = {
  isOpen: boolean
  view: EditorView
}

export const SloptexActionBar = memo(function SloptexActionBar({
  isOpen,
  view,
}: Props) {
  const { t } = useTranslation()
  const sloptex = useSloptex()
  const [activeAction, setActiveAction] = useState<SloptexActionId | null>(null)
  const [promptText, setPromptText] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [actionOptions, setActionOptions] = useState<Record<string, any> | null>(
    null
  )
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inlineEdit, setInlineEdit] = useState<SloptexInlineEditState | null>(
    null
  )

  const labels = useMemo(() => buildSloptexActionLabels(t), [t])

  const checkMissingApiKey = useCallback(() => {
    if (!sloptex.status?.hasApiKey) {
      sloptex.openSettings()
      return true
    }
    return false
  }, [sloptex])

  const startAction = useCallback(
    (
      actionId: SloptexActionId,
      options?: Record<string, any>,
      initialOverride?: string
    ) => {
      if (checkMissingApiKey()) {
        return
      }
      const config = SLOPTEX_ACTIONS[actionId]
      const selected = getPrimarySelection(view)
      if (config.requiresSelection && !selected && !initialOverride?.trim()) {
        setError(t('sloptex_select_text'))
        setActiveAction(null)
        return
      }
      const initialText =
        initialOverride ??
        (config.requiresSelection && selected ? selected.text : '')
      setActionOptions(options || null)
      setPromptText(initialText)
      setActiveAction(actionId)
      setResult(null)
      setError(null)
    },
    [checkMissingApiKey, t, view]
  )

  const handleRun = useCallback(async () => {
    if (!activeAction) return
    if (checkMissingApiKey()) return
    const config = SLOPTEX_ACTIONS[activeAction]
    if (config.requiresSelection) {
      const selected = getPrimarySelection(view)
      if (!selected) {
        setError(t('sloptex_select_text'))
        return
      }
    }
    setIsRunning(true)
    setError(null)
    try {
      const payload = {
        text: promptText,
        options: actionOptions || undefined,
      }
      const output = await sloptex.generate(activeAction, payload)
      setResult(output)
      if (config.target === 'replace') {
        replaceSelection(view, output, false)
      } else if (config.target === 'insert') {
        replaceSelection(view, `\n${output}\n`, true)
      }
    } catch (err: any) {
      setError(err?.message || t('sloptex_action_failed'))
    } finally {
      setIsRunning(false)
    }
  }, [
    activeAction,
    actionOptions,
    promptText,
    checkMissingApiKey,
    sloptex,
    t,
    view,
  ])

  const actionSections = useMemo(
    () =>
      SLOPTEX_SECTIONS.map(section =>
        section.map(entry =>
          entry === 'settings'
            ? { id: 'settings', label: t('sloptex_settings_button') }
            : { id: entry, label: labels[entry] }
        )
      ),
    [labels, t]
  )

  const handleInlineAction = useCallback(
    async (actionId: SloptexActionId) => {
      if (checkMissingApiKey()) {
        return
      }
      const config = SLOPTEX_ACTIONS[actionId]
      if (!config.requiresSelection) {
        startAction(actionId)
        return
      }
      const selection = getPrimarySelection(view)
      if (!selection) {
        setError(t('sloptex_select_text'))
        return
      }
      const inlineId = Date.now()
      setInlineEdit({
        id: inlineId,
        actionId,
        from: selection.from,
        to: selection.to,
        original: selection.text,
        status: 'loading',
      })
      try {
        const payload = {
          text: selection.text,
        }
        const output = await sloptex.generate(actionId, payload)
        const diff = diffLines(selection.text, output)
        setInlineEdit(prev =>
          prev && prev.id === inlineId
            ? { ...prev, status: 'ready', result: output, diff }
            : prev
        )
      } catch (err: any) {
        setInlineEdit(prev =>
          prev && prev.id === inlineId
            ? {
                ...prev,
                status: 'error',
                error: err?.message || t('sloptex_action_failed'),
              }
            : prev
        )
      }
    },
    [checkMissingApiKey, sloptex, t, view, startAction]
  )

  const handleInlineAccept = useCallback(() => {
    if (!inlineEdit || inlineEdit.status !== 'ready' || !inlineEdit.result) {
      return
    }
    view.dispatch({
      changes: {
        from: inlineEdit.from,
        to: inlineEdit.to,
        insert: inlineEdit.result,
      },
      selection: {
        anchor: inlineEdit.from,
        head: inlineEdit.from + inlineEdit.result.length,
      },
    })
    setInlineEdit(null)
  }, [inlineEdit, view])

  const handleInlineReject = useCallback(() => {
    setInlineEdit(null)
  }, [])

  if (!sloptex.status?.enabled) {
    return null
  }

  return (
    <>
      {isOpen && (
        <div className="sloptex-toolbar-row" data-testid="sloptex-toolbar-row">
          <div className="sloptex-toolbar-content">
            {actionSections.map((section, index) => (
              <div className="sloptex-action-section" key={`section-${index}`}>
                {section.map(action => {
                  if (action.id === 'settings') {
                    return (
                      <OLTooltip
                        key="settings"
                        id="sloptex-action-settings"
                        description={action.label}
                        overlayProps={{ placement: 'bottom', delay: 0 }}
                      >
                        <OLButton
                          size="sm"
                          variant="outline-secondary"
                          onClick={sloptex.openSettings}
                          aria-label={action.label}
                          className="sloptex-icon-button"
                          leadingIcon="settings"
                        >
                          <span className="sr-only">{action.label}</span>
                        </OLButton>
                      </OLTooltip>
                    )
                  }
                  const actionId = action.id as SloptexActionId
                  return (
                    <OLTooltip
                      key={actionId}
                      id={`sloptex-action-${actionId}`}
                      description={action.label}
                      overlayProps={{ placement: 'bottom', delay: 0 }}
                    >
                      <OLButton
                        size="sm"
                        variant={
                          activeAction === actionId
                            ? 'primary'
                            : 'outline-secondary'
                        }
                        onClick={() => startAction(actionId)}
                        aria-label={action.label}
                        className="sloptex-icon-button"
                        leadingIcon={SLOPTEX_ACTIONS[actionId].icon}
                      >
                        <span className="sr-only">{action.label}</span>
                      </OLButton>
                    </OLTooltip>
                  )
                })}
                {index < actionSections.length - 1 && (
                  <span className="sloptex-divider" aria-hidden>
                    /
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <SloptexPromptPanel
        isOpen={Boolean(isOpen && activeAction)}
        actionId={activeAction}
        status={sloptex.status}
        prompt={promptText}
        onPromptChange={setPromptText}
        onClose={() => {
          setActiveAction(null)
          setPromptText('')
          setResult(null)
          setError(null)
        }}
        onRun={handleRun}
        result={result}
        loading={isRunning}
        error={error}
        actionOptions={actionOptions}
        setActionOptions={setActionOptions}
      />
      <SloptexSelectionOverlay
        visible={isOpen}
        view={view}
        labels={labels}
        inlineEdit={inlineEdit}
        onPromptAction={(actionId, text) => startAction(actionId, undefined, text)}
        onInlineAction={handleInlineAction}
        onInlineAccept={handleInlineAccept}
        onInlineReject={handleInlineReject}
      />
      <SloptexSettingsModal />
    </>
  )
})

