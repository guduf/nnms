import * as React from 'react'

import { Box, Color, Text } from 'ink'

import { useBoxWidth, wrapText } from './util'

export function Header() {
  const [ref, width] = useBoxWidth()
  return (
    <Box ref={ref} width="100%" marginBottom={1}>
      <Color bgWhite black>
        <Text>{wrapText(wrapText('N&M\'s CLI', 24, 'left', 0) + 'title' , width || 0)}</Text>
      </Color>
    </Box>
  )
}

export default Header
