import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
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

const ACTIONS_WITH_SUBMENUS: SloptexActionId[] = ['translate', 'style']

const TRANSLATE_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ru', name: 'Russian' },
]

type SubmenuState = {
  actionId: SloptexActionId
  open: boolean
  focusedIndex: number
}

type Props = {
  visible: boolean
  view: EditorView
  labels: Record<SloptexActionId, string>
  inlineEdit: SloptexInlineEditState | null
  onPromptAction: (id: SloptexActionId, text?: string) => void
  onInlineAction: (id: SloptexActionId, options?: Record<string, any>) => void
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
  const [focusedIndex, setFocusedIndex] = useState<number>(-1)
  const [submenuState, setSubmenuState] = useState<SubmenuState | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    if (showPanel && inputRef.current && !submenuState) {
      inputRef.current.focus()
    }
  }, [showPanel, submenuState])

  const bubbleStyle = useMemo(() => {
    if (!position) return undefined
    return {
      top: `${position.top}px`,
      left: `${position.left}px`,
    }
  }, [position])

  const handleActionClick = useCallback(
    (actionId: SloptexActionId) => {
      if (ACTIONS_WITH_SUBMENUS.includes(actionId)) {
        setSubmenuState({ actionId, open: true, focusedIndex: 0 })
        setFocusedIndex(-1)
        return
      }
      onInlineAction(actionId)
      setShowPanel(false)
      setFocusedIndex(-1)
      setSubmenuState(null)
    },
    [onInlineAction]
  )

  const handleSubmenuAction = useCallback(
    (actionId: SloptexActionId, option?: string) => {
      const options: Record<string, any> = {}
      if (actionId === 'translate' && option) {
        options.language = option
      } else if (actionId === 'style' && option) {
        options.style = option
      }
      onInlineAction(actionId, options)
      setSubmenuState(null)
      setShowPanel(false)
      setFocusedIndex(-1)
    },
    [onInlineAction]
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (submenuState) {
        // Handle submenu navigation
        const items =
          submenuState.actionId === 'translate'
            ? TRANSLATE_LANGUAGES
            : ['scientific', 'concise', 'punchy']
        const maxIndex = items.length - 1

        if (event.key === 'Escape' || event.key === 'ArrowLeft') {
          event.preventDefault()
          event.stopPropagation()
          setSubmenuState(null)
          setFocusedIndex(INLINE_ACTIONS.length + ACTIONS_WITH_SUBMENUS.indexOf(submenuState.actionId))
          return
        }

        if (event.key === 'ArrowDown') {
          event.preventDefault()
          event.stopPropagation()
          const newIndex =
            submenuState.focusedIndex < maxIndex
              ? submenuState.focusedIndex + 1
              : 0
          setSubmenuState(prev =>
            prev ? { ...prev, focusedIndex: newIndex } : null
          )
          // Focus the button
          const submenuItems = menuRef.current?.querySelectorAll(
            '.sloptex-submenu .sloptex-menu-item:not(.sloptex-menu-item--back)'
          )
          if (submenuItems && submenuItems[newIndex]) {
            ;(submenuItems[newIndex] as HTMLElement).focus()
          }
          return
        }

        if (event.key === 'ArrowUp') {
          event.preventDefault()
          event.stopPropagation()
          const newIndex =
            submenuState.focusedIndex > 0
              ? submenuState.focusedIndex - 1
              : maxIndex
          setSubmenuState(prev =>
            prev ? { ...prev, focusedIndex: newIndex } : null
          )
          // Focus the button
          const submenuItems = menuRef.current?.querySelectorAll(
            '.sloptex-submenu .sloptex-menu-item:not(.sloptex-menu-item--back)'
          )
          if (submenuItems && submenuItems[newIndex]) {
            ;(submenuItems[newIndex] as HTMLElement).focus()
          }
          return
        }

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          event.stopPropagation()
          const option =
            submenuState.actionId === 'translate'
              ? TRANSLATE_LANGUAGES[submenuState.focusedIndex]?.code
              : items[submenuState.focusedIndex]
          if (option) {
            handleSubmenuAction(submenuState.actionId, option)
          }
          return
        }
        return
      }

      // Handle main menu navigation
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        setShowPanel(false)
        setFocusedIndex(-1)
        setSubmenuState(null)
        view.focus()
        return
      }

      const totalActions = INLINE_ACTIONS.length + ACTIONS_WITH_SUBMENUS.length

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        event.stopPropagation()
        const newIndex = focusedIndex < totalActions - 1 ? focusedIndex + 1 : 0
        setFocusedIndex(newIndex)
        // Focus the button
        const menuItems = menuRef.current?.querySelectorAll('.sloptex-menu-item')
        if (menuItems && menuItems[newIndex]) {
          ;(menuItems[newIndex] as HTMLElement).focus()
        }
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        event.stopPropagation()
        const newIndex = focusedIndex > 0 ? focusedIndex - 1 : totalActions - 1
        setFocusedIndex(newIndex)
        // Focus the button
        const menuItems = menuRef.current?.querySelectorAll('.sloptex-menu-item')
        if (menuItems && menuItems[newIndex]) {
          ;(menuItems[newIndex] as HTMLElement).focus()
        }
        return
      }

      if (event.key === 'Enter' && focusedIndex >= 0) {
        event.preventDefault()
        event.stopPropagation()
        const actionId =
          focusedIndex < INLINE_ACTIONS.length
            ? INLINE_ACTIONS[focusedIndex]
            : ACTIONS_WITH_SUBMENUS[
                focusedIndex - INLINE_ACTIONS.length
              ]
        handleActionClick(actionId)
        return
      }

      if (event.key === 'ArrowRight' && focusedIndex >= 0) {
        const actionId =
          focusedIndex < INLINE_ACTIONS.length
            ? INLINE_ACTIONS[focusedIndex]
            : ACTIONS_WITH_SUBMENUS[focusedIndex - INLINE_ACTIONS.length]
        if (ACTIONS_WITH_SUBMENUS.includes(actionId)) {
          event.preventDefault()
          event.stopPropagation()
          setSubmenuState({ actionId, open: true, focusedIndex: 0 })
          return
        }
      }
    },
    [focusedIndex, handleActionClick, handleSubmenuAction, submenuState, view]
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
      event.stopPropagation()
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
      setFocusedIndex(-1)
      setSubmenuState(null)
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
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <button
        type="button"
        className="btn btn-primary btn-sm sloptex-magic-button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setShowPanel(!showPanel)
          setFocusedIndex(-1)
          setSubmenuState(null)
        }}
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        aria-label={t('sloptex_overlay_toggle')}
        aria-expanded={showPanel}
      >
        <MaterialIcon type="auto_fix_high" />
      </button>
      {showPanel && (
        <div className="sloptex-selection-panel" ref={menuRef}>
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
              ref={inputRef}
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
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  handleSearchSubmit(e)
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setFocusedIndex(0)
                }
              }}
            />
            <OLButton
              size="sm"
              variant="primary"
              type="submit"
              aria-label={t('sloptex_overlay_submit')}
              leadingIcon="send"
              onMouseDown={(e) => {
                e.stopPropagation()
              }}
              onClick={(e) => {
                e.stopPropagation()
                handleSearchSubmit(e)
              }}
            />
          </form>
          {!submenuState && (
            <div
              className="sloptex-action-menu"
              role="menu"
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
            >
              {INLINE_ACTIONS.map((actionId, index) => {
                const config = SLOPTEX_ACTIONS[actionId]
                const isFocused = focusedIndex === index
                return (
                  <button
                    key={actionId}
                    type="button"
                    className={classNames('sloptex-menu-item', {
                      'sloptex-menu-item--focused': isFocused,
                    })}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleActionClick(actionId)
                    }}
                    onMouseEnter={() => setFocusedIndex(index)}
                    onFocus={() => setFocusedIndex(index)}
                    tabIndex={focusedIndex === index ? 0 : -1}
                    role="menuitem"
                    aria-label={labels[actionId]}
                  >
                    <MaterialIcon
                      type={config.icon}
                      className="sloptex-menu-item-icon"
                    />
                    <span>{labels[actionId]}</span>
                  </button>
                )
              })}
              {ACTIONS_WITH_SUBMENUS.map((actionId, index) => {
                const config = SLOPTEX_ACTIONS[actionId]
                const actionIndex = INLINE_ACTIONS.length + index
                const isFocused = focusedIndex === actionIndex
                return (
                  <button
                    key={actionId}
                    type="button"
                    className={classNames('sloptex-menu-item', {
                      'sloptex-menu-item--focused': isFocused,
                    })}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleActionClick(actionId)
                    }}
                    onMouseEnter={() => setFocusedIndex(actionIndex)}
                    onFocus={() => setFocusedIndex(actionIndex)}
                    tabIndex={focusedIndex === actionIndex ? 0 : -1}
                    role="menuitem"
                    aria-label={labels[actionId]}
                  >
                    <MaterialIcon
                      type={config.icon}
                      className="sloptex-menu-item-icon"
                    />
                    <span>{labels[actionId]}</span>
                    <MaterialIcon
                      type="chevron_right"
                      className="sloptex-menu-item-chevron"
                    />
                  </button>
                )
              })}
            </div>
          )}
          {submenuState && (
            <div className="sloptex-submenu" role="menu">
              <button
                type="button"
                className="sloptex-menu-item sloptex-menu-item--back"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setSubmenuState(null)
                  setFocusedIndex(
                    INLINE_ACTIONS.length +
                      ACTIONS_WITH_SUBMENUS.indexOf(submenuState.actionId)
                  )
                }}
                onFocus={() => {
                  setSubmenuState(prev =>
                    prev ? { ...prev, focusedIndex: -1 } : null
                  )
                }}
                tabIndex={0}
                role="menuitem"
                aria-label={t('back')}
              >
                <MaterialIcon
                  type="arrow_back"
                  className="sloptex-menu-item-icon"
                />
                <span>{t('back')}</span>
              </button>
              {submenuState.actionId === 'translate' &&
                TRANSLATE_LANGUAGES.map(({ code, name }, index) => (
                  <button
                    key={code}
                    type="button"
                    className={classNames('sloptex-menu-item', {
                      'sloptex-menu-item--focused':
                        submenuState.focusedIndex === index,
                    })}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleSubmenuAction('translate', code)
                    }}
                    onMouseEnter={() =>
                      setSubmenuState(prev =>
                        prev ? { ...prev, focusedIndex: index } : null
                      )}
                    onFocus={() =>
                      setSubmenuState(prev =>
                        prev ? { ...prev, focusedIndex: index } : null
                      )}
                    tabIndex={submenuState.focusedIndex === index ? 0 : -1}
                    role="menuitem"
                    aria-label={name}
                  >
                    <span>{name}</span>
                  </button>
                ))}
              {submenuState.actionId === 'style' &&
                ['scientific', 'concise', 'punchy'].map((style, index) => (
                  <button
                    key={style}
                    type="button"
                    className={classNames('sloptex-menu-item', {
                      'sloptex-menu-item--focused':
                        submenuState.focusedIndex === index,
                    })}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleSubmenuAction('style', style)
                    }}
                    onMouseEnter={() =>
                      setSubmenuState(prev =>
                        prev ? { ...prev, focusedIndex: index } : null
                      )}
                    onFocus={() =>
                      setSubmenuState(prev =>
                        prev ? { ...prev, focusedIndex: index } : null
                      )}
                    tabIndex={submenuState.focusedIndex === index ? 0 : -1}
                    role="menuitem"
                    aria-label={t(`sloptex_style_${style}`)}
                  >
                    <span>{t(`sloptex_style_${style}`)}</span>
                  </button>
                ))}
            </div>
          )}
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

