declare module "ink-table" {
  export interface TextTableProps<T> {
		data: T[]
    padding?: number
    header?: (props: {children: T[]}) => React.ReactElement
    cell?: (props: {children: T[]}) => React.ReactElement
    skeleton?: (props: {children: T[]}) => React.ReactElement
  }
  export function TextTable<T>(props: TextTableProps<T>): React.ReactElement
  export default TextTable
}
