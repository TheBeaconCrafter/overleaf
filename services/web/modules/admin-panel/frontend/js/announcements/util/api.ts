import { postJSON, getJSON, deleteJSON, putJSON } from '@/infrastructure/fetch-json'

export async function getAnnouncements() {
  return getJSON('/api/announcements')
}

export async function getAnnouncement(id: string) {
  return getJSON(`/api/announcements/${id}`)
}

export async function createAnnouncement(data: any) {
  return postJSON('/api/announcements', { body: data })
}

export async function updateAnnouncement(id: string, data: any) {
  return putJSON(`/api/announcements/${id}`, { body: data })
}

export async function deleteAnnouncement(id: string) {
  return deleteJSON(`/api/announcements/${id}`)
}

export async function getActiveAnnouncements() {
  return getJSON('/api/announcements/active')
}

export async function dismissAnnouncement(id: string, dontShowAgain: boolean) {
  return postJSON(`/api/announcements/${id}/dismiss`, {
    body: { dontShowAgain },
  })
}

