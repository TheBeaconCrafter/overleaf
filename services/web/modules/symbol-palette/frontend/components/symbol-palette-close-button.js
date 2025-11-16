// Mostly taken from overleaf-cep, a fork of Overleaf Community Edition
// https://github.com/yu-i-i/overleaf-cep/commit/519c1961cea57f0b91edd4c71cb191cfa1653fc1

import { useEditorPropertiesContext } from '@/features/ide-react/context/editor-properties-context'
import { useTranslation } from 'react-i18next'
import PropTypes from 'prop-types'

export default function SymbolPaletteCloseButton() {
  const { toggleSymbolPalette } = useEditorPropertiesContext()
  const { t } = useTranslation()

  const handleClick = () => {
    toggleSymbolPalette()
    window.dispatchEvent(new CustomEvent('editor:focus'))
  }

  return (
    <div className="symbol-palette-close-button-outer">
      <button
        type="button"
        className="btn-close symbol-palette-close-button"
        onClick={handleClick}
        aria-label={t('close')}
      >
      </button>
    </div>
  )
}

SymbolPaletteCloseButton.propTypes = {
  focusInput: PropTypes.func,
}