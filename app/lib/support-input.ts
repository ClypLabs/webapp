export const MAX_BUNDLE_BYTES = 3 * 1024 * 1024;
export const MAX_SUPPORT_REQUEST_BYTES = MAX_BUNDLE_BYTES + 16 * 1024;
export const REPORT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SupportInput = { id: string; message: string; version: string; build: string; bundle: Buffer };

export class SupportInputError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

// Read with a hard cap even when Content-Length is missing or forged.
export async function readSupportInput(request: Request): Promise<SupportInput> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("multipart/form-data;")) throw new SupportInputError("Expected a diagnostic bundle", 415);
  const length = Number(request.headers.get("content-length"));
  if (length > MAX_SUPPORT_REQUEST_BYTES) throw new SupportInputError("Diagnostic bundle is too large", 413);
  if (!request.body) throw new SupportInputError("Diagnostic bundle is missing");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_SUPPORT_REQUEST_BYTES) {
        await reader.cancel();
        throw new SupportInputError("Diagnostic bundle is too large", 413);
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  let form: FormData;
  try { form = await new Response(Buffer.concat(chunks), { headers: { "Content-Type": type } }).formData(); }
  catch { throw new SupportInputError("Invalid diagnostic upload"); }
  const id = form.get("id");
  const message = form.get("message");
  const version = form.get("version");
  const build = form.get("build");
  const file = form.get("bundle");
  if (typeof id !== "string" || !REPORT_ID.test(id)) throw new SupportInputError("Invalid report ID");
  if (typeof message !== "string" || message.trim().length < 10 || message.length > 2000) throw new SupportInputError("Describe the issue in 10 to 2000 characters");
  if (typeof version !== "string" || !/^\d{1,5}\.\d{1,5}\.\d{1,5}(?:\.\d{1,5})?$/.test(version)) throw new SupportInputError("Invalid app version");
  if (typeof build !== "string" || !/^[a-zA-Z0-9.+_-]{1,128}$/.test(build)) throw new SupportInputError("Invalid build");
  if (!(file instanceof Blob) || file.size < 22 || file.size > MAX_BUNDLE_BYTES) throw new SupportInputError("Bundle must be a ZIP under 3 MiB", 413);
  const bundle = Buffer.from(await file.arrayBuffer());
  if (bundle.readUInt32LE(0) !== 0x04034b50) throw new SupportInputError("Invalid ZIP bundle");
  return { id: id.toLowerCase(), message: message.trim(), version, build, bundle };
}
