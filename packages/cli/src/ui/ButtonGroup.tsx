import React from 'react'
import { Box, Color } from 'ink'
import Button from './Button';

export interface ButtonGroupProps {
  items: string[]
}

export function ButtonGroup({items}: ButtonGroupProps): React.ReactElement {

  return (
    <Box flexDirection="row">
      {items.map(item => (
        <Color key={item} bgBlackBright><Button>{item}</Button></Color>
      ))}
    </Box>
  )
}

export default ButtonGroup
