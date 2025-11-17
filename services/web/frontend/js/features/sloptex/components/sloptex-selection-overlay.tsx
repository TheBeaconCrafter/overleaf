import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import MaterialIcon from '@/shared/components/material-icon'
import { EditorView } from '@codemirror/view'
import { SLOPTEX_ACTIONS, SloptexActionId } from '../actions'
import OLButton from '@/shared/components/ol/ol-button'
import classNames from 'classnames'
import OLFormControl from '@/shared/components/ol/ol-form-control'
import { createPortal } from 'react-dom'
import OLTooltip from '@/shared/components/ol/ol-tooltip'
import { useTranslation } from 'react-i18next'
import { SloptexInlineEditState } from '../types'
import OLSpinner from '@/shared/components/ol/ol-spinner'

const INLINE_ACTIONS: SloptexActionId[] = [
  'paraphrase',
  'summarize',
  'explain',
  'split',
  'join',
  'fix_latex',
]

type Props = {
  visible: boolean
  view: EditorView
  labels: Record<SloptexActionId, string>
  inlineEdit: SloptexInlineEditState | null
  onPromptAction: (id: SloptexActionId, text?: string) => void
  onInlineAction: (id: SloptexActionId) => void
  onInlineAccept: () => void
  onInlineReject: () => void
}

export function SloptexSelectionOverlay({
  visible,
  view,
  labels,
  inlineEdit,
  onPromptAction,
  onInlineAction,
  onInlineAccept,
  onInlineReject,
}: Props) {
  const { t } = useTranslation()
  const [position, setPosition] = useState<{ top: number; left: number } | null>(
    null
  )
  const [showPanel, setShowPanel] = useState(false)
  const [askValue, setAskValue] = useState('')

  const updatePosition = useCallback(() => {
    if (!visible) {
      setPosition(null)
      return
    }
    const selection = inlineEdit
      ? { from: inlineEdit.from, to: inlineEdit.to, empty: false }
      : view.state.selection.main
    if (!inlineEdit && selection.empty) {
      setPosition(null)
      setShowPanel(false)
      return
    }
    const coords = view.coordsAtPos(selection.to)
    if (!coords) {
      setPosition(null)
      return
    }
    const hostRect = view.scrollDOM.getBoundingClientRect()
    setPosition({
      top: coords.bottom - hostRect.top + view.scrollDOM.scrollTop,
      left: coords.right - hostRect.left + view.scrollDOM.scrollLeft + 10,
    })
  }, [inlineEdit, view, visible])

  useEffect(() => {
    updatePosition()
    const listener = () => updatePosition()
    const doc = view.dom.ownerDocument
    doc.addEventListener('selectionchange', listener)
    return () => {
      doc.removeEventListener('selectionchange', listener)
    }
  }, [updatePosition, view])

  useEffect(() => {
    if (inlineEdit && visible) {
      setShowPanel(true)
    }
  }, [inlineEdit, visible])

  const bubbleStyle = useMemo(() => {
    if (!position) return undefined
    return {
      top: `${position.top}px`,
      left: `${position.left}px`,
    }
  }, [position])

  const quickActionButtons = useMemo(
    () =>
      INLINE_ACTIONS.map(actionId => (
        <OLTooltip
          key={actionId}
          id={`sloptex-inline-${actionId}`}
          description={labels[actionId]}
          overlayProps={{ placement: 'bottom', delay: 0 }}
        >
          <OLButton
            size="sm"
            variant="outline-secondary"
            aria-label={labels[actionId]}
            className="sloptex-icon-button"
            onClick={() => onInlineAction(actionId)}
            leadingIcon={SLOPTEX_ACTIONS[actionId].icon}
          />
        </OLTooltip>
      )),
    [labels, onInlineAction]
  )

  const diffRows = useMemo(() => {
    if (!inlineEdit || inlineEdit.status !== 'ready' || !inlineEdit.diff) {
      return null
    }
    const rows: ReactNode[] = []
    inlineEdit.diff.forEach((part, index) => {
      const lines = part.value.split('\n')
      lines.forEach((line, lineIndex) => {
        if (line === '' && lineIndex === lines.length - 1) {
          return
        }
        const key = `${index}-${lineIndex}`
        const type = part.added
          ? 'added'
          : part.removed
          ? 'removed'
          : 'context'
        rows.push(
          <div
            key={key}
            className={classNames('sloptex-inline-line', {
              'sloptex-inline-line--added': part.added,
              'sloptex-inline-line--removed': part.removed,
            })}
          >
            <span className="sloptex-inline-line-sign">
              {part.added ? '+' : part.removed ? '-' : ' '}
            </span>
            <span>{line || ' '}</span>
          </div>
        )
      })
    })
    return rows
  }, [inlineEdit])

  const handleSearchSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault()
      const selection = view.state.selection.main
      const fallback = selection.empty
        ? ''
        : view.state.sliceDoc(selection.from, selection.to)
      const value = askValue.trim() || fallback
      if (!value) {
        return
      }
      onPromptAction('assist', value)
      setAskValue('')
      setShowPanel(false)
    },
    [askValue, onPromptAction, view]
  )

  if (!position) {
    return null
  }

  const host = view.scrollDOM
  const bubble = (
    <div
      className={classNames('sloptex-selection-bubble', {
        'sloptex-selection-bubble-open': showPanel,
      })}
      style={bubbleStyle}
    >
      <button
        type="button"
        className="btn btn-primary btn-sm"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setShowPanel(!showPanel)
        }}
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        aria-label={t('sloptex_overlay_toggle')}
      >
        <MaterialIcon type="auto_fix_high" />
      </button>
      {showPanel && (
        <div className="sloptex-selection-panel">
          <form 
            className="sloptex-search-bar" 
            onSubmit={handleSearchSubmit}
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
          >
            <OLFormControl
              size="sm"
              placeholder={t('sloptex_overlay_placeholder')}
              value={askValue}
              onChange={event => setAskValue(event.target.value)}
              onMouseDown={(e) => {
                e.stopPropagation()
              }}
              onClick={(e) => {
                e.stopPropagation()
              }}
            />
            <OLButton
              size="sm"
              variant="primary"
              type="submit"
              aria-label={t('sloptex_overlay_submit')}
              onMouseDown={(e) => {
                e.stopPropagation()
              }}
            >
              <MaterialIcon type="send" />
            </OLButton>
          </form>
          <div 
            className="sloptex-quick-actions"
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
          >
            {quickActionButtons}
          </div>
          {inlineEdit && (
            <div className="sloptex-inline-diff">
              <div className="sloptex-inline-diff-header">
                <strong>{labels[inlineEdit.actionId]}</strong>
                {inlineEdit.status === 'loading' && (
                  <span className="sloptex-inline-diff-status">
                    <OLSpinner size="xs" /> {t('sloptex_inline_loading')}
                  </span>
                )}
              </div>
              <div className="sloptex-inline-diff-body">
                {inlineEdit.status === 'error' && (
                  <div className="text-danger">
                    {inlineEdit.error || t('sloptex_inline_error')}
                  </div>
                )}
                {inlineEdit.status === 'ready' && (
                  <div className="sloptex-inline-diff-lines">{diffRows}</div>
                )}
                {inlineEdit.status === 'loading' && (
                  <div className="text-muted">
                    {t('sloptex_inline_loading')}
                  </div>
                )}
              </div>
              <div className="sloptex-inline-diff-actions">
                <OLButton variant="secondary" size="sm" onClick={onInlineReject}>
                  {t('sloptex_inline_reject')}
                </OLButton>
                <OLButton
                  variant="primary"
                  size="sm"
                  onClick={onInlineAccept}
                  disabled={inlineEdit.status !== 'ready'}
                >
                  {t('sloptex_inline_accept')}
                </OLButton>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )

  return createPortal(bubble, host)
}

