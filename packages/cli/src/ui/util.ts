import { appendFileSync } from 'fs'
import { useState, useCallback, useEffect } from 'react'
import { Observable } from 'rxjs';

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

export function useObservable<T>(init: () => Observable<T>, deps: any[]): T | undefined {
  const [value, setValue] = useState(undefined as T | undefined)
  useEffect(() => {
    setValue(undefined)
    const subscr = init().subscribe(value => setValue(value))
    return () => subscr.unsubscribe()
  }, deps)
  return value
}
