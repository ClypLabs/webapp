import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { pool } from "@/app/lib/auth";

export const XBOX_OAUTH_COOKIE = "clypdat_xbox_oauth";
const XBOX_SCOPE = "XboxLive.signin XboxLive.offline_access";
const MICROSOFT_AUTHORIZE = "https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize";
const MICROSOFT_TOKEN = "https://login.microsoftonline.com/consumers/oauth2/v2.0/token";
const TOKEN_VERSION = "v1";

type OAuthState = { state: string; verifier: string; issuedAt: number };

export type XboxAccount = {
  gamertag: string | null;
  xuid: string | null;
  consoleName: string | null;
  updatedAt: string;
};

export type XboxActivity = {
  title: string | null;
  consoleName: string | null;
  updatedAt: string;
};

type XboxCredentials = {
  refreshToken: string;
  userHash: string;
  xstsToken: string;
  expiresAt: Date;
  xuid: string | null;
  gamertag: string | null;
};

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function base64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

function authSecret(): string {
  return required("BETTER_AUTH_SECRET");
}

function redirectUri(): string {
  return process.env.XBOX_REDIRECT_URI ?? `${(process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "")}/api/xbox/callback`;
}

function encryptionKey(): Buffer {
  return createHash("sha256").update(authSecret()).digest();
}

function sign(value: string): string {
  return createHmac("sha256", authSecret()).update(value).digest("base64url");
}

export function createXboxAuthorization() {
  const state: OAuthState = {
    state: base64Url(randomBytes(24)),
    verifier: base64Url(randomBytes(32)),
    issuedAt: Date.now(),
  };
  const payload = Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
  const cookieValue = `${payload}.${sign(payload)}`;
  const challenge = base64Url(createHash("sha256").update(state.verifier).digest());
  const params = new URLSearchParams({
    client_id: required("XBOX_CLIENT_ID"),
    response_type: "code",
    redirect_uri: redirectUri(),
    response_mode: "query",
    scope: XBOX_SCOPE,
    state: state.state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  return { url: `${MICROSOFT_AUTHORIZE}?${params.toString()}`, cookieValue };
}

export function readXboxAuthorization(value: string | undefined): OAuthState | null {
  if (!value) return null;
  const separator = value.lastIndexOf(".");
  if (separator <= 0) return null;
  const payload = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  const expected = sign(payload);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const state = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as OAuthState;
    if (!state.state || !state.verifier || Date.now() - state.issuedAt > 10 * 60 * 1000) return null;
    return state;
  } catch {
    return null;
  }
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const body = await response.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(body) as Record<string, unknown>;
  } catch {
    // Keep provider errors generic; never reflect token response bodies.
  }
  if (!response.ok) {
    const code = typeof json.error === "string" ? json.error : `HTTP_${response.status}`;
    throw new Error(`Xbox provider rejected the request (${code})`);
  }
  return json;
}

async function exchangeMicrosoftCode(code: string, verifier: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const form = new URLSearchParams({
    client_id: required("XBOX_CLIENT_ID"),
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(),
    code_verifier: verifier,
    scope: XBOX_SCOPE,
  });
  const clientSecret = process.env.XBOX_CLIENT_SECRET;
  if (clientSecret) form.set("client_secret", clientSecret);
  const response = await fetch(MICROSOFT_TOKEN, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form,
    cache: "no-store",
  });
  const json = await readJson(response);
  const accessToken = typeof json.access_token === "string" ? json.access_token : "";
  const refreshToken = typeof json.refresh_token === "string" ? json.refresh_token : "";
  const expiresIn = typeof json.expires_in === "number" ? json.expires_in : 3600;
  if (!accessToken || !refreshToken) throw new Error("Microsoft sign-in returned incomplete tokens");
  return { accessToken, refreshToken, expiresIn };
}

async function refreshMicrosoftToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const form = new URLSearchParams({
    client_id: required("XBOX_CLIENT_ID"),
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: XBOX_SCOPE,
  });
  const clientSecret = process.env.XBOX_CLIENT_SECRET;
  if (clientSecret) form.set("client_secret", clientSecret);
  const response = await fetch(MICROSOFT_TOKEN, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form,
    cache: "no-store",
  });
  const json = await readJson(response);
  const accessToken = typeof json.access_token === "string" ? json.access_token : "";
  const nextRefreshToken = typeof json.refresh_token === "string" ? json.refresh_token : refreshToken;
  const expiresIn = typeof json.expires_in === "number" ? json.expires_in : 3600;
  if (!accessToken) throw new Error("Microsoft refresh returned no access token");
  return { accessToken, refreshToken: nextRefreshToken, expiresIn };
}

async function xboxPost(uri: string, payload: unknown): Promise<Record<string, unknown>> {
  const response = await fetch(uri, {
    method: "POST",
    headers: { "content-type": "application/json", "x-xbl-contract-version": "1", accept: "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  return readJson(response);
}

async function exchangeXboxTokens(accessToken: string, refreshToken: string, expiresIn: number): Promise<XboxCredentials> {
  const user = await xboxPost("https://user.auth.xboxlive.com/user/authenticate", {
    Properties: { AuthMethod: "RPS", SiteName: "user.auth.xboxlive.com", RpsTicket: `d=${accessToken}` },
    RelyingParty: "http://auth.xboxlive.com",
    TokenType: "JWT",
  });
  const userToken = typeof user.Token === "string" ? user.Token : "";
  if (!userToken) throw new Error("Xbox user authentication returned no token");

  const xsts = await xboxPost("https://xsts.auth.xboxlive.com/xsts/authorize", {
    Properties: { SandboxId: "RETAIL", UserTokens: [userToken] },
    RelyingParty: "http://xboxlive.com",
    TokenType: "JWT",
  });
  const xstsToken = typeof xsts.Token === "string" ? xsts.Token : "";
  const claims = xsts.DisplayClaims as { xui?: Array<{ uhs?: string; xuid?: string }> } | undefined;
  const xui = claims?.xui?.[0];
  if (!xstsToken || !xui?.uhs) throw new Error("Xbox authorization returned incomplete claims");

  const credentials: XboxCredentials = {
    refreshToken,
    userHash: xui.uhs,
    xstsToken,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
    xuid: xui.xuid ?? null,
    gamertag: null,
  };
  credentials.gamertag = await fetchGamertag(credentials);
  return credentials;
}

function xboxAuthorization(credentials: Pick<XboxCredentials, "userHash" | "xstsToken">): string {
  return `XBL3.0 x=${credentials.userHash};${credentials.xstsToken}`;
}

async function fetchGamertag(credentials: Pick<XboxCredentials, "userHash" | "xstsToken">): Promise<string | null> {
  const response = await fetch("https://profile.xboxlive.com/users/me/profile/settings?settings=Gamertag", {
    headers: {
      Authorization: xboxAuthorization(credentials),
      "x-xbl-contract-version": "2",
      accept: "application/json",
    },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const json = (await response.json()) as { profileUsers?: Array<{ settings?: Array<{ id?: string; value?: string }> }> };
  const setting = json.profileUsers?.[0]?.settings?.find((item) => item.id?.toLowerCase() === "gamertag");
  return setting?.value?.trim() || null;
}

export async function connectXbox(code: string, verifier: string): Promise<XboxCredentials> {
  const oauth = await exchangeMicrosoftCode(code, verifier);
  return exchangeXboxTokens(oauth.accessToken, oauth.refreshToken, oauth.expiresIn);
}

// Every Xbox read used to re-issue this DDL, adding a full round trip to the
// database in front of the query the caller actually wanted. The table only
// needs creating once per process, so the first call is the one that pays for
// it; a failure clears the memo so the next call retries rather than inheriting
// a broken schema promise forever.
let schemaReady: Promise<void> | null = null;

function ensureSchema(): Promise<void> {
  schemaReady ??= createSchema().catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

async function createSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clypdat_xbox_account (
      user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
      gamertag TEXT,
      xuid TEXT,
      console_name TEXT,
      refresh_token TEXT NOT NULL,
      token_expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

function encrypt(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [TOKEN_VERSION, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

function decrypt(value: string): string {
  const [version, ivEncoded, tagEncoded, ciphertextEncoded] = value.split(".");
  if (version !== TOKEN_VERSION || !ivEncoded || !tagEncoded || !ciphertextEncoded) throw new Error("Invalid Xbox token");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivEncoded, "base64url"));
  decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextEncoded, "base64url")), decipher.final()]).toString("utf8");
}

export async function saveXboxAccount(userId: string, credentials: XboxCredentials): Promise<void> {
  await ensureSchema();
  await pool.query(
    `INSERT INTO clypdat_xbox_account (user_id, gamertag, xuid, refresh_token, token_expires_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id) DO UPDATE SET gamertag = EXCLUDED.gamertag, xuid = EXCLUDED.xuid,
       refresh_token = EXCLUDED.refresh_token, token_expires_at = EXCLUDED.token_expires_at, updated_at = NOW()`,
    [userId, credentials.gamertag, credentials.xuid, encrypt(credentials.refreshToken), credentials.expiresAt],
  );
}

export async function getXboxAccount(userId: string): Promise<XboxAccount | null> {
  await ensureSchema();
  const result = await pool.query<{ gamertag: string | null; xuid: string | null; console_name: string | null; updated_at: Date }>(
    "SELECT gamertag, xuid, console_name, updated_at FROM clypdat_xbox_account WHERE user_id = $1",
    [userId],
  );
  const row = result.rows[0];
  return row ? { gamertag: row.gamertag, xuid: row.xuid, consoleName: row.console_name, updatedAt: row.updated_at.toISOString() } : null;
}

export async function deleteXboxAccount(userId: string): Promise<void> {
  await ensureSchema();
  await pool.query("DELETE FROM clypdat_xbox_account WHERE user_id = $1", [userId]);
}

async function loadCredentials(userId: string): Promise<{ credentials: XboxCredentials; row: { refresh_token: string } } | null> {
  await ensureSchema();
  const result = await pool.query<{ gamertag: string | null; xuid: string | null; refresh_token: string; token_expires_at: Date }>(
    "SELECT gamertag, xuid, refresh_token, token_expires_at FROM clypdat_xbox_account WHERE user_id = $1",
    [userId],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    row,
    credentials: {
      refreshToken: decrypt(row.refresh_token),
      userHash: "",
      xstsToken: "",
      expiresAt: row.token_expires_at,
      xuid: row.xuid,
      gamertag: row.gamertag,
    },
  };
}

function consoleLabel(type: string | undefined): string | null {
  switch (type?.toUpperCase()) {
    case "XBOXONE":
    case "XBOXONE-S":
    case "XBOXONE-X":
      return "Xbox One";
    case "SCARLETT":
    case "XBOX-SERIES":
    case "XBOX-SERIES-X":
      return "Series X|S";
    case "XBOX360":
      return "Xbox 360";
    case "PC":
    case "WIN32":
    case "WINDOWS8":
    case "WINDOWSONECORE":
    case "WEB":
    case "IOS":
    case "ANDROID":
    case "NINTENDO":
    case "PLAYSTATION":
      return null;
    default:
      return "Xbox";
  }
}

async function fetchActivity(credentials: XboxCredentials): Promise<XboxActivity> {
  const response = await fetch("https://userpresence.xboxlive.com/users/me?level=title", {
    headers: {
      Authorization: xboxAuthorization(credentials),
      "x-xbl-contract-version": "3",
      "Accept-Language": "en-US",
      accept: "application/json",
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Xbox presence rejected the request (${response.status})`);
  const json = (await response.json()) as { devices?: Array<{ type?: string; titles?: Array<{ name?: string; state?: string; timestamp?: string }> }> };
  let title: string | null = null;
  let consoleName: string | null = null;
  let newest = 0;
  for (const device of json.devices ?? []) {
    const label = consoleLabel(device.type);
    if (!label) continue;
    for (const entry of device.titles ?? []) {
      if (entry.state?.toLowerCase() !== "active" || !entry.name) continue;
      const titleName = entry.name.trim();
      if (!titleName || isSystemTitle(titleName)) continue;
      const timestamp = entry.timestamp ? Date.parse(entry.timestamp) : 0;
      if (timestamp >= newest) {
        newest = timestamp;
        title = titleName;
        consoleName = label;
      }
    }
  }
  return { title, consoleName, updatedAt: new Date().toISOString() };
}

function isSystemTitle(title: string): boolean {
  return ["Home", "Xbox Home", "Xbox Dashboard", "Xbox Guide"].includes(title);
}

export async function getXboxActivity(userId: string): Promise<XboxActivity | null> {
  const loaded = await loadCredentials(userId);
  if (!loaded) return null;
  let credentials = loaded.credentials;
  // Xbox presence requires a short-lived XSTS token. Re-issue it on each
  // activity request while keeping only the encrypted Microsoft refresh token.
  const oauth = await refreshMicrosoftToken(credentials.refreshToken);
  credentials = await exchangeXboxTokens(oauth.accessToken, oauth.refreshToken, oauth.expiresIn);
  await saveXboxAccount(userId, credentials);
  const activity = await fetchActivity(credentials);
  await pool.query("UPDATE clypdat_xbox_account SET console_name = $2, updated_at = NOW() WHERE user_id = $1", [userId, activity.consoleName]);
  return activity;
}
