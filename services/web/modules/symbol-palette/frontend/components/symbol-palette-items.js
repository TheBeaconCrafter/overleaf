// Mostly taken from overleaf-cep, a fork of Overleaf Community Edition
// https://github.com/yu-i-i/overleaf-cep/commit/519c1961cea57f0b91edd4c71cb191cfa1653fc1

import { useCallback, useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import SymbolPaletteItem from './symbol-palette-item'
import { useEditorPropertiesContext } from '@/features/ide-react/context/editor-properties-context'

export default function SymbolPaletteItems({
  items = [],
  handleSelect,
  focusInput,
}) {
  const [focusedIndex, setFocusedIndex] = useState(0)
  const itemRefs = useRef([])
  const { toggleSymbolPalette } = useEditorPropertiesContext()

  // Ensure items is always an array - more defensive than just early return
  const safeItems = Array.isArray(items) ? items : []

  console.log('[SymbolPaletteItems] Rendering with items:', {
    itemsType: typeof items,
    itemsIsArray: Array.isArray(items),
    itemsLength: items?.length,
    safeItemsLength: safeItems.length,
  })

  // Safety check: return early if items is invalid (before useEffect runs)
  if (safeItems.length === 0) {
    console.log('[SymbolPaletteItems] No items to display')
    return null
  }

  // reset the focused item when the list of items changes
  useEffect(() => {
    itemRefs.current = safeItems.map((_, i) => itemRefs.current[i] || null)
    setFocusedIndex(0)
  }, [safeItems])

  const getItemRects = () => {
    return itemRefs.current.map(ref => ref?.getBoundingClientRect?.() ?? null)
  }

  // navigate through items with keyboard
  const handleKeyDown = useCallback(
    event => {
      if (!safeItems || safeItems.length === 0) {
        return
      }

      if (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) {
        return
      }

      const rects = getItemRects()
      const currentRect = rects[focusedIndex]
      if (!currentRect) return

      let newIndex = focusedIndex

      switch (event.key) {
        case 'ArrowLeft':
          newIndex = focusedIndex > 0 ? focusedIndex - 1 : safeItems.length - 1
          break
        case 'ArrowRight':
          newIndex = focusedIndex < safeItems.length - 1 ? focusedIndex + 1 : 0
          break
        case 'ArrowUp':
        case 'ArrowDown': {
          const direction = event.key === 'ArrowUp' ? -1 : 1
          const candidates = rects
            .map((rect, i) => ({ rect, i }))
            .filter(({ rect }, i) =>
              i !== focusedIndex &&
              rect &&
              Math.abs(rect.x - currentRect.x) < currentRect.width * 0.8 &&
              (direction === -1 ? rect.y < currentRect.y : rect.y > currentRect.y)
            )

          if (candidates.length > 0) {
            const closest = candidates.reduce((a, b) =>
              Math.abs(b.rect.y - currentRect.y) < Math.abs(a.rect.y - currentRect.y) ? b : a
            )
            newIndex = closest.i
          }
          break
        }
        case 'Home':
          newIndex = 0
          break
        case 'End':
          newIndex = safeItems.length - 1
          break
        case 'Enter':
        case ' ':
          handleSelect(safeItems[focusedIndex])
          toggleSymbolPalette()
          break
        case 'Escape':
          toggleSymbolPalette()
          window.dispatchEvent(new CustomEvent('editor:focus'))
          break

        default:
          focusInput()
          return
      }

      event.preventDefault()
      setFocusedIndex(newIndex)
    },
    [focusedIndex, safeItems, focusInput, handleSelect, toggleSymbolPalette]
  )

  return (
    <div className="symbol-palette-items" role="listbox" aria-label="Symbols">
      {safeItems.map((symbol, index) => (
        <SymbolPaletteItem
          key={symbol.codepoint}
          symbol={symbol}
          handleSelect={symbol => {
            handleSelect(symbol)
            setFocusedIndex(index)
          }}
          handleKeyDown={handleKeyDown}
          focused={index === focusedIndex}
          ref={el => {
            itemRefs.current[index] = el
          }}
        />
      ))}
    </div>
  )
}
SymbolPaletteItems.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      codepoint: PropTypes.string.isRequired,
    })
  ),
  handleSelect: PropTypes.func.isRequired,
  focusInput: PropTypes.func.isRequired,
}
