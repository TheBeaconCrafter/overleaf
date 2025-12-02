import AccessTokenEncryptor from '@overleaf/access-token-encryptor'
import Settings from '@overleaf/settings'
import OError from '@overleaf/o-error'
import { GoogleGenAI } from '@google/genai'

const sloptexSettings = Settings.sloptex || {}
const DEFAULT_MODEL = sloptexSettings.defaultModel || 'gemini-2.5-flash-lite'

let encryptor
if (sloptexSettings.accessTokenEncryptorOptions) {
  encryptor = new AccessTokenEncryptor(
    sloptexSettings.accessTokenEncryptorOptions
  )
}

function isEnabled() {
  return sloptexSettings.enabled !== false && Boolean(encryptor)
}

function ensureEnabled() {
  if (!isEnabled()) {
    throw new OError('SlopTex is not enabled')
  }
}

function ensureEncryptor() {
  if (!encryptor) {
    throw new OError('SlopTex encryption is not configured')
  }
}

export { isEnabled, ensureEnabled }

export async function encryptApiKey(apiKey) {
  ensureEncryptor()
  return await encryptor.promises.encryptJson({ apiKey })
}

export async function decryptApiKey(encrypted) {
  if (!encrypted) {
    return null
  }
  ensureEncryptor()
  const payload = await encryptor.promises.decryptToJson(encrypted)
  return payload?.apiKey || null
}

function sanitizeInput(value = '') {
  return value.toString().trim().slice(0, 8000)
}

function buildPrompt(operation, text, options = {}) {
  const sanitized = sanitizeInput(text || options.text || '')
  const baseInstructions =
    'You are SlopTex, an Overleaf assistant that writes in Markdown compatible with LaTeX. Give concise answers and do not add any extra text. Respond with plain text and never modify LaTeX commands unless explicitly instructed.'

  switch (operation) {
    case 'assist': {
      const question = sanitizeInput(options.prompt || sanitized)
      if (!question) {
        throw new OError('Missing question for AI assistance')
      }
      return `${baseInstructions}\n\nUser request:\n${question}`
    }
    case 'title': {
      if (!sanitized) throw new OError('Provide some context to generate a title')
      return `${baseInstructions}\n\nGenerate three publication-ready paper titles (no numbering) that reflect the following notes:\n${sanitized}`
    }
    case 'abstract': {
      if (!sanitized)
        throw new OError('Provide content to generate an abstract')
      return `${baseInstructions}\n\nWrite a concise academic abstract (max 200 words) that summarizes the following material:\n${sanitized}`
    }
    case 'paraphrase': {
      if (!sanitized) throw new OError('Select text to paraphrase')
      return `${baseInstructions}\n\nParaphrase the following text while preserving meaning:\n${sanitized}`
    }
    case 'translate': {
      if (!sanitized) throw new OError('Select text to translate')
      const targetLanguage = options.targetLanguage || 'English'
      return `${baseInstructions}\n\nTranslate the following text into ${targetLanguage} while keeping LaTeX commands untouched:\n${sanitized}`
    }
    case 'style': {
      if (!sanitized) throw new OError('Select text to restyle')
      const style = options.style || 'scientific'
      return `${baseInstructions}\n\nRewrite the following text in a ${style} tone while preserving mathematical notation:\n${sanitized}`
    }
    case 'split': {
      if (!sanitized) throw new OError('Select text to split')
      return `${baseInstructions}\n\nSplit the text into shorter paragraphs that read naturally:\n${sanitized}`
    }
    case 'join': {
      if (!sanitized) throw new OError('Select text to join')
      return `${baseInstructions}\n\nCombine the following paragraphs into one cohesive paragraph:\n${sanitized}`
    }
    case 'summarize': {
      if (!sanitized) throw new OError('Select text to summarize')
      return `${baseInstructions}\n\nSummarize the following text in 3 sentences:\n${sanitized}`
    }
    case 'explain': {
      if (!sanitized) throw new OError('Select text to explain')
      return `${baseInstructions}\n\nExplain the following text step by step in plain language:\n${sanitized}`
    }
    case 'fix_latex': {
      if (!sanitized) throw new OError('Select LaTeX code to fix')
      return `${baseInstructions}\n\nFix and improve the following LaTeX code. Do not modify any text outside of LaTeX commands. Correct any syntax errors, improve formatting, and make it more readable while preserving the original meaning:\n${sanitized}`
    }
    default:
      throw new OError(`Unknown SlopTex operation '${operation}'`)
  }
}

export async function generateResponse(apiKey, operation, text, options = {}) {
  ensureEnabled()
  if (!apiKey) {
    throw new OError('Missing Gemini API key')
  }
  const prompt = buildPrompt(operation, text, options)
  const ai = new GoogleGenAI({ apiKey })
  const response = await ai.models.generateContent({
    model: options.model || DEFAULT_MODEL,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  })
  if (typeof response.text === 'function') {
    return await response.text()
  }
  return response.text || ''
}

export function getSloptexStatus(hasApiKey) {
  return {
    enabled: isEnabled(),
    hasApiKey: Boolean(hasApiKey),
    defaultModel: DEFAULT_MODEL,
  }
}

