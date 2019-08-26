import React from 'react'

import chalk from 'chalk'
import { Box } from 'ink'
import BorderBox from './BorderBox';

export function PageTitle({children: text}: { children: string }): React.ReactElement {
  return (
    <Box margin={1}>
      <BorderBox color="cyan">
      {chalk.bold(chalk.cyan(` ${text} `))}
      </BorderBox>
    </Box>
  )
}
