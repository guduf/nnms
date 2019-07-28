import { Service } from 'typedi'
import { ModuleRef, ModuleContext, bootstrap } from 'nandms'

export interface Todo {
  id: string
  text: string
  completed: boolean
}

const TODOS: { [id: string]: Todo} = {
  '5i3d04p0jkpc': {id: 'k2alg4i1bonb', text: 'Write the example', completed: true},
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

  list(): Todo[] { return Array.from(this._todos.values())}
  get(id: string): Todo | null { return this._todos.get(id) || null }
  add(text: string): Todo {
    const todo: Todo = {id: Math.random().toString(26).slice(2), text, completed: false}
    this._todos.set(todo.id, todo)
    return todo
  }
  complete(id: string): void {
    const todo = this._todos.get(id)
    if (!todo) throw new Error(`Todo with id '${id}' not found`)
    todo.completed = true
  }
}

@ModuleRef({name: 'todo', vars: {}})
export class TodoModule {
  constructor(ctx: ModuleContext, todos: TodoService) {
    ctx.log.info('Initial todos list', {items: todos.list()})
  }
}

bootstrap({name: 'basic-example'}, TodoModule)
