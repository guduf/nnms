
import ResourceBrowserPage from './ResourceBrowserPage'
import ResourceExplorerPage from './ResourceExplorerPage'
import DebugPage from './DebugPage'
import { Location } from 'history'
import { CommandInputState } from './command'
import DashboardPage from './DashboardPage'

export interface PageComponentProps {
  id?: string
  location: Location
  attachTextHandler: (handler: (entry: string) => boolean, entries: string[] | RegExp) => void
  detachTextHandler: (handler: (entry: string) => boolean) => void
  commandState: CommandInputState
}

export interface PageConfig {
  path: string
  component: (props: PageComponentProps) => React.ReactElement
  children?: PageConfig[]
  search?: { [key: string]: string[] | RegExp }
}

export const PAGE_CONFIGS: PageConfig[] = [
  {path: 'DASHBOARD', component: DashboardPage},
  {
    path: 'MODULES',
    component: ResourceBrowserPage,
    children: [
      {
        path: ':id',
        component: ResourceExplorerPage,
        children: [
          {path: 'PLUGINS', component: DebugPage},
          {path: 'LOG', component: DebugPage}
        ]
      }
    ]
  },
  {
    path: 'PROVIDERS',
    component: ResourceBrowserPage,
    children: [
      {
        path: ':id',
        component: ResourceExplorerPage,
        children: [
          {path: 'PLUGINS', component: DebugPage},
          {path: 'LOG', component: DebugPage}
        ]
      }
    ]
  },
  {
    path: 'PLUGINS',
    component: ResourceBrowserPage,
    children: [
      {
        path: ':id',
        component: ResourceExplorerPage
      }
    ]
  }
]
