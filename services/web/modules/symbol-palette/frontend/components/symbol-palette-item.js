// Mostly taken from overleaf-cep, a fork of Overleaf Community Edition
// https://github.com/yu-i-i/overleaf-cep/commit/519c1961cea57f0b91edd4c71cb191cfa1653fc1

import { forwardRef } from 'react'
import PropTypes from 'prop-types'

const SymbolPaletteItem = forwardRef(
  ({ symbol, handleSelect, handleKeyDown, focused }, ref) => {
    if (!symbol) {
      return null
    }

    return (
      <button
        ref={ref}
        type="button"
        className={`symbol-palette-item ${focused ? 'focused' : ''}`}
        onClick={() => handleSelect(symbol)}
        onKeyDown={handleKeyDown}
        aria-label={symbol.description || symbol.command || symbol.character}
        title={symbol.description || symbol.command || symbol.character}
      >
        {symbol.character || symbol.codepoint}
      </button>
    )
  }
)

SymbolPaletteItem.displayName = 'SymbolPaletteItem'

SymbolPaletteItem.propTypes = {
  symbol: PropTypes.shape({
    character: PropTypes.string,
    codepoint: PropTypes.string.isRequired,
    command: PropTypes.string,
    description: PropTypes.string,
  }).isRequired,
  handleSelect: PropTypes.func.isRequired,
  handleKeyDown: PropTypes.func.isRequired,
  focused: PropTypes.bool,
}

export default SymbolPaletteItem
