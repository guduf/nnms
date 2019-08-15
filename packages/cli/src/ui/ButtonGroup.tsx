import React from 'react'
import { Box, Color } from 'ink'
import Button from './Button';

export interface ButtonGroupProps {
  items: { [key: string]: string }
}

export function ButtonGroup({items}: ButtonGroupProps): React.ReactElement {

  return (
    <Box flexDirection="row">
      {Object.keys(items).map(key => (
        <Color key={key} bgBlackBright><Button>{items[key]}</Button></Color>
      ))}
    </Box>
  )
}

export default ButtonGroup
