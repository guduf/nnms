import { Module, ModuleContext } from 'nnms'
import { HttpRoute, HttpPlugin } from 'nnms-common'

import TodoProvider, { Todo } from './todo'
import { JsonArray } from 'type-fest'

export const API_VARS = {
  HTTP_PORT: '8080'
}

@Module('api', API_VARS, HttpPlugin)
export class ApiModule {
  constructor(
    private readonly _ctx: ModuleContext<typeof API_VARS>,
    private readonly _todos: TodoProvider
  ) { }

  async init(): Promise<void> {
    this._ctx.logger.debug({initialList: await this._todos.list() as unknown as JsonArray})
  }

  @HttpRoute('/')
  async list(): Promise<Todo[]> {
    const todos = await this._todos.list()
    this._ctx.logger.info('GET_LIST', {length: todos.length})
    return todos
  }
}
