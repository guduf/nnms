import * as React from 'react'

import CssBaseline from '@material-ui/core/CssBaseline'
import { createMuiTheme } from '@material-ui/core/styles'
import { ThemeProvider, createStyles, makeStyles } from '@material-ui/styles'
import { Switch, Route } from 'react-router-dom'

import theme from './theme'
import { ROUTES } from './routes'

const useStyles = makeStyles(() => (
  createStyles({
    reset: {
      '& a': {
        textDecoration: 'none',

        '&:visited': {
          color: 'inherit'
        }
      }
    }
  })
))

const muiTheme = createMuiTheme(theme)

export function AppLayout(): React.ReactElement {
  const classes = useStyles()

  return (
    <>
      <CssBaseline />
      <div className={classes.reset}>
        <ThemeProvider theme={muiTheme}>
          <Switch>
            {ROUTES.map(route => (
              <Route key={route.path} path={route.path} component={route.component} />
            ))}
          </Switch>
        </ThemeProvider>
      </div>
    </>
  )
}

export default AppLayout
