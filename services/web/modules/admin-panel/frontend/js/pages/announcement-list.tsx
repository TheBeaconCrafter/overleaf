import '@/features/header-footer-react'
import { createRoot } from 'react-dom/client'
import AnnouncementListRoot from '../announcements/components/announcement-list-root'

const element = document.getElementById('announcement-list-root')
if (element) {
  const root = createRoot(element)
  root.render(<AnnouncementListRoot />)
}

