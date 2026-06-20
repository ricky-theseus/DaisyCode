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
  const placeholder = '描述你的需求，或 /help 查看命令'

  useInput((value, key) => {
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
    // printable chars only
    if (value && value.length === 1 && !key.ctrl && !key.meta) {
      setInput(prev => prev + value)
    }
  })

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" height="100%">
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
        width="60%"
        paddingX={2}
        paddingY={1}
      >
        <Text>
          <Text color={theme.primary}>▸ </Text>
          {input ? (
            <Text color={theme.text}>{input}</Text>
          ) : (
            <Text color={theme.textDim}>{placeholder}</Text>
          )}
        </Text>
      </Box>
    </Box>
  )
}
