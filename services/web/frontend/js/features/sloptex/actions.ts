import type { TFunction } from 'i18next'

export type SloptexActionId =
  | 'assist'
  | 'title'
  | 'abstract'
  | 'paraphrase'
  | 'translate'
  | 'style'
  | 'split'
  | 'join'
  | 'summarize'
  | 'explain'
  | 'fix_latex'

type SloptexActionLabelKey =
  | 'sloptex_action_assist'
  | 'sloptex_action_title'
  | 'sloptex_action_abstract'
  | 'sloptex_action_paraphrase'
  | 'sloptex_action_translate'
  | 'sloptex_action_style'
  | 'sloptex_action_split'
  | 'sloptex_action_join'
  | 'sloptex_action_summarize'
  | 'sloptex_action_explain'
  | 'sloptex_action_fix_latex'

export type SloptexActionConfig = {
  id: SloptexActionId
  labelKey: SloptexActionLabelKey
  description?: string
  requiresSelection?: boolean
  requiresInput?: boolean
  target: 'insert' | 'replace' | 'none'
  icon: string
}

export const SLOPTEX_ACTIONS: Record<SloptexActionId, SloptexActionConfig> = {
  assist: {
    id: 'assist',
    labelKey: 'sloptex_action_assist',
    target: 'insert',
    requiresInput: true,
    icon: 'auto_awesome',
  },
  title: {
    id: 'title',
    labelKey: 'sloptex_action_title',
    target: 'insert',
    requiresInput: true,
    icon: 'title',
  },
  abstract: {
    id: 'abstract',
    labelKey: 'sloptex_action_abstract',
    target: 'insert',
    requiresInput: true,
    icon: 'description',
  },
  paraphrase: {
    id: 'paraphrase',
    labelKey: 'sloptex_action_paraphrase',
    target: 'replace',
    requiresSelection: true,
    icon: 'sync',
  },
  translate: {
    id: 'translate',
    labelKey: 'sloptex_action_translate',
    target: 'replace',
    requiresSelection: true,
    icon: 'translate',
  },
  style: {
    id: 'style',
    labelKey: 'sloptex_action_style',
    target: 'replace',
    requiresSelection: true,
    icon: 'format_paint',
  },
  split: {
    id: 'split',
    labelKey: 'sloptex_action_split',
    target: 'replace',
    requiresSelection: true,
    icon: 'call_split',
  },
  join: {
    id: 'join',
    labelKey: 'sloptex_action_join',
    target: 'replace',
    requiresSelection: true,
    icon: 'merge_type',
  },
  summarize: {
    id: 'summarize',
    labelKey: 'sloptex_action_summarize',
    target: 'replace',
    requiresSelection: true,
    icon: 'short_text',
  },
  explain: {
    id: 'explain',
    labelKey: 'sloptex_action_explain',
    target: 'replace',
    requiresSelection: true,
    icon: 'lightbulb',
  },
  fix_latex: {
    id: 'fix_latex',
    labelKey: 'sloptex_action_fix_latex',
    target: 'replace',
    requiresSelection: true,
    icon: 'build',
  },
}

export const SLOPTEX_SECTIONS: (Array<SloptexActionId | 'settings'>)[] = [
  ['assist', 'title', 'abstract'],
  ['paraphrase', 'translate', 'style', 'split', 'join', 'summarize', 'explain', 'fix_latex'],
  ['settings'],
]

export function buildSloptexActionLabels(
  t: TFunction
): Record<SloptexActionId, string> {
  return {
    assist: t('sloptex_action_assist'),
    title: t('sloptex_action_title'),
    abstract: t('sloptex_action_abstract'),
    paraphrase: t('sloptex_action_paraphrase'),
    translate: t('sloptex_action_translate'),
    style: t('sloptex_action_style'),
    split: t('sloptex_action_split'),
    join: t('sloptex_action_join'),
    summarize: t('sloptex_action_summarize'),
    explain: t('sloptex_action_explain'),
    fix_latex: t('sloptex_action_fix_latex'),
  }
}

