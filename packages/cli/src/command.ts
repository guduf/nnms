import { Argv, Arguments } from 'yargs'

export default interface Command<T = {}> {
  schema: string
  descr: string
  argv: (yargs: Argv) => Argv<T>
  cmd: (cmd: Arguments<T>) => void
}
