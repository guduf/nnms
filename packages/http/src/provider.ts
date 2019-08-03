import express from 'express'
import { ProviderRef, ProviderContext } from 'nnms'
import { Service } from 'typedi'

@Service({global: true})
@ProviderRef('http')
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
    this.ctx.logger.debug('start server', {name, port})
  }

  onInit() {
    this.ctx.logger.info('recap', this._servers)
  }
}
