declare module "ink-table" {
  export interface TextTableProps<T> {
		data: T[]
    padding?: number
    header?: (props: {children: string[]}) => React.ReactNode
    cell?: (props: {children: string[]}) => React.ReactNode
    skeleton?: (props: {children: string[]}) => React.ReactNode
  }
  export function TextTable<T>(props: TextTableProps<T>): React.ReactElement
  export default TextTable
}
