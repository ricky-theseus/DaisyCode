// Cyberpunk theme constants
export const theme = {
  bg: '#0a0014',
  primary: '#00ffcc',
  secondary: '#b347ea',
  accent: '#ff00aa',
  text: '#e0e0e0',
  textMuted: '#666666',
  textDim: '#444444',
  success: '#00ffcc',
  warning: '#ffcc00',
  error: '#ff00aa',
  info: '#b347ea',
  border: '#1a1a2e',
  borderActive: '#00ffcc',
  codeBg: '#0d001a',
  selection: '#1a0033',
  syntax: {
    keyword: '#ff00aa',
    function: '#00ffcc',
    variable: '#e0e0e0',
    string: '#b347ea',
    number: '#ffcc00',
    comment: '#444444',
    operator: '#00ffcc',
  },
} as const

export type Theme = typeof theme
