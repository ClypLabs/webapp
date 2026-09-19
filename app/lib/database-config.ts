/** Prevent connection-string SSL options from disabling certificate checks. */
export function databaseConnectionString(value: string | undefined): string {
  if (!value) return "postgresql://localhost/clypdat";
  const url = new URL(value);
  url.searchParams.set("sslmode", "verify-full");
  return url.toString();
}
