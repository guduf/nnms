import { ModuleRef, ModuleContext } from 'nnms'
import { HttpRoute, HttpPlugin } from 'nnms-http'

import TodoProvider, { Todo } from './todo'

export const API_VARS = {
  HTTP_PORT: '8080'
}

@ModuleRef('api', API_VARS, HttpPlugin)
export class ApiModule {
  constructor(
    private readonly _ctx: ModuleContext<typeof API_VARS>,
    private readonly _todos: TodoProvider
  ) { }

  async init(): Promise<void> {
    this._ctx.logger.debug({initialList: await this._todos.list()})
  }

  @HttpRoute()
  async list(): Promise<Todo[]> {
    const todos = await this._todos.list()
    this._ctx.logger.info('GET_LIST', {length: todos.length})
    return todos
  }
}
