import { Box, Text } from 'ink'
import { theme } from '../theme.js'

interface InputBoxProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (text: string) => void
  onCancel: () => void
  disabled?: boolean
  placeholder?: string
}

export default function InputBox({
  value,
  onChange,
  onSubmit,
  onCancel,
  disabled = false,
  placeholder = 'Type your question, or /help for help',
}: InputBoxProps) {
  const borderColor = disabled ? theme.border : theme.borderActive

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box
        borderStyle="round"
        borderColor={borderColor}
        paddingX={2}
        paddingY={1}
      >
        <Box flexDirection="column" width="100%">
          <Box>
            <Text color={theme.primary}>? </Text>
            {value ? (
              <Text color={theme.text}>{value}</Text>
            ) : (
              <Text color={theme.textDim}>{placeholder}</Text>
            )}
          </Box>
          <Box marginTop={1}>
            <Text color={theme.textDim}>
              tab=agent  ctrl+x=leader  ctrl+l=sessions  ctrl+p=command  Enter=send
            </Text>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
