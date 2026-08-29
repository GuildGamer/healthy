export type Result<T, E = { message: string }> =
  | { success: true; data: T }
  | { success: false; error: E };
