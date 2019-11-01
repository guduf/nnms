import { ObjectId, ValidatorError } from 'nnms'

export interface ApiRequest {
  id: ObjectId
  method: string
  // TODO - remove any assertion
  body: Record<string, any>
}

export interface ApiFailureResponse {
  reqId: ObjectId
  data?: never
  error: ValidatorError
}

export interface ApiSuccessResponse<T = {}> {
  reqId: ObjectId
  data: T
  error?: never
}

export type ApiResponse<T = {}> = ApiFailureResponse | ApiSuccessResponse<T>
