// Shared error types (replaces Manus _core)
export const UNAUTHED_ERR_MSG = "UNAUTHORIZED";

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "AppError";
  }
}
