import { appendFileSync } from 'fs'
import { useState, useCallback } from 'react'

export function useBoxWidth(): [(box: any) => void, number | undefined] {
  const [width, setWidth] = useState(undefined)
  const ref = useCallback(box => {
    setWidth(box ? box.nodeRef.current.yogaNode.getComputedWidth() : undefined)
  }, [])
  return [ref, width]
}

export function filelog(obj: {}) {
  appendFileSync(process.cwd() + '/tmp/log', new Date().toISOString() + ' ' + JSON.stringify(obj) + '\n');
}

const emptyChar = ' '

export function wrapText(
  text: string,
  width: number,
  float: 'left' | 'right' | 'center' = 'left',
  padding = 1
) {
  if (width < text.length) return text
  text = padding ? `${emptyChar.repeat(padding)}${text}${emptyChar.repeat(padding)}` : text
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
