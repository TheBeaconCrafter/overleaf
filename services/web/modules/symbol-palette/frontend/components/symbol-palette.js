// Mostly taken from overleaf-cep, a fork of Overleaf Community Edition
// https://github.com/yu-i-i/overleaf-cep/commit/519c1961cea57f0b91edd4c71cb191cfa1653fc1
// https://github.com/yu-i-i/overleaf-cep/tree/72d182f5539846c83fbec096de94da278580af88/services/web/modules/symbol-palette/frontend/components

import SymbolPaletteContent from './symbol-palette-content'
import SymbolPaletteErrorBoundary from './symbol-palette-error-boundary'

export default function SymbolPalette() {
  console.log('[SymbolPalette] Component mounted')

  const handleSelect = (symbol) => {
    console.log('[SymbolPalette] Symbol selected:', symbol)
    window.dispatchEvent(new CustomEvent('editor:insert-symbol', { detail: symbol }))
  }

  return (
    <SymbolPaletteErrorBoundary>
      <SymbolPaletteContent handleSelect={handleSelect} />
    </SymbolPaletteErrorBoundary>
  )
}
