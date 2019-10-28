import { RouteProps } from 'react-router'
import { DashboardPage } from './pages/DashboardPage'

export const ROUTES: (RouteProps & { path: string })[] = [
  {path: '/', component: DashboardPage}
]
