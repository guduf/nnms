import React from 'react'
import SelectInput from 'ink-select-input'
import { filelog } from '../util'
import chalk from 'chalk'

export function Browser(props: { mods: string[] }): React.ReactElement {
  const items = React.useMemo(() => [
    ...props.mods.map(mod => ({label: mod, value: mod})),
    {label: chalk.gray('BACK'), value: 'BACK'}
  ], [props.mods])
  const handleSelect = (e: any) => filelog(e)
  return <SelectInput items={items} onSelect={handleSelect}/>
}

export default Browser
