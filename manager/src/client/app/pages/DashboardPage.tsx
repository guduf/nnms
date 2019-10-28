import React from 'react'
import { useLogQuery } from '../api/useLogs'

export function DashboardPage() {
  const query = useLogQuery()
  return <pre>{JSON.stringify(query)}</pre>
}
