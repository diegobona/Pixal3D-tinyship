export class Pixal3DGenerationStatusUnknownError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Pixal3DGenerationStatusUnknownError";
  }
}

export function isPixal3DGenerationStatusUnknownError(
  error: unknown
): error is Pixal3DGenerationStatusUnknownError {
  return error instanceof Pixal3DGenerationStatusUnknownError;
}
