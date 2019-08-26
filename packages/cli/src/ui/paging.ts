
import ResourceBrowserPage from './ResourceBrowserPage'
import DebugPage from './DebugPage'
import { Location } from 'history'
import { CommandInputState } from './command'
import ModulePage from './ModulePage'

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
  {
    path: 'MODULES',
    component: ResourceBrowserPage,
    children: [
      {
        path: ':id',
        component: ModulePage,
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
        component: DebugPage,
        children: [
          {path: 'PLUGINS', component: DebugPage},
          {path: 'LOG', component: DebugPage}
        ]
      }
    ]
  }
]
