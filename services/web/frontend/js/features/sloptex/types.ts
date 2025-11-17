import type { SloptexActionId } from './actions'
import type { Change } from 'diff'

export type SloptexInlineEditState = {
  id: number
  actionId: SloptexActionId
  from: number
  to: number
  original: string
  status: 'loading' | 'ready' | 'error'
  result?: string
  diff?: Change[]
  error?: string
}

