/**
 * File-based logger for Aurora Player
 *
 * Writes timestamped log entries to aurora.log in the user data directory.
 * Rotates the log file when it exceeds a configurable size threshold.
 * Captures uncaught exceptions and unhandled promise rejections.
 */

import { app } from 'electron'
import { join } from 'path'
import {
  existsSync, statSync, renameSync, unlinkSync,
  appendFileSync, mkdirSync,
} from 'fs'

// ── Config ──────────────────────────────────────────────────────────────────
const MAX_LOG_SIZE = 5 * 1024 * 1024 // 5 MB per log file
const MAX_ROTATED = 2 // keep aurora.log.1 and aurora.log.2

// ── State ───────────────────────────────────────────────────────────────────
let logPath = ''
let initialized = false

// ── Helpers ─────────────────────────────────────────────────────────────────
function ensureInit() {
  if (initialized) return
  const dataPath = app.getPath('userData')
  mkdirSync(dataPath, { recursive: true })
  logPath = join(dataPath, 'aurora.log')
  initialized = true
  rotate()
}

function rotate() {
  try {
    if (!existsSync(logPath)) return
    const stats = statSync(logPath)
    if (stats.size < MAX_LOG_SIZE) return

    // Remove the oldest rotated log if it exists
    const oldest = `${logPath}.${MAX_ROTATED}`
    if (existsSync(oldest)) unlinkSync(oldest)

    // Shift existing rotated logs up by one
    for (let i = MAX_ROTATED - 1; i >= 1; i--) {
      const from = `${logPath}.${i}`
      const to = `${logPath}.${i + 1}`
      if (existsSync(from)) renameSync(from, to)
    }

    // Current log becomes .1
    renameSync(logPath, `${logPath}.1`)
  } catch {
    // Best-effort rotation — don't crash the app over log management
  }
}

function formatArg(a: unknown): string {
  if (a instanceof Error) return `${a.message}\n${a.stack || ''}`
  if (typeof a === 'object' && a !== null) {
    try { return JSON.stringify(a) } catch { return String(a) }
  }
  return String(a)
}

function write(level: string, args: unknown[]) {
  ensureInit()
  const timestamp = new Date().toISOString()
  const message = args.map(formatArg).join(' ')
  const line = `[${timestamp}] [${level.padEnd(5)}] ${message}\n`
  try {
    appendFileSync(logPath, line)
  } catch {
    // If we can't write to the log file, there's nothing we can do
  }
}

// ── Public API ──────────────────────────────────────────────────────────────
export const logger = {
  info(...args: unknown[]) {
    write('INFO', args)
    console.log('[INFO]', ...args)
  },
  warn(...args: unknown[]) {
    write('WARN', args)
    console.warn('[WARN]', ...args)
  },
  error(...args: unknown[]) {
    write('ERROR', args)
    console.error('[ERROR]', ...args)
  },
  debug(...args: unknown[]) {
    write('DEBUG', args)
  },
}

/**
 * Install global handlers for uncaught exceptions and unhandled rejections.
 * Also writes startup system info to the log.
 */
export function installGlobalLogHandlers() {
  ensureInit()

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error)
  })

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection:', reason)
  })

  // Write startup banner
  logger.info('─'.repeat(60))
  logger.info(`Aurora Player v${app.getVersion()} starting`)
  logger.info(`Platform: ${process.platform} ${process.arch}`)
  logger.info(`Electron: ${process.versions.electron}`)
  logger.info(`Chrome: ${process.versions.chrome}`)
  logger.info(`Node: ${process.versions.node}`)
  logger.info(`User data: ${app.getPath('userData')}`)
  logger.info('─'.repeat(60))
}

/**
 * Return the path to the current log file.
 */
export function getLogPath(): string {
  ensureInit()
  return logPath
}
