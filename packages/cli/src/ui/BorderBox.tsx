import * as React from 'react'

import { Box, BoxProps } from 'ink'

import c, { Chalk } from 'chalk'

import { useBoxSize } from './util'

export interface BorderBoxSideProps {
  color: Chalk
  width: number
  position: 'top' | 'bottom'
}

export function BorderBoxSide({color, width, position}: BorderBoxSideProps): React.ReactElement {
  if (width < 2) return <Box />
  const top = position === 'top'
  return (
    <Box flexGrow={1} width={width || '100%'} height={1}>{
      (color(top ? '┌' : '└') + color('─').repeat(width - 2) + color(top ? '┐' : '┘'))
    }</Box>
  )
}

export interface BorderBoxProps {
  children: React.ReactNode
  color: string
  fixedWidth?: number
  justifyContent?: BoxProps['justifyContent']
}
export function BorderBox({children, color, justifyContent, fixedWidth}: BorderBoxProps) {
  const [ref, {width: refWidth}] = useBoxSize()
  const width = fixedWidth || refWidth
  const chalk = c.keyword(color)
  return (
    <Box
      ref={ref}
      flexDirection="column"
      flexGrow={fixedWidth ? 0 : 1}
      width={fixedWidth ? fixedWidth > 4 ? fixedWidth : 4 : '100%'}
      height={3}>
      <BorderBoxSide color={chalk} position="top" width={width || 0} />
      <Box flexGrow={1} width="100%">
        <Box>{chalk('│') + chalk(' ')}</Box>
        <Box flexGrow={1} justifyContent={justifyContent}>{children}</Box>
        <Box>{chalk(' ') + chalk('│')}</Box>
      </Box>
      <BorderBoxSide color={chalk} position="bottom" width={width || 0} />
    </Box>
  )
}

export default BorderBox
