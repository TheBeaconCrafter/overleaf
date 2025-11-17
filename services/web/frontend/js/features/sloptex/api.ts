import {
  getJSON,
  postJSON,
  deleteJSON,
} from '@/infrastructure/fetch-json'

export function fetchSloptexStatus() {
  return getJSON<{
    enabled: boolean
    hasApiKey: boolean
    defaultModel: string
  }>('/sloptex/status')
}

export function saveSloptexApiKey(apiKey: string) {
  return postJSON('/sloptex/api-key', {
    body: { apiKey },
  })
}

export function deleteSloptexApiKey() {
  return deleteJSON('/sloptex/api-key')
}

export function generateSloptexContent(body: {
  operation: string
  text?: string
  options?: Record<string, any>
}) {
  return postJSON<{ content: string }>('/sloptex/generate', {
    body,
  })
}

