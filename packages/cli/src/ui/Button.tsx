import React from 'react'
import { wrapText } from './util';
import { Box, Text } from 'ink';

export interface ButtonProps {
  children: string
  width?: number
}

export function Button({children: text, width}: ButtonProps): React.ReactElement {
  const  [buttonPadding, buttonText] = React.useMemo(() => {
    const buttonWidth = (width || text.length) + 4
    return [
      ' '.repeat(buttonWidth),
      wrapText(text, buttonWidth, 'center', 2)
    ]
  }, [text, width])
  return (
    <Box flexDirection="column" margin={1}>
      <Text>{buttonPadding}</Text>
      <Text>{buttonText}</Text>
      <Text>{buttonPadding}</Text>
    </Box>
  )
}

export default Button
