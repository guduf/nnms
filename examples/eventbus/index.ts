import { ModuleRef, bootstrap } from 'nnms'
import { HttpRoute, HttpPlugin } from 'nnms-http'
import { EventbusHandler, EventbusPlugin, EventbusProxy } from 'nnms-nats'
import { randomBytes } from 'crypto'
import { Request } from 'express'

@ModuleRef('secret', {HTTP_PORT: '8081'}, EventbusPlugin, HttpPlugin)
export class SecretModule {
  readonly init: Promise<void>
  private _secrets = {} as { [id: string]: string }

  @HttpRoute({method: 'POST', path: '/secret', reqType: 'text'})
  storeSecret({body}: { body: string }): string {
    const id = randomBytes(16).toString('hex')
    this._secrets[id] = body
    return id
  }

  @EventbusHandler()
  decryptSecret(id: string): string {
    if (!this._secrets[id]) throw new Error('secret not found')
    const decrypted = this._decrypt(this._secrets[id])
    return decrypted
  }

  private _decrypt(encoded: string) {
    return (encoded).split('').map(char => {
      if (!char.match(/[A-Za-z]/)) return char
      const c = Math.floor(char.charCodeAt(0) / 97)
      const k = (char.toLowerCase().charCodeAt(0) - 83) % 26 || 26
      return String.fromCharCode(k + ((c == 0) ? 64 : 96))
    }).join('')
 }
}

export interface APIItem {
  id: string
  name: string
  secretId: string
}

@ModuleRef('api', {HTTP_PORT: '8082'}, HttpPlugin, EventbusPlugin)
export class APIModule {
  items: { [id: string]: { name: string, secretId: string }}

  constructor(
    @EventbusProxy()
    private _secretMod: SecretModule
  ) { }

  @HttpRoute({method: 'POST', path: '/items'})
  async createItem(req: Request): Promise<APIItem> {
    const item = req.body as Pick<APIItem, 'name' | 'secretId'>
    const id = randomBytes(16).toString('hex')
    const decrypted = await this._secretMod.decryptSecret(item.secretId)
    decrypted
    return {id, ...item}
  }
}

bootstrap(
  'eventbus-example',
  SecretModule,
  APIModule
)
