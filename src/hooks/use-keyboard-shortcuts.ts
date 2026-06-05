'use client'

import { useEffect, useCallback, useRef } from 'react'

export interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  description: string
  category: 'navigation' | 'editor' | 'chat' | 'general'
  action: () => void
  /** Prevent default browser behavior */
  preventDefault?: boolean
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[]
  /** Whether shortcuts are active (e.g., not when a modal is open) */
  enabled?: boolean
}

function isMac(): boolean {
  if (typeof navigator === 'undefined') return false
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0 ||
    navigator.userAgent.toUpperCase().indexOf('MAC') >= 0
}

/**
 * Hook to register global keyboard shortcuts.
 * Supports both Mac (Cmd) and Windows/Linux (Ctrl) modifier keys.
 * Automatically cleans up event listeners on unmount.
 */
export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) {
  const shortcutsRef = useRef(shortcuts)

  // Update ref in effect to avoid render-time ref access
  useEffect(() => {
    shortcutsRef.current = shortcuts
  }, [shortcuts])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return

    // Don't trigger shortcuts when typing in input/textarea unless it's a shortcut that explicitly targets those
    const target = e.target as HTMLElement
    const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

    const mac = isMac()
    const modifierKey = mac ? e.metaKey : e.ctrlKey

    for (const shortcut of shortcutsRef.current) {
      const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase()
      const ctrlMatch = shortcut.ctrlKey || shortcut.metaKey ? modifierKey : !modifierKey
      const shiftMatch = shortcut.shiftKey ? e.shiftKey : !e.shiftKey
      const altMatch = shortcut.altKey ? e.altKey : !e.altKey

      if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
        // Allow Ctrl+Enter in input fields for chat
        if (isInputField && !(shortcut.key === 'enter' && modifierKey)) {
          // Skip non-Enter shortcuts when in input fields
          if (shortcut.key !== 'escape' && shortcut.key !== '/') {
            continue
          }
        }

        if (shortcut.preventDefault !== false) {
          e.preventDefault()
        }
        shortcut.action()
        return
      }
    }
  }, [enabled])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

/**
 * Get display string for a modifier key based on platform
 */
export function getModifierKey(): string {
  return isMac() ? '⌘' : 'Ctrl'
}

/**
 * Format a keyboard shortcut for display
 */
export function formatShortcut(shortcut: Pick<KeyboardShortcut, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>): string[] {
  const mac = isMac()
  const keys: string[] = []

  if (shortcut.ctrlKey || shortcut.metaKey) {
    keys.push(mac ? '⌘' : 'Ctrl')
  }
  if (shortcut.shiftKey) {
    keys.push(mac ? '⇧' : 'Shift')
  }
  if (shortcut.altKey) {
    keys.push(mac ? '⌥' : 'Alt')
  }

  // Format the key name
  const keyMap: Record<string, string> = {
    ' ': 'Space',
    'escape': 'Esc',
    'enter': 'Enter',
    '/': '/',
    'k': 'K',
    's': 'S',
    'b': 'B',
  }
  keys.push(keyMap[shortcut.key.toLowerCase()] || shortcut.key.toUpperCase())

  return keys
}
