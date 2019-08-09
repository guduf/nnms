import React from 'react'

import chalk from 'chalk'
import SelectInput from 'ink-select-input'
import { Box, Color, Text } from 'ink'

import { wrapText } from './util'

export interface MenuProps {
  title: string
  entries: string[]
  onSelect: (selected: string) => void
  onBack?: () => void
}

export function Menu(props: MenuProps): React.ReactElement {
  const items = React.useMemo(() => [
    ...props.entries.map(entry => ({label: String(entry), value: String(entry)})),
    ...(props.onBack ? [{label: chalk.gray('BACK'), value: 'BACK'}] : [])
  ], [props.entries])
  const handleSelect = ({value}: { value: string }) => {
    if (value === 'BACK') (props.onBack as () => void)()
    else props.onSelect(value)
  }
  return (
    <Box flexDirection="column" width={24} paddingRight={4}>
      <Text><Color bgBlue>{wrapText(props.title, 20)}</Color></Text>
      <Box width={0} height={1}></Box>
      <SelectInput items={items} onSelect={item => handleSelect(item as { value: string })}/>
    </Box>
  )
}

export default Menu
