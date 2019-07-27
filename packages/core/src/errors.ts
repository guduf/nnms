export function checkObj<T = {}>(obj: T, ...keys: (keyof T)[]): void {
  if (!obj) throw new TypeError(`Missing obj`)
  for (const key of keys) if (
    !obj[key] &&
    (obj[key] as {}) !== 0 &&
    (obj[key] as {}) !== false
  ) throw new TypeError(`obj['${key}'] is undefined or null`)
}

export class ErrorWithCatch extends Error {
  constructor(message: string, readonly catched?: Error) {
    super(message)
    Object.setPrototypeOf(this, ErrorWithCatch.prototype)
  }
}
