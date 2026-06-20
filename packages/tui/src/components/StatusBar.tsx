import { Box, Text } from 'ink'
import { theme } from '../theme.js'

interface StatusBarProps {
  agent: string
  model: string
  tokens: number
  status: 'idle' | 'stream' | 'think' | 'error'
}

const statusColors: Record<string, string> = {
  idle: theme.success,
  stream: theme.success,
  think: theme.secondary,
  error: theme.error,
}

export default function StatusBar({ agent, model, tokens, status }: StatusBarProps) {
  const dotColor = statusColors[status] || theme.textDim

  return (
    <Box flexDirection="column">
      <Box>
        <Text>
          <Text color={dotColor}>● </Text>
          <Text bold color={theme.primary}>DaisyCode</Text>
          <Text>  </Text>
          <Text color={theme.textMuted}>{agent}</Text>
          <Text color={theme.textDim}> | </Text>
          <Text color={theme.textMuted}>{model}</Text>
          <Box flexGrow={1} />
          <Text color={theme.textDim}>{tokens.toLocaleString()} tokens</Text>
        </Text>
      </Box>
      <Text color={theme.textDim}>─</Text>
    </Box>
  )
}
