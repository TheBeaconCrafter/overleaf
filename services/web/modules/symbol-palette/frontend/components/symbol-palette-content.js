// Mostly taken from overleaf-cep, a fork of Overleaf Community Edition
// https://github.com/yu-i-i/overleaf-cep/commit/519c1961cea57f0b91edd4c71cb191cfa1653fc1

import { Root as TabsRoot } from '@radix-ui/react-tabs'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import { matchSorter } from 'match-sorter'
import symbols from '../data/symbols.json'
import { buildCategorisedSymbols, createCategories } from '../utils/categories'
import SymbolPaletteSearch from './symbol-palette-search'
import SymbolPaletteBody from './symbol-palette-body'
import SymbolPaletteTabs from './symbol-palette-tabs'
import SymbolPaletteCloseButton from './symbol-palette-close-button'

export default function SymbolPaletteContent({ handleSelect }) {
  const [input, setInput] = useState('')

  const { t, ready } = useTranslation()

  // Initialize with fallback categories immediately to prevent undefined issues
  const [categoriesState, setCategoriesState] = useState([])

  // build the list of categories with translated labels
  const categories = useMemo(() => {
    console.log('[Symbol Palette] Creating categories - ready:', ready, 'typeof t:', typeof t)
    if (!ready) {
      console.log('[Symbol Palette] Translations not ready, using fallback')
      // Return fallback categories immediately so we never have undefined
      const fallback = createCategories(() => '')
      setCategoriesState(fallback)
      return fallback
    }
    try {
      const result = createCategories(t)
      console.log('[Symbol Palette] Created categories:', JSON.stringify(result))
      if (!result || result.length === 0) {
        console.error('[Symbol Palette] ERROR: Categories array is empty or null!', result)
        const fallback = createCategories(() => '')
        setCategoriesState(fallback)
        return fallback
      }
      setCategoriesState(result)
      return result || []
    } catch (error) {
      console.error('[Symbol Palette] EXCEPTION creating categories:', error.message, error.stack)
      const fallback = createCategories(() => '')
      setCategoriesState(fallback)
      return fallback
    }
  }, [t, ready])

  // Use the state as final safety net - this ensures we ALWAYS have an array
  const safeCategories = categories || categoriesState || []

  // get the default tab value (first category id)
  const defaultTabValue = useMemo(
    () => (safeCategories && safeCategories.length > 0 ? safeCategories[0].id : undefined),
    [safeCategories]
  )

  // group the symbols by category
  const categorisedSymbols = useMemo(() => {
    if (!safeCategories || safeCategories.length === 0) {
      console.warn('[Symbol Palette] No categories, returning empty object')
      return {}
    }
    const result = buildCategorisedSymbols(safeCategories)
    console.log('[Symbol Palette] Built categorised symbols:', {
      result,
      resultType: typeof result,
      resultKeys: Object.keys(result || {}),
      sampleCategory: safeCategories[0]?.id,
      sampleCategoryItems: result?.[safeCategories[0]?.id],
      sampleCategoryItemsType: typeof result?.[safeCategories[0]?.id],
      sampleCategoryItemsIsArray: Array.isArray(result?.[safeCategories[0]?.id]),
    })
    return result
  }, [safeCategories])

  // select symbols which match the input
  const filteredSymbols = useMemo(() => {
    if (input === '') {
      return null
    }

    const words = input.trim().split(/\s+/)

    return words.reduceRight(
      (symbols, word) =>
        matchSorter(symbols, word, {
          keys: ['command', 'description', 'character', 'aliases'],
          threshold: matchSorter.rankings.CONTAINS,
        }),
      symbols
    )
  }, [input])

  const inputRef = useRef(null)

  // allow the input to be focused
  const focusInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  // focus the input when the symbol palette is opened
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  // Log initialization for debugging
  useEffect(() => {
    console.log('[Symbol Palette] Component State Check:', {
      categoriesCount: categories?.length || 0,
      safeCategoriesCount: safeCategories?.length || 0,
      categoriesIsArray: Array.isArray(categories),
      safeCategoriesIsArray: Array.isArray(safeCategories),
      categoriesValue: categories,
      safeCategoriesValue: safeCategories,
      categoriesReady: categories && categories.length > 0,
      translationsReady: ready,
      defaultTabValue,
      symbolsCount: symbols?.length || 0,
      symbolsIsArray: Array.isArray(symbols),
    })

    if (!safeCategories) {
      console.error('[Symbol Palette] CRITICAL: safeCategories is undefined/null!')
    }
    if (!Array.isArray(safeCategories)) {
      console.error('[Symbol Palette] CRITICAL: safeCategories is not an array!', typeof safeCategories, safeCategories)
    }
  }, [categories, safeCategories, ready, defaultTabValue])

  // Early return if translations aren't ready yet or categories are empty
  if (!ready || !safeCategories || safeCategories.length === 0) {
    console.warn('[Symbol Palette] Not ready yet:', { ready, categoriesCount: categories?.length || 0, safeCategoriesCount: safeCategories?.length || 0 })
    return (
      <div className="symbol-palette-container">
        <div className="symbol-palette">
          <div className="symbol-palette-loading">Loading symbol palette...</div>
        </div>
      </div>
    )
  }

  // Final safety check before rendering
  console.log('[Symbol Palette] About to render - safeCategories:', safeCategories, 'isArray:', Array.isArray(safeCategories), 'length:', safeCategories.length)

  return (
    <TabsRoot
      className="symbol-palette-container"
      defaultValue={defaultTabValue}
    >
      <div className="symbol-palette">
        <div className="symbol-palette-header-outer">
          <div className="symbol-palette-header">
            <SymbolPaletteTabs categories={safeCategories} />
            <div className="symbol-palette-header-group">
              <SymbolPaletteSearch setInput={setInput} inputRef={inputRef} />
            </div>
          </div>
          <div className="symbol-palette-header-group">
            <SymbolPaletteCloseButton />
          </div>
        </div>
        <div className="symbol-palette-body">
          <SymbolPaletteBody
            categories={safeCategories}
            categorisedSymbols={categorisedSymbols}
            filteredSymbols={filteredSymbols}
            handleSelect={handleSelect}
            focusInput={focusInput}
          />
        </div>
      </div>
    </TabsRoot>
  )
}
SymbolPaletteContent.propTypes = {
  handleSelect: PropTypes.func.isRequired,
}
