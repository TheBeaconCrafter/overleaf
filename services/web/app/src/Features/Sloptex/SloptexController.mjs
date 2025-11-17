import OError from '@overleaf/o-error'
import { expressify } from '@overleaf/promise-utils'
import SessionManager from '../Authentication/SessionManager.mjs'
import UserGetter from '../User/UserGetter.mjs'
import UserUpdater from '../User/UserUpdater.mjs'
import {
  encryptApiKey,
  decryptApiKey,
  generateResponse,
  getSloptexStatus,
  isEnabled,
} from './SloptexService.mjs'

function assertFeatureEnabled(res) {
  if (!isEnabled()) {
    res.status(404).json({ enabled: false })
    return false
  }
  return true
}

export async function getStatus(req, res, next) {
  try {
    if (!assertFeatureEnabled(res)) return
    const userId = SessionManager.getLoggedInUserId(req.session)
    const user = await UserGetter.promises.getUser(userId, {
      sloptex: 1,
    })
    res.json(getSloptexStatus(user?.sloptex?.apiKeyEncrypted))
  } catch (error) {
    next(error)
  }
}

export async function saveApiKey(req, res, next) {
  try {
    if (!assertFeatureEnabled(res)) return
    const { apiKey } = req.body || {}
    if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
      throw new OError('Missing apiKey')
    }
    const trimmedKey = apiKey.trim()
    if (trimmedKey.length > 400) {
      throw new OError('API key is too long')
    }
    const userId = SessionManager.getLoggedInUserId(req.session)
    const encrypted = await encryptApiKey(trimmedKey)
    await UserUpdater.promises.updateUser(userId, {
      $set: {
        'sloptex.apiKeyEncrypted': encrypted,
        'sloptex.enabled': true,
        'sloptex.updatedAt': new Date(),
      },
    })
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
}

export async function deleteApiKey(req, res, next) {
  try {
    if (!assertFeatureEnabled(res)) return
    const userId = SessionManager.getLoggedInUserId(req.session)
    await UserUpdater.promises.updateUser(userId, {
      $unset: { 'sloptex.apiKeyEncrypted': '' },
      $set: { 'sloptex.enabled': false, 'sloptex.updatedAt': new Date() },
    })
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
}

function parseApiErrorMessage(errorMessage) {
  try {
    const parsed = JSON.parse(errorMessage)
    if (parsed?.error?.message) {
      return parsed.error.message
    }
    if (parsed?.error?.code === 503) {
      return 'The model is overloaded. Please try again later.'
    }
  } catch {
    // Not JSON, return original
  }
  return errorMessage
}

export async function generate(req, res, next) {
  try {
    if (!assertFeatureEnabled(res)) return
    const { operation, text, options } = req.body || {}
    if (!operation || typeof operation !== 'string') {
      return res.status(400).json({ message: 'Missing operation' })
    }

    const userId = SessionManager.getLoggedInUserId(req.session)
    const user = await UserGetter.promises.getUser(userId, {
      sloptex: 1,
    })
    const apiKey = await decryptApiKey(user?.sloptex?.apiKeyEncrypted)
    if (!apiKey) {
      return res.status(400).json({ message: 'Missing configured API key' })
    }

    const result = await generateResponse(apiKey, operation, text, options)
    res.json({ content: result })
  } catch (error) {
    // Return 400 for validation errors (OError from SloptexService)
    if (error instanceof OError) {
      return res.status(400).json({ message: error.message })
    }
    // Parse API error messages for better user feedback
    if (error instanceof Error && error.message) {
      const userMessage = parseApiErrorMessage(error.message)
      return res.status(503).json({ message: userMessage })
    }
    // Log unexpected errors and return generic message
    next(error)
  }
}

export default {
  getStatus: expressify(getStatus),
  saveApiKey: expressify(saveApiKey),
  deleteApiKey: expressify(deleteApiKey),
  generate: expressify(generate),
}

