import { memo } from 'react'
import ForceDisconnected from '@/features/ide-react/components/modals/force-disconnected'
import { UnsavedDocs } from '@/features/ide-react/components/unsaved-docs/unsaved-docs'
import SystemMessages from '@/shared/components/system-messages'
import NewEditorOptOutIntroModal from '@/features/ide-redesign/components/new-editor-opt-out-intro-modal'
import AnnouncementModal from '@/shared/components/announcement-modal'
import { useAnnouncements } from '@/shared/context/announcement-context'
import ViewOnlyAccessModal from '@/features/share-project-modal/components/view-only-access-modal'

export const Modals = memo(() => {
  const { currentAnnouncement, showModal, handleDismiss } = useAnnouncements()

  const handleAnnouncementDismiss = (dontShowAgain: boolean) => {
    handleDismiss(dontShowAgain)
  }

  return (
    <>
      <ForceDisconnected />
      <UnsavedDocs />
      <SystemMessages />
      <NewEditorOptOutIntroModal />
      {showModal && currentAnnouncement && (
        <AnnouncementModal
          announcement={currentAnnouncement}
          onDismiss={handleAnnouncementDismiss}
        />
      )}
      <ViewOnlyAccessModal />
    </>
  )
})
Modals.displayName = 'Modals'
