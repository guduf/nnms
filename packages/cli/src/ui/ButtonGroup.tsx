import React from 'react'
import { Box } from 'ink'
import Button, { ButtonProps } from './Button';

export interface ButtonGroupProps {
  items: string[]
  query: string
  focus: string
}

export function ButtonGroup({items, focus, query}: ButtonGroupProps): React.ReactElement {
  const getStatus = (item: string): ButtonProps['status'] => {
    if (item === focus) return 'hover'
    if (!item.startsWith(query)) return 'disabled'
    return 'normal'
  }
  return (
    <Box flexDirection="row">
      {items.map(item => (
        <Button key={item} status={getStatus(item)}>{item}</Button>
      ))}
    </Box>
  )
}

export default ButtonGroup
