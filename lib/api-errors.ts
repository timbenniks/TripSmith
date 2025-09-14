export type ApiErrorCode =
  | 'NO_SESSION'
  | 'NOT_OWNER'
  | 'NOT_FOUND'
  | 'INVALID_INPUT'
  | 'SERVER_ERROR';

export function jsonError(code: ApiErrorCode, message: string, status: number) {
  return Response.json({ code, message }, { status });
}

export function jsonOk<T extends Record<string, any>>(data: T, status = 200) {
  return Response.json(data, { status });
}
