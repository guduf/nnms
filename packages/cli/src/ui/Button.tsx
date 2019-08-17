import React from 'react'
import { wrapText } from './util';
import { Box, Color } from 'ink';

export interface ButtonProps {
  children: string
  width?: number
  status: 'hover' | 'active' | 'disabled' | 'normal'
}

export function Button({children: text, status, width}: ButtonProps): React.ReactElement {
  const [buttonPadding, buttonText] = React.useMemo(() => {
    const buttonWidth = (width || text.length) + 4
    return [
      ' '.repeat(buttonWidth),
      wrapText(text, buttonWidth, 'center', 2)
    ]
  }, [text, width])
  const [color, bgColor] = (
    status === 'disabled' ? ['grey', 'black'] :
      status === 'active' ? ['black', 'green'] :
        status === 'hover' ? ['black', 'yellow'] :
          ['white', 'grey']
  )
  return (
    <Box flexDirection="column" margin={1}>
      <Color keyword={color} bgKeyword={bgColor}>{buttonPadding}</Color>
      <Color keyword={color} bgKeyword={bgColor}>{buttonText}</Color>
      <Color keyword={color} bgKeyword={bgColor}>{buttonPadding}</Color>
    </Box>
  )
}

export default Button
