import express from 'express'

import { Provider, ProviderContext } from 'nnms'

@Provider('http', {})
export class HttpProvider {
  private _servers: { [port: string]: { name: string } }

  constructor(
    readonly ctx: ProviderContext<{}>
  ) { }

  async startServer(
    name: string,
    port: string,
    server: express.Application
  ): Promise<void> {
    await new Promise((resolve, reject) => {
      try {
        server.listen(port, () => {
          this._servers = {[port]: {name}}
          resolve()
        })
      } catch (err) {
        reject(err)
      }
    })
    this.ctx.logger.info('START_SERVER', {name, port}, {servers: {insert: [{name, port}]}})
  }

  onInit() {
    this.ctx.logger.info('RECAP', this._servers)
  }
}
