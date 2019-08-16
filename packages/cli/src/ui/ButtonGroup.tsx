import React from 'react'
import { Box, Color } from 'ink'
import Button from './Button';

export interface ButtonGroupProps {
  items: string[]
  focus: string
}

export function ButtonGroup({items, focus}: ButtonGroupProps): React.ReactElement {
  return (
    <Box flexDirection="row">
      {items.map(item => (
        <Color
          key={item}
          keyword={focus === item ? 'black' : 'white'}
          bgKeyword={focus === item ? 'yellow' : 'gray'}>
          <Button>{item}</Button>
        </Color>
      ))}
    </Box>
  )
}

export default ButtonGroup
