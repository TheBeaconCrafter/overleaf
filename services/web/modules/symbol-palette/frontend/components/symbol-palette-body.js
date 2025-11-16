// Mostly taken from overleaf-cep, a fork of Overleaf Community Edition
// https://github.com/yu-i-i/overleaf-cep/commit/519c1961cea57f0b91edd4c71cb191cfa1653fc1

import { Content as TabsContent } from '@radix-ui/react-tabs'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'
import SymbolPaletteItems from './symbol-palette-items'

export default function SymbolPaletteBody({
  categories = [],
  categorisedSymbols,
  filteredSymbols,
  handleSelect,
  focusInput,
}) {
  const { t } = useTranslation()

  console.log('[SymbolPaletteBody] Received props:', {
    categories,
    categoriesType: typeof categories,
    categoriesIsArray: Array.isArray(categories),
    categoriesLength: categories?.length,
    hasCategorisedSymbols: !!categorisedSymbols,
    hasFilteredSymbols: !!filteredSymbols,
  })

  // Safety check: if categories is undefined or empty, return null
  if (!categories) {
    console.error('[SymbolPaletteBody] ERROR: categories is null/undefined!')
    return null
  }

  if (!Array.isArray(categories)) {
    console.error('[SymbolPaletteBody] ERROR: categories is not an array!', typeof categories, categories)
    return null
  }

  if (categories.length === 0) {
    console.warn('[SymbolPaletteBody] WARNING: categories array is empty')
    return null
  }

  // searching with matches: show the matched symbols
  // searching with no matches: show a message
  // note: include empty tab panels so that aria-controls on tabs can still reference the panel ids
  if (filteredSymbols) {
    return (
      <>
        {filteredSymbols.length ? (
          <SymbolPaletteItems
            items={filteredSymbols}
            handleSelect={handleSelect}
            focusInput={focusInput}
          />
        ) : (
          <div className="symbol-palette-empty">{t('no_symbols_found')}</div>
        )}

        {categories.map(category => (
          <TabsContent key={category.id} value={category.id} tabIndex={-1} />
        ))}
      </>
    )
  }

  // not searching: show the symbols grouped by category
  return (
    <>
      {categories.map(category => {
        const categoryItems = categorisedSymbols?.[category.id]
        // Ensure it's always an array
        const itemsArray = Array.isArray(categoryItems) ? categoryItems : []
        
        console.log(`[SymbolPaletteBody] Category ${category.id}:`, {
          categoryItems,
          categoryItemsType: typeof categoryItems,
          categoryItemsIsArray: Array.isArray(categoryItems),
          categoryItemsLength: categoryItems?.length,
          itemsArrayLength: itemsArray.length,
        })
        
        return (
          <TabsContent key={category.id} value={category.id} tabIndex={-1}>
            <SymbolPaletteItems
              items={itemsArray}
              handleSelect={handleSelect}
              focusInput={focusInput}
            />
          </TabsContent>
        )
      })}
    </>
  )
}
SymbolPaletteBody.propTypes = {
  categories: PropTypes.arrayOf(PropTypes.object),
  categorisedSymbols: PropTypes.object,
  filteredSymbols: PropTypes.arrayOf(PropTypes.object),
  handleSelect: PropTypes.func.isRequired,
  focusInput: PropTypes.func.isRequired,
}
