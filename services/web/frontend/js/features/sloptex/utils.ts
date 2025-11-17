import type { EditorView } from '@codemirror/view'
import { Transaction } from '@codemirror/state'

export function getPrimarySelection(view: EditorView | null) {
  if (!view) return null
  const selection = view.state.selection.main
  if (selection.empty) return null
  return {
    from: selection.from,
    to: selection.to,
    text: view.state.sliceDoc(selection.from, selection.to),
  }
}

export function replaceSelection(
  view: EditorView | null,
  text: string,
  insertAtCursor = false
) {
  if (!view) return
  const { state } = view
  const tr = state.changeByRange(range => {
    if (insertAtCursor) {
      const pos = range.head
      return {
        changes: { from: pos, to: pos, insert: text },
        range: {
          anchor: pos + text.length,
          head: pos + text.length,
        },
      }
    }
    return {
      changes: { from: range.from, to: range.to, insert: text },
      range: {
        anchor: range.from + text.length,
        head: range.from + text.length,
      },
    }
  })
  view.dispatch({
    ...tr,
    annotations: Transaction.userEvent.of('input'),
    scrollIntoView: true,
  })
  view.focus()
}

