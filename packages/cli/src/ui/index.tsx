import React from 'react'

import SubjectTransport from '../subject_transport'
import { NNMSContextProvider } from './context'
import Layout from './layout'

export interface NNMSUIProps {
  transport: SubjectTransport,
}

export function NNMSUI({transport}: NNMSUIProps): React.ReactElement {
  return (
    <NNMSContextProvider transport={transport}>
      <Layout />
    </NNMSContextProvider>
  )
}

export default NNMSUI
