import { Box, Text } from 'ink'
import { theme } from '../theme.js'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  timestamp: number
  status?: 'sending' | 'streaming' | 'done' | 'error'
}

interface ConversationProps {
  messages: Message[]
  isStreaming: boolean
}

function MessageRow({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  const isStreaming = msg.status === 'streaming'
  const isError = msg.status === 'error'

  const nameColor = isUser ? theme.primary : theme.secondary
  const contentColor = isError ? theme.error : theme.text

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text bold color={nameColor}>
          {isUser ? '> ' : ''}{msg.role}
        </Text>
      </Box>
      <Box paddingLeft={2}>
        <Text color={contentColor}>
          {msg.content}
          {isStreaming && <Text color={theme.primary}>█</Text>}
        </Text>
      </Box>
    </Box>
  )
}

export default function Conversation({ messages, isStreaming }: ConversationProps) {
  if (messages.length === 0) {
    return (
      <Box flexGrow={1} alignItems="center" justifyContent="center">
        <Text color={theme.textDim}>No messages yet</Text>
      </Box>
    )
  }

  return (
    <Box flexGrow={1} flexDirection="column" paddingX={1}>
      {messages.map((msg) => (
        <MessageRow key={msg.id} msg={msg} />
      ))}
    </Box>
  )
}
