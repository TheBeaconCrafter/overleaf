// Mostly taken from overleaf-cep, a fork of Overleaf Community Edition
// https://github.com/yu-i-i/overleaf-cep/commit/519c1961cea57f0b91edd4c71cb191cfa1653fc1

import { List as TabsList, Trigger as TabsTrigger } from '@radix-ui/react-tabs'
import PropTypes from 'prop-types'

export default function SymbolPaletteTabs({ categories = [] }) {
  console.log('[SymbolPaletteTabs] Received categories:', categories, 'Type:', typeof categories, 'IsArray:', Array.isArray(categories))

  if (!categories) {
    console.error('[SymbolPaletteTabs] ERROR: categories is null/undefined!')
    return null
  }

  if (!Array.isArray(categories)) {
    console.error('[SymbolPaletteTabs] ERROR: categories is not an array!', typeof categories, categories)
    return null
  }

  if (categories.length === 0) {
    console.warn('[SymbolPaletteTabs] WARNING: categories array is empty')
    return null
  }

  console.log('[SymbolPaletteTabs] Rendering', categories.length, 'tabs')
  return (
    <TabsList aria-label="Symbol Categories" className="symbol-palette-tab-list">
      {categories.map(category => (
        <TabsTrigger
          key={category.id}
          value={category.id}
          className="symbol-palette-tab"
        >
          {category.label}
        </TabsTrigger>
      ))}
    </TabsList>
  )
}

SymbolPaletteTabs.propTypes = {
  categories: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ),
}
