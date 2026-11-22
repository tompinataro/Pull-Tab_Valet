// Route diagnostics are optional: a broken logger must not block the response.
export function logRouteDiagnostic(message: string) {
  try {
    console.log(message);
  } catch {
    return;
  }
}
