import { ObjectId } from 'bson'
import { ErrorObject } from 'serialize-error';

export interface ApiRequest {
  id: ObjectId
  method: string
  // TODO - remove any assertion
  body: Record<string, any>
}

export interface ApiFailureResponse {
  reqId: ObjectId
  data?: never
  error: ErrorObject
}

export interface ApiSuccessResponse<T = {}> {
  reqId: ObjectId
  data: T
  error?: never
}

export type ApiResponse<T = {}> = ApiFailureResponse | ApiSuccessResponse<T>
