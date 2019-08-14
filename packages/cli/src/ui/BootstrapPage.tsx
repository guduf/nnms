import React from 'react'

import { Box } from 'ink'
import { useNNMS } from './context'
import { Redirect } from 'react-router';

export function BootstrapPage(): React.ReactElement {
  const {status} = useNNMS()
  const redir = React.useMemo(() => status === 'STARTED' ? '/dashboard' : null, [status])
  if (redir) return (<Redirect to={redir} />)
  return (
    <Box flexDirection="column" flexGrow={1}>
      {status}
    </Box>
  )
}

export default BootstrapPage
