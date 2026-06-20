import { useState } from 'react'
import { Box, Text, useInput } from 'ink'
import { theme } from '../theme.js'

const logo = [
  '  ██████╗     █████╗    ██╗   ███████╗  ██╗   ██╗',
  '  ██╔══██╗   ██╔══██╗   ██║   ██╔════╝  ╚██╗ ██╔╝',
  '  ██║  ██║   ███████║   ██║   ███████╗   ╚████╔╝ ',
  '  ██║  ██║   ██╔══██║   ██║   ╚════██║    ╚██╔╝  ',
  '  ██████╔╝   ██║  ██║   ██║   ███████║     ██║   ',
  '  ╚═════╝    ╚═╝  ╚═╝   ╚═╝   ╚══════╝     ╚═╝   ',
]

interface SplashProps {
  onSubmit: (text: string) => void
}

export default function Splash({ onSubmit }: SplashProps) {
  const [input, setInput] = useState('')
  const placeholder = 'describe your needs, or /help for commands'

  useInput((char, key) => {
    if (key.return) {
      if (input.trim()) {
        onSubmit(input.trim())
        setInput('')
      }
      return
    }
    if (key.backspace || key.delete) {
      setInput(prev => prev.slice(0, -1))
      return
    }
    if (key.escape) {
      setInput('')
      return
    }
    if (char && !key.ctrl && !key.meta) {
      setInput(prev => prev + char)
    }
  })

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
      <Box marginBottom={2}>
        <Box flexDirection="column">
          {logo.map((line, i) => (
            <Text key={i} color={theme.primary}>
              {line}
            </Text>
          ))}
        </Box>
      </Box>
      <Box
        borderStyle="round"
        borderColor={theme.primary}
        paddingX={2}
        paddingY={1}
      >
        <Box marginRight={1}>
          <Text color={theme.primary}>▸</Text>
        </Box>
        {input ? (
          <Text color={theme.text}>{input}</Text>
        ) : (
          <Text color={theme.textDim}>{placeholder}</Text>
        )}
      </Box>
    </Box>
  )
}
