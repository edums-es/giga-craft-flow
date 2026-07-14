export function readableError(error: unknown, fallback = "Erro inesperado.") {
  if (!error) return fallback;
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (typeof error === "object") {
    const record = error as Record<string, unknown>;
    const parts = [record.message, record.details, record.hint, record.code]
      .filter(
        (part): part is string | number => typeof part === "string" || typeof part === "number",
      )
      .map(String);
    if (parts.length) return parts.join(" ");
  }
  return fallback;
}
