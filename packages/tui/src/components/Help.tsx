import { Box, Text } from 'ink'
import { theme } from '../theme.js'

interface HelpProps {
  visible: boolean
  onClose: () => void
}

const helpItems = [
  { key: 'Tab', desc: 'Switch Agent' },
  { key: 'Ctrl+X', desc: 'Leader Mode' },
  { key: 'Ctrl+L', desc: 'Session List' },
  { key: 'Ctrl+P', desc: 'Command Palette' },
  { key: 'Ctrl+C', desc: 'Exit TUI' },
  { key: 'Enter', desc: 'Send message' },
  { key: 'Shift+Enter', desc: 'New line' },
  { key: 'PageUp/Down', desc: 'Scroll conversation' },
]

export default function Help({ visible, onClose }: HelpProps) {
  if (!visible) return null

  return (
    <Box
      position="absolute"
      width="100%"
      height="100%"
      alignItems="center"
      justifyContent="center"
    >
      <Box
        borderStyle="round"
        borderColor={theme.primary}
        backgroundColor={theme.bg}
        paddingX={4}
        paddingY={2}
        flexDirection="column"
      >
        <Text bold color={theme.primary}>Help</Text>
        <Box marginTop={1} flexDirection="column">
          {helpItems.map((item) => (
            <Box key={item.key}>
              <Box width={16}>
                <Text color={theme.secondary}>{item.key}</Text>
              </Box>
              <Text color={theme.text}>{item.desc}</Text>
            </Box>
          ))}
        </Box>
        <Box marginTop={1}>
          <Text color={theme.textDim}>Press any key to close</Text>
        </Box>
      </Box>
    </Box>
  )
}
