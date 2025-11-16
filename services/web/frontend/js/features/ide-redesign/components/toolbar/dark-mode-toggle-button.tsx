import { useTranslation } from 'react-i18next'
import OLIconButton from '@/shared/components/ol/ol-icon-button'
import OLTooltip from '@/shared/components/ol/ol-tooltip'
import MaterialIcon from '@/shared/components/material-icon'
import { useEditorDarkMode } from '../../context/editor-dark-mode-context'

export default function DarkModeToggleButton() {
  const { t } = useTranslation()
  const { editorDarkMode, toggleEditorDarkMode } = useEditorDarkMode()

  return (
    <div className="ide-redesign-toolbar-button-container">
      <OLTooltip
        id="dark-mode-toggle"
        description={editorDarkMode ? t('switch_to_light_mode') : t('switch_to_dark_mode')}
        overlayProps={{ placement: 'bottom', delay: 100 }}
      >
        <OLIconButton
          onClick={toggleEditorDarkMode}
          icon={
            <MaterialIcon
              type={editorDarkMode ? 'light_mode' : 'dark_mode'}
              accessibilityLabel={
                editorDarkMode ? t('switch_to_light_mode') : t('switch_to_dark_mode')
              }
            />
          }
          size="sm"
          variant="ghost"
        />
      </OLTooltip>
    </div>
  )
}
