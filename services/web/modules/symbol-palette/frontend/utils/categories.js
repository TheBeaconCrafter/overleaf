// Mostly taken from overleaf-cep, a fork of Overleaf Community Edition
// https://github.com/yu-i-i/overleaf-cep/commit/519c1961cea57f0b91edd4c71cb191cfa1653fc1

import symbols from '../data/symbols.json'

// Fallback labels in case translations aren't ready
const FALLBACK_LABELS = {
  category_greek: 'Greek',
  category_arrows: 'Arrows',
  category_operators: 'Operators',
  category_relations: 'Relations',
  category_misc: 'Misc',
}

export function createCategories(t) {
  console.log('[createCategories] Called with t:', typeof t, t)

  try {
    // Ensure t is a function, otherwise use fallbacks
    const translate = typeof t === 'function' ? t : (key) => {
      console.warn('[createCategories] Using fallback for key:', key)
      return FALLBACK_LABELS[key] || key
    }

    const categories = [
      {
        id: 'Greek',
        label: translate('category_greek'),
      },
      {
        id: 'Arrows',
        label: translate('category_arrows'),
      },
      {
        id: 'Operators',
        label: translate('category_operators'),
      },
      {
        id: 'Relations',
        label: translate('category_relations'),
      },
      {
        id: 'Misc',
        label: translate('category_misc'),
      },
    ]

    console.log('[createCategories] Successfully created categories:', JSON.stringify(categories))
    return categories
  } catch (error) {
    console.error('[createCategories] EXCEPTION:', error.message, error.stack)
    // Return categories with fallback labels
    const fallbackCategories = [
      { id: 'Greek', label: FALLBACK_LABELS.category_greek },
      { id: 'Arrows', label: FALLBACK_LABELS.category_arrows },
      { id: 'Operators', label: FALLBACK_LABELS.category_operators },
      { id: 'Relations', label: FALLBACK_LABELS.category_relations },
      { id: 'Misc', label: FALLBACK_LABELS.category_misc },
    ]
    console.log('[createCategories] Returning fallback categories:', JSON.stringify(fallbackCategories))
    return fallbackCategories
  }
}

export function buildCategorisedSymbols(categories) {
  console.log('[buildCategorisedSymbols] Called with categories:', categories, 'Type:', typeof categories, 'IsArray:', Array.isArray(categories))

  if (!categories) {
    console.error('[buildCategorisedSymbols] ERROR: categories is null/undefined!')
    return {}
  }

  if (!Array.isArray(categories)) {
    console.error('[buildCategorisedSymbols] ERROR: categories is not an array!', typeof categories)
    return {}
  }

  if (categories.length === 0) {
    console.warn('[buildCategorisedSymbols] WARNING: categories array is empty')
    return {}
  }

  try {
    const output = {}

    for (const category of categories) {
      if (category && category.id) {
        output[category.id] = []
      } else {
        console.warn('[buildCategorisedSymbols] Invalid category:', category)
      }
    }

    console.log('[buildCategorisedSymbols] Created output structure:', Object.keys(output))

    if (!symbols || !Array.isArray(symbols)) {
      console.error('[buildCategorisedSymbols] ERROR: symbols.json is not a valid array!', typeof symbols)
      return output
    }

    console.log('[buildCategorisedSymbols] Processing', symbols.length, 'symbols')

    for (const item of symbols) {
      if (item && item.category && item.category in output) {
        try {
          item.character = String.fromCodePoint(
            parseInt(item.codepoint.replace(/^U\+0*/, ''), 16)
          )
          output[item.category].push(item)
        } catch (error) {
          console.warn('[buildCategorisedSymbols] Error processing symbol:', item, error.message)
        }
      }
    }

    console.log('[buildCategorisedSymbols] Symbol counts by category:', Object.entries(output).map(([k, v]) => `${k}: ${v.length}`).join(', '))
    return output
  } catch (error) {
    console.error('[buildCategorisedSymbols] EXCEPTION:', error.message, error.stack)
    return {}
  }
}
