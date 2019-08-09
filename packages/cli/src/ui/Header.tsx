import * as React from 'react'

import { Box, Color } from 'ink'

import StyledText from './StyledText'
import chalk from 'chalk';

export function Header() {
  return (
    <Box width="100%" marginBottom={1}>
      <Color bgWhite black>
      <StyledText width="full" paddingX={2} float="left">
        {`${chalk.blue('N&M\'s Dashboard')}       ${chalk.bold('my-app')}`}
      </StyledText>
      </Color>
    </Box>
  )
}

export default Header
