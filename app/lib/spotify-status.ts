import { pool } from "@/app/lib/auth";
import { readCached, writeCached } from "@/app/lib/account-cache";

// Spotify's whole OAuth cycle happens inside the desktop app, straight
// against Spotify's own endpoints (SpotifyNowPlayingService.cs), and the app
// can also read Spotify with no sign-in at all from Windows' media controls -
// this webapp never sees a token. This table is a status flag the desktop app
// reports so the account page can show whether Spotify is connected, plus a
// disconnect request the account page can leave for the app: the token only
// exists on the PC, so the site cannot disconnect it itself. The app picks the
// request up on its next check-in, disconnects, and reports back, which clears
// it (setSpotifyConnected).

export type SpotifyStatus = {
  connected: boolean;
  updatedAt: string;
  // Set while a disconnect asked for on the account page has not yet been
  // carried out by the app. Absent in entries cached before it existed.
  disconnectRequestedAt?: string | null;
};

type StatusRow = { connected: boolean; updated_at: Date; connected_at: Date | null; disconnect_requested_at: Date | null };

const STATUS_COLUMNS = "connected, updated_at, connected_at, disconnect_requested_at";

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
  // Added with the account page's Disconnect. IF NOT EXISTS makes this a
  // no-op after the first request that runs it.
  await pool.query(`
    ALTER TABLE clypdat_spotify_status
      ADD COLUMN IF NOT EXISTS connected_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS disconnect_requested_at TIMESTAMPTZ
  `);
}

/**
 * A request is pending until the app connects again after it (the app
 * reconnecting wins) or reports itself disconnected (it did as asked).
 */
function toStatus(row: StatusRow | undefined): SpotifyStatus {
  if (!row) return { connected: false, updatedAt: new Date(0).toISOString(), disconnectRequestedAt: null };
  const requested = row.disconnect_requested_at;
  const pending = requested !== null && (row.connected_at === null || requested > row.connected_at);
  return {
    connected: row.connected,
    updatedAt: row.updated_at.toISOString(),
    disconnectRequestedAt: pending ? requested!.toISOString() : null,
  };
}

export async function setSpotifyConnected(userId: string, connected: boolean): Promise<void> {
  // The app reports on every launch, and almost always it is repeating what the
  // site already holds. Answered from the cache that costs no query, where it
  // used to be a write plus an expiry of everything cached for the account: the
  // sign-out state, the Xbox session, the linked providers. Neon woke for the
  // write, and the next poll then re-read all of those from a cold cache.
  // A pending disconnect is the exception: the app's "disconnected" is its
  // acknowledgement, and clearing the request needs the write.
  const current = await getSpotifyStatus(userId);
  if (current.connected === connected && !current.disconnectRequestedAt) return;
  await ensureSchema();
  // connected_at moves only on a real false-to-true change, so a request made
  // after the app last connected stays pending until it acts on it. Reporting
  // disconnected is that action, so it clears the request.
  const result = await pool.query<StatusRow>(
    `INSERT INTO clypdat_spotify_status (user_id, connected, updated_at, connected_at)
     VALUES ($1, $2, NOW(), CASE WHEN $2 THEN NOW() END)
     ON CONFLICT (user_id) DO UPDATE SET
       connected = EXCLUDED.connected,
       updated_at = NOW(),
       connected_at = CASE WHEN EXCLUDED.connected AND NOT clypdat_spotify_status.connected THEN NOW() ELSE clypdat_spotify_status.connected_at END,
       disconnect_requested_at = CASE WHEN EXCLUDED.connected THEN clypdat_spotify_status.disconnect_requested_at END
     RETURNING ${STATUS_COLUMNS}`,
    [userId, connected],
  );
  // Only the Spotify entry depends on this row, so replace it rather than
  // expiring the account's whole cache. Functions run in a single region
  // (vercel.json pins syd1), so there is no other region's copy to go stale.
  await writeCached(userId, "spotify", toStatus(result.rows[0]));
}

/**
 * The account page's Disconnect. The site shows Spotify as disconnected at
 * once; the app sees the request on its next check-in (the desktop activity
 * poll) and drops its own token.
 */
export async function requestSpotifyDisconnect(userId: string): Promise<SpotifyStatus> {
  await ensureSchema();
  const result = await pool.query<StatusRow>(
    `INSERT INTO clypdat_spotify_status (user_id, connected, updated_at, disconnect_requested_at)
     VALUES ($1, FALSE, NOW(), NOW())
     ON CONFLICT (user_id) DO UPDATE SET connected = FALSE, updated_at = NOW(), disconnect_requested_at = NOW()
     RETURNING ${STATUS_COLUMNS}`,
    [userId],
  );
  const status = toStatus(result.rows[0]);
  await writeCached(userId, "spotify", status);
  return status;
}

// Cached with the rest of the account (account-cache.ts); reporting a change
// replaces it immediately (setSpotifyConnected, requestSpotifyDisconnect).
export async function getSpotifyStatus(userId: string): Promise<SpotifyStatus> {
  const cached = await readCached<SpotifyStatus>(userId, "spotify");
  if (cached) return cached;
  await ensureSchema();
  const result = await pool.query<StatusRow>(
    `SELECT ${STATUS_COLUMNS} FROM clypdat_spotify_status WHERE user_id = $1`,
    [userId],
  );
  const status = toStatus(result.rows[0]);
  await writeCached(userId, "spotify", status);
  return status;
}
