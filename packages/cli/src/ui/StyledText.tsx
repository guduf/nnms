import React from 'react'

import chalk from 'chalk'
import { Text } from 'ink'

import { useTerminal } from './terminal'

export interface StyledTextProps {
  width: number | 'full'
  color?: string
  bgColor?: string
  float?: 'left' | 'center' | 'right'
  children: string
  paddingX?: number
}

const emptyChar = ' '

export function StyledText(props: StyledTextProps): React.ReactElement {
  const terminal = useTerminal()
  const text = React.useMemo(() => {
    const width = props.width === 'full' ? terminal.cols : props.width || 0
    const paddingX = props.paddingX || 0
    const rawText = emptyChar.repeat(paddingX) + props.children + emptyChar.repeat(paddingX)
    let wrappedText = wrapText(rawText, width, props.float)
    if (props.color) wrappedText = chalk.keyword(props.color)(wrappedText)
    if (props.bgColor) wrappedText = chalk.bgKeyword(props.bgColor)(wrappedText)
    return wrappedText
  }, [props.children, terminal.cols])
  return (<Text>{text}</Text>)
}


export function wrapText(text: string, width: number, float: 'left' | 'right' | 'center' = 'left') {
  if (width < text.length) return text
  switch(float) {
    case 'left':
      return text + emptyChar.repeat(width - text.length)
    case 'center':
      const marginX = (width - text.length) / 2
      return emptyChar.repeat(marginX) + text + emptyChar.repeat(marginX)
    case 'right':
      return emptyChar.repeat(width - text.length) + text
    default:
      return text
  }
}

export default StyledText
