import { Box, Text } from 'ink'
import { theme } from '../theme.js'

const logo = [
  '  +-------+   +-------+   +---+   +-----------+   +---+   +---+',
  '  | D     |   | A     |   | I |   | S     Y   |   | C |   | O |',
  '  |   D   |   |   A   |   | I |   |   S   Y   |   |   C   |   O   |',
  '  |     D |   |     A |   | I |   |     S Y   |   | C     |     O |',
  '  +-------+   +-------+   +---+   +-----------+   +---+   +---+',
]

interface SplashProps {
  onSubmit: (text: string) => void
  prompt?: string
}

export default function Splash({ onSubmit, prompt = 'Type your question, or /help for help' }: SplashProps) {
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
          <Text color={theme.primary}>? </Text>
          <Text color={theme.text}>{prompt}</Text>
        </Text>
      </Box>
    </Box>
  )
}
