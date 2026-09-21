import { pool } from "@/app/lib/auth";
import { readCached, writeCached } from "@/app/lib/account-cache";

// Spotify's whole OAuth cycle happens inside the desktop app, straight
// against Spotify's own endpoints (SpotifyNowPlayingService.cs) - this
// webapp never sees a token. This table is purely a status flag the desktop
// app reports so the account page can show whether Spotify is connected;
// disconnecting has to happen in the desktop app, since the token only ever
// exists there.

export type SpotifyStatus = { connected: boolean; updatedAt: string };

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
    CREATE TABLE IF NOT EXISTS clypdat_spotify_status (
      user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
      connected BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function setSpotifyConnected(userId: string, connected: boolean): Promise<void> {
  // The app reports on every launch, and almost always it is repeating what the
  // site already holds. Answered from the cache that costs no query, where it
  // used to be a write plus an expiry of everything cached for the account: the
  // sign-out state, the Xbox session, the linked providers. Neon woke for the
  // write, and the next poll then re-read all of those from a cold cache.
  if ((await getSpotifyStatus(userId)).connected === connected) return;
  await ensureSchema();
  await pool.query(
    `INSERT INTO clypdat_spotify_status (user_id, connected, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (user_id) DO UPDATE SET connected = EXCLUDED.connected, updated_at = NOW()`,
    [userId, connected],
  );
  // Only the Spotify entry depends on this row, so replace it rather than
  // expiring the account's whole cache. Functions run in a single region
  // (vercel.json pins syd1), so there is no other region's copy to go stale.
  await writeCached(userId, "spotify", { connected, updatedAt: new Date().toISOString() });
}

// Cached with the rest of the account (account-cache.ts); reporting a change
// replaces it immediately (setSpotifyConnected).
export async function getSpotifyStatus(userId: string): Promise<SpotifyStatus> {
  const cached = await readCached<SpotifyStatus>(userId, "spotify");
  if (cached) return cached;
  await ensureSchema();
  const result = await pool.query<{ connected: boolean; updated_at: Date }>(
    "SELECT connected, updated_at FROM clypdat_spotify_status WHERE user_id = $1",
    [userId],
  );
  const row = result.rows[0];
  const status: SpotifyStatus = row ? { connected: row.connected, updatedAt: row.updated_at.toISOString() } : { connected: false, updatedAt: new Date(0).toISOString() };
  await writeCached(userId, "spotify", status);
  return status;
}
