import amber from '@material-ui/core/colors/amber'
import lightGreen from '@material-ui/core/colors/lightGreen'
import { ThemeOptions } from '@material-ui/core/styles/createMuiTheme'

export const fontFamily = '"Titillium Web", sans-serif'

export const primaryColor = amber
export const secondaryColor = lightGreen
export const space = 8

export const white = '#ffffff'

export const theme: ThemeOptions = {
  palette: {
    type: 'light',
    primary: primaryColor,
    secondary: primaryColor,
  },
  mixins: {
    toolbar: {minHeight: 7 * space}
  },
  spacing: space,
  breakpoints: {
    values: {xs: 320, sm: 640, md: 960, lg: 1280, xl: 1600}
  },
  typography: {
    fontFamily
  },
  overrides: {
    MuiInputAdornment: {
      root: {whiteSpace: 'nowrap'},
      positionStart: {marginRight: 0}
    }
  }
}

export default theme
