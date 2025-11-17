import { useIdeRedesignSwitcherContext } from '@/features/ide-react/context/ide-redesign-switcher-context'
import OLButton from '@/shared/components/ol/ol-button'
import OLTooltip from '@/shared/components/ol/ol-tooltip'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { GiveFeedbackLink } from './give-feedback-link'
import { useIsNewEditorEnabled } from '../../utils/new-editor-utils'
import { useSwitchEnableNewEditorState } from '../../hooks/use-switch-enable-new-editor-state'
import { useEditorAnalytics } from '@/shared/hooks/use-editor-analytics'

export const BetaActions = () => {
  const { t } = useTranslation()
  const { setShowSwitcherModal } = useIdeRedesignSwitcherContext()
  const openEditorRedesignSwitcherModal = useCallback(() => {
    setShowSwitcherModal(true)
  }, [setShowSwitcherModal])
  const showBetaActions = useIsNewEditorEnabled()
  const { loading, setEditorRedesignStatus } = useSwitchEnableNewEditorState()
  const { sendEvent } = useEditorAnalytics()
  const switchToOldEditor = useCallback(() => {
    sendEvent('editor-redesign-toggle', {
      action: 'disable',
      location: 'toolbar',
    })
    setEditorRedesignStatus(false)
  }, [setEditorRedesignStatus, sendEvent])

  if (!showBetaActions) {
    return null
  }

  return (
    <>
      <div className="ide-redesign-toolbar-button-container">
        <OLButton
          size="sm"
          variant="secondary"
          className="ide-redesign-switch-back-button"
          onClick={switchToOldEditor}
          isLoading={loading}
        >
          {t('switch_to_old_editor')}
        </OLButton>
      </div>
      <div className="ide-redesign-toolbar-button-container">
        <OLTooltip
          id="tooltip-beta-button"
          description={t('this_is_a_beta_release_for_the_new_overleaf_editor')}
          overlayProps={{ delay: 0, placement: 'bottom' }}
        >
          <OLButton
            size="sm"
            variant="secondary"
            className="ide-redesign-beta-button"
            onClick={openEditorRedesignSwitcherModal}
          >
            {t('beta')}
          </OLButton>
        </OLTooltip>
      </div>
      <GiveFeedbackLink />
    </>
  )
}
