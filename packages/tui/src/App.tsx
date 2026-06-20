import { useState, useCallback } from 'react'
import { Box } from 'ink'
import Splash from './components/Splash.js'
import StatusBar from './components/StatusBar.js'
import Conversation from './components/Conversation.js'
import InputBox from './components/InputBox.js'
import Help from './components/Help.js'
import { theme } from './theme.js'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  timestamp: number
  status?: 'sending' | 'streaming' | 'done' | 'error'
}

export default function App() {
  const [mode, setMode] = useState<'splash' | 'conversation'>('splash')
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [showHelp, setShowHelp] = useState(false)
  const [status, setStatus] = useState({
    agent: 'build',
    model: 'deepseek-chat',
    tokens: 0,
    status: 'idle' as 'idle' | 'stream' | 'think' | 'error',
  })

  const handleSubmit = useCallback((text: string) => {
    if (!text.trim()) return
    const msg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
      status: 'done',
    }
    setMessages((prev) => [...prev, msg])
    setInputValue('')
    if (mode === 'splash') {
      setMode('conversation')
    }
  }, [mode])

  const handleCancel = useCallback(() => {
    // interrupt current stream
  }, [])

  return (
    <Box
      flexDirection="column"
      height="100%"
      backgroundColor={theme.bg}
    >
      {mode === 'splash' ? (
        <Splash onSubmit={handleSubmit} />
      ) : (
        <>
          <StatusBar
            agent={status.agent}
            model={status.model}
            tokens={status.tokens}
            status={status.status}
          />
          <Conversation
            messages={messages}
            isStreaming={status.status === 'stream'}
          />
          <InputBox
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            disabled={status.status === 'stream'}
          />
        </>
      )}

      <Help
        visible={showHelp}
        onClose={() => setShowHelp(false)}
      />
    </Box>
  )
}
