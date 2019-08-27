import * as React from 'react'

import chalk from 'chalk'
import { Box } from 'ink'

import { useBoxSize, wrapText } from './util'

export function Header() {
  const [ref, {width}] = useBoxSize()
  const text = wrapText('N&M\'s CLI', width || 0, 'left', 2)
  return (
    <Box ref={ref} width="100%" flexDirection="column" marginBottom={1}>
      <Box>{chalk.bgWhite(wrapText(' ', width || 0))}</Box>
      <Box>{chalk.bgWhite(chalk.black(text))}</Box>
      <Box>{chalk.bgWhite(wrapText(' ', width || 0))}</Box>
    </Box>
  )
}

export default Header
