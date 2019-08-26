import React from 'react'

import { PageComponentProps } from './paging'
import { Box } from 'ink'

export function DebugPage(props: PageComponentProps): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Box flexDirection="column" margin={1}>DEBUG PAGE</Box>
      {['id', 'location', 'commandState'].map(key => (
        <Box key={key} flexDirection="column" margin={1}>
          <Box>{key}:</Box>
          <Box>{JSON.stringify(props[key as keyof PageComponentProps])}</Box>
        </Box>
      ))}
    </Box>
  )
}

export default DebugPage
