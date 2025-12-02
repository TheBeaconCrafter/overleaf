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
    async (
      actionId: SloptexActionId,
      options?: Record<string, any>,
      textOverride?: string
    ) => {
      if (checkMissingApiKey()) {
        return
      }
      const config = SLOPTEX_ACTIONS[actionId]
      const selection = getPrimarySelection(view)
      
      // For actions that require selection, we need selected text
      if (config.requiresSelection && !selection && !textOverride?.trim()) {
        setError(t('sloptex_select_text'))
        return
      }
      
      // For actions that don't require selection, use cursor position or selected text
      const text = textOverride || (selection ? selection.text : '')
      const from = selection?.from ?? view.state.selection.main.head
      const to = selection?.to ?? view.state.selection.main.head
      
      const inlineId = Date.now()
      setInlineEdit({
        id: inlineId,
        actionId,
        from,
        to,
        original: text || '',
        status: 'loading',
      })
      
      try {
        const payload = {
          text: text || '',
          options: options || undefined,
        }
        const output = await sloptex.generate(actionId, payload)
        
        // For insert actions, show diff with empty original
        const originalForDiff = config.target === 'insert' ? '' : text
        const diff = diffLines(originalForDiff, output)
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
    [checkMissingApiKey, sloptex, t, view]
  )

  const handleInlineAccept = useCallback(() => {
    if (!inlineEdit || inlineEdit.status !== 'ready' || !inlineEdit.result) {
      return
    }
    const config = SLOPTEX_ACTIONS[inlineEdit.actionId]
    const insertText = config.target === 'insert' 
      ? `\n${inlineEdit.result}\n`
      : inlineEdit.result
    const insertAt = config.target === 'insert' 
      ? inlineEdit.from
      : inlineEdit.from
    
    view.dispatch({
      changes: {
        from: config.target === 'insert' ? insertAt : inlineEdit.from,
        to: config.target === 'insert' ? insertAt : inlineEdit.to,
        insert: insertText,
      },
      selection: {
        anchor: insertAt + insertText.length,
        head: insertAt + insertText.length,
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
                        variant="outline-secondary"
                        onClick={() => handleInlineAction(actionId)}
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
      <SloptexSelectionOverlay
        visible={isOpen}
        view={view}
        labels={labels}
        inlineEdit={inlineEdit}
        onPromptAction={(actionId, text) => handleInlineAction(actionId, undefined, text)}
        onInlineAction={handleInlineAction}
        onInlineAccept={handleInlineAccept}
        onInlineReject={handleInlineReject}
      />
      <SloptexSettingsModal />
    </>
  )
})

