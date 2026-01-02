import { memo } from 'react'
import ForceDisconnected from '@/features/ide-react/components/modals/force-disconnected'
import { UnsavedDocs } from '@/features/ide-react/components/unsaved-docs/unsaved-docs'
import SystemMessages from '@/shared/components/system-messages'
import NewEditorPromoModal from '@/features/ide-redesign/components/new-editor-promo-modal'
import NewEditorIntroModal from '@/features/ide-redesign/components/new-editor-intro-modal'
import NewEditorOptOutIntroModal from '@/features/ide-redesign/components/new-editor-opt-out-intro-modal'
import { useFeatureFlag } from '@/shared/context/split-test-context'
import AnnouncementModal from '@/shared/components/announcement-modal'
import { useAnnouncements } from '@/shared/context/announcement-context'

export const Modals = memo(() => {
  const isNewEditorOptOutStage = useFeatureFlag('editor-redesign-opt-out')
  const { currentAnnouncement, showModal, setShowModal, handleDismiss, announcements } = useAnnouncements()

  console.log('[Modals] Announcement state:', { 
    currentAnnouncement, 
    showModal, 
    announcementsCount: announcements.length 
  })

  const handleAnnouncementDismiss = (dontShowAgain: boolean) => {
    handleDismiss(dontShowAgain)
  }

  return (
    <>
      <ForceDisconnected />
      <UnsavedDocs />
      <SystemMessages />
      {isNewEditorOptOutStage ? (
        <NewEditorOptOutIntroModal />
      ) : (
        <>
          <NewEditorPromoModal />
          <NewEditorIntroModal />
        </>
      )}
      {showModal && currentAnnouncement && (
        <AnnouncementModal
          announcement={currentAnnouncement}
          onDismiss={handleAnnouncementDismiss}
        />
      )}
    </>
  )
})
Modals.displayName = 'Modals'
