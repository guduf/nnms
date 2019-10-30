declare module "ajv-bsontype" {
  import ajv from 'ajv'
  export default function applyBsonTypes<T>(ajv: ajv.Ajv): void
}
