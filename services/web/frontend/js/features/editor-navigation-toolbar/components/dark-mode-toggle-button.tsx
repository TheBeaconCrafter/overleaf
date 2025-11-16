import { useTranslation } from 'react-i18next'
import { useEditorDarkMode } from '@/features/ide-redesign/context/editor-dark-mode-context'
import MaterialIcon from '@/shared/components/material-icon'
import OLTooltip from '@/shared/components/ol/ol-tooltip'

export default function DarkModeToggleButton() {
  const { t } = useTranslation()
  const { editorDarkMode, toggleEditorDarkMode } = useEditorDarkMode()

  return (
    <OLTooltip
      id="dark-mode-toggle"
      description={
        editorDarkMode ? t('switch_to_light_mode') : t('switch_to_dark_mode')
      }
      overlayProps={{ placement: 'bottom' }}
    >
      <div className="toolbar-item">
        <button
          className="btn btn-full-height"
          onClick={toggleEditorDarkMode}
          aria-label={
            editorDarkMode
              ? t('switch_to_light_mode')
              : t('switch_to_dark_mode')
          }
        >
          <MaterialIcon
            type={editorDarkMode ? 'light_mode' : 'dark_mode'}
            accessibilityLabel={
              editorDarkMode
                ? t('switch_to_light_mode')
                : t('switch_to_dark_mode')
            }
          />
        </button>
      </div>
    </OLTooltip>
  )
}
