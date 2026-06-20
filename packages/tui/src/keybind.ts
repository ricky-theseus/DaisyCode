// Keybind configuration

export type KeyAction =
  | 'switch-agent'
  | 'leader-mode'
  | 'session-list'
  | 'command-palette'
  | 'exit'
  | 'submit'
  | 'cancel'
  | 'delete-to-start'
  | 'delete-to-end'
  | 'delete-word'
  | 'line-start'
  | 'line-end'
  | 'prev-word'
  | 'next-word'
  | 'clear-screen'
  | 'scroll-up'
  | 'scroll-down'
  | 'page-up'
  | 'page-down'
  | 'home'
  | 'end'

export interface Keybind {
  key: string
  ctrl?: boolean
  alt?: boolean
  shift?: boolean
  action: KeyAction
  description: string
}

export const globalKeybinds: Keybind[] = [
  { key: 'tab', action: 'switch-agent', description: 'Switch Agent' },
  { key: 'x', ctrl: true, action: 'leader-mode', description: 'Leader Mode' },
  { key: 'l', ctrl: true, action: 'session-list', description: 'Session List' },
  { key: 'p', ctrl: true, action: 'command-palette', description: 'Command Palette' },
  { key: 'c', ctrl: true, action: 'exit', description: 'Exit TUI' },
]

export const inputKeybinds: Keybind[] = [
  { key: 'return', action: 'submit', description: 'Submit message' },
  { key: 'return', shift: true, action: 'submit', description: 'Force newline' },
  { key: 'c', ctrl: true, action: 'cancel', description: 'Cancel/interrupt' },
  { key: 'u', ctrl: true, action: 'delete-to-start', description: 'Delete to start' },
  { key: 'k', ctrl: true, action: 'delete-to-end', description: 'Delete to end' },
  { key: 'w', ctrl: true, action: 'delete-word', description: 'Delete word' },
  { key: 'a', ctrl: true, action: 'line-start', description: 'Line start' },
  { key: 'e', ctrl: true, action: 'line-end', description: 'Line end' },
  { key: 'b', alt: true, action: 'prev-word', description: 'Previous word' },
  { key: 'f', alt: true, action: 'next-word', description: 'Next word' },
]

export const navKeybinds: Keybind[] = [
  { key: 'pagedown', action: 'page-down', description: 'Page down' },
  { key: 'pageup', action: 'page-up', description: 'Page up' },
  { key: 'home', action: 'home', description: 'First message' },
  { key: 'end', action: 'end', description: 'Last message' },
  { key: 'up', action: 'scroll-up', description: 'Scroll up' },
  { key: 'down', action: 'scroll-down', description: 'Scroll down' },
]

export function matchKeybind(
  input: string,
  keybinds: Keybind[],
): KeyAction | undefined {
  return keybinds.find((kb) => kb.key === input)?.action
}
