import React  from 'react'

export const TerminalContext = React.createContext({rows: 0, cols: 0})

export const useTerminal = () => React.useContext(TerminalContext)

export function getTerminalSize(): { rows: number, cols: number } {
  return {rows: process.stdout.rows || 0, cols: process.stdout.columns ||0}
}

export function TerminalProvider(props: { children: React.ReactNode }): React.ReactElement {
  const [size, setSize] = React.useState(getTerminalSize())
  React.useEffect(() => {
    const listener = () => {
      const newSize = getTerminalSize()
      if (JSON.stringify(size) !== JSON.stringify(newSize)) setSize(newSize)
    }
    process.stdout.on('resize', listener)
    return () => { process.stdout.off('resize', listener) }
  }, [])
  return (
    <TerminalContext.Provider value={size}>
      {props.children}
    </TerminalContext.Provider>
  )
}
