import * as React from 'react'

import chalk from 'chalk'
import { Box, BoxProps } from 'ink'

import { useBoxWidth } from './util'

export interface BorderBoxSideProps {
  color: string
  width: number
  position: 'top' | 'bottom'
}

export function BorderBoxSide({color, width, position}: BorderBoxSideProps): React.ReactElement {
  if (width < 2) return <Box />
  const top = position === 'top'
  return (
    <Box flexGrow={1} width={width || '100%'} height={1}>
      {chalk.keyword(color)(
        (top ? '┌' : '└') + ('─').repeat(width - 2) + (top ? '┐' : '┘')
      )}
    </Box>
  )
}

export interface BorderBoxProps {
  children: React.ReactNode
  color: string
  fixedWidth?: number
  justifyContent?: BoxProps['justifyContent']
}
export function BorderBox({children, color, justifyContent, fixedWidth}: BorderBoxProps) {
  const [ref, width] = useBoxWidth()
  return (
    <Box
      ref={ref}
      flexDirection="column"
      flexGrow={fixedWidth ? 0 : 1}
      width={fixedWidth ? fixedWidth > 4 ? fixedWidth : 4 : '100%'}
      height={3}>
      <BorderBoxSide color={color} position="top" width={width || 0} />
      <Box flexGrow={1} width="100%">
        <Box>{chalk.keyword(color)('│ ')}</Box>
        <Box flexGrow={1} justifyContent={justifyContent}>{children}</Box>
        <Box>{chalk.keyword(color)(' │')}</Box>
      </Box>
      <BorderBoxSide color={color} position="bottom" width={width || 0} />
    </Box>
  )
}

export default BorderBox
