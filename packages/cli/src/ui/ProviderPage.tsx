import React from 'react'

import { Box, Color, Text } from 'ink'

import LogList from './LogList'
import { useBoxWidth, wrapText } from './util'

export function ProviderPage({provider}: { provider: string }): React.ReactElement {
  const [boxRef, boxWidth] = useBoxWidth()
  return (
    <Box flexDirection="column" ref={boxRef} flexGrow={1}>
      <Text>
        <Color bgBlackBright>{wrapText(provider, boxWidth || 0)}</Color>
        {'\n'}
      </Text>
      <LogList filter={provider}/>
    </Box>
  )
}

export default ProviderPage
