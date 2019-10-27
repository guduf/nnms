import WebSocket, { Server as WebSocketServer } from 'ws'
import { Config } from './config'
import { Observable } from 'rxjs'
import { Log } from 'nnms'
import { scan, shareReplay, first } from 'rxjs/operators'
import { serialize } from 'bson'

const LOG_MEMORY_LENGTH = 1000

export class LogServer extends WebSocketServer {
  constructor(
    stream: Observable<Log>,
    cfg?: Config['container']['logServer']
  ) {
    const port = cfg && cfg.port || 6390
    console.log(`📪  listen on ${port} to stream logs`)
    super({port})
    this._previousLogs = stream.pipe(
      scan((previous, log) => this._handleLog(previous, log), [] as Buffer[]),
      shareReplay(1)
    )
    this._previousLogs.subscribe()
    this.on('connection', socket => this._handleConnection(socket))
  }

  private readonly _previousLogs: Observable<Buffer[]>

  private async _handleConnection(socket: WebSocket): Promise<void> {
    console.log('📬  log socket incoming')
    const previousLogs = await this._previousLogs.pipe(first()).toPromise()
    socket.send(serialize(previousLogs))
  }

  private _handleLog(previous: Buffer[], log: Log): Buffer[] {
    const buf = log.serialize()
    this.clients.forEach(client => client.send(buf))
    return [...previous.slice(-LOG_MEMORY_LENGTH + 1), buf]
  }
}

export function logSocket(url: string): Observable<Log> {
  return new Observable(observer => {
    const ws = new WebSocket(url)
    ws.on('message', msg => {
      console.log(msg)
      observer.next('LOG HERE' as never)
    })
    return () => ws.close(0)
  })
}
