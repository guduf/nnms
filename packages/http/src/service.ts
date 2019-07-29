import express from 'express'
import { ProviderRef, ProviderContext } from 'nandms'

@ProviderRef({name: 'http'})
export class HttpProvider {
  private _servers: { [port: string]: { name: string } }

  constructor(
    readonly ctx: ProviderContext<{}>
  ) { }

  startServer(
    name: string,
    port: number,
    server: express.Application
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        server.listen(port, () => {
          this._servers = {[port]: {name}}
          resolve()
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  init() {
    this.ctx.logger.info('recap', this._servers)
  }
}
