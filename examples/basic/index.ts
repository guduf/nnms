import { Request } from 'express'
import { Service } from 'typedi'
import { ModuleRef, ModuleContext } from 'nnms'
import { HttpRoute, HttpPlugin } from 'nnms-http'

export interface Todo {
  id: string
  text: string
  completed: boolean
}

const TODOS: { [id: string]: Todo} = {
  '5i3d04p0jkpc': {id: '5i3d04p0jkpc', text: 'Write the example', completed: true},
  'k2alg4i1bonb': {id: 'k2alg4i1bonb', text: 'Write the documentation', completed: false}
}

@Service()
export class TodoService {
  readonly _todos: Map<string, Todo>

  constructor() {
    const todos = new Map<string, Todo>()
    Object.keys(TODOS).forEach(id => todos.set(id, TODOS[id]))
    this._todos = todos
  }

  async list(): Promise<Todo[]> {
    return Array.from(this._todos.values())
  }

  async get({params: {id}}: Request): Promise<Todo | null> {
    return this._todos.get(id) || null
  }

  async add(text: string): Promise<Todo> {
    const todo: Todo = {id: Math.random().toString(26).slice(2), text, completed: false}
    this._todos.set(todo.id, todo)
    return todo
  }

  async complete({params: {id}}: Request): Promise<void> {
    const todo = this._todos.get(id)
    if (!todo) throw new Error(`Todo with id '${id}' not found`)
    todo.completed = true
  }
}

@ModuleRef('todo', {HTTP_PORT: '8080'}, HttpPlugin)
export class TodoModule {
  constructor(
    private readonly _ctx: ModuleContext,
    private readonly _todos: TodoService
  ) { }

  async init(): Promise<void> {
    this._ctx.logger.debug({initialList: await this._todos.list()})
  }

  @HttpRoute()
  list(): Promise<Todo[]> {
    return this._todos.list()
  }
}
