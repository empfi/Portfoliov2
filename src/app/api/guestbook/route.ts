import { NextResponse } from 'next/server';
export const runtime = 'nodejs';

export interface GuestbookEntry {
  id: string;
  name: string;
  message: string;
  date: string;
}

// In-memory fallback
let memoryEntries: GuestbookEntry[] = [
  { id: '1', name: 'Giuli', message: 'Welcome to my desk!', date: new Date().toISOString() }
];

async function getDB() {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    const env = ctx?.env as any;
    if (env && env.DB) {
      return env.DB;
    }
  } catch (e) {
    console.warn("Could not load Cloudflare DB context:", e);
  }
  return null;
}

// ── One entry per visitor per 24h ───────────────────────────────────────────
// Keyed on a salted SHA-256 of the client IP, so raw IPs are never stored.
const DAY_MS = 24 * 60 * 60 * 1000;
const memoryLastPost = new Map<string, number>();

async function visitorKey(req: Request) {
  const ip = req.headers.get('cf-connecting-ip')
    || req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || 'unknown';
  const data = new TextEncoder().encode(`portfolio-guestbook:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Atomically claims today's slot for this visitor. Returns ms until they may post again,
 * or 0 if the slot was claimed (i.e. they may post now).
 */
type DB = Awaited<ReturnType<typeof getDB>>;

async function claimDailySlot(db: DB, key: string): Promise<number> {
  const now = Date.now();
  if (!db) {
    const last = memoryLastPost.get(key) ?? 0;
    if (now - last < DAY_MS) return DAY_MS - (now - last);
    memoryLastPost.set(key, now);
    return 0;
  }
  await db.prepare('CREATE TABLE IF NOT EXISTS post_limits (visitor TEXT PRIMARY KEY, last_post INTEGER NOT NULL)').run();
  // Single statement so two simultaneous submits can't both get through:
  // insert, or overwrite only if the previous post is older than a day.
  const res = await db.prepare(
    `INSERT INTO post_limits (visitor, last_post) VALUES (?1, ?2)
     ON CONFLICT(visitor) DO UPDATE SET last_post = excluded.last_post
     WHERE post_limits.last_post <= ?2 - ?3`
  ).bind(key, now, DAY_MS).run();
  if (res.meta?.changes) return 0;
  const row = await db.prepare('SELECT last_post FROM post_limits WHERE visitor = ?').bind(key).first();
  return Math.max(1, DAY_MS - (now - Number(row?.last_post ?? now)));
}

async function releaseDailySlot(db: DB, key: string) {
  if (db) await db.prepare('DELETE FROM post_limits WHERE visitor = ?').bind(key).run();
  else memoryLastPost.delete(key);
}

async function verifyTurnstile(token: string | null) {
  // Get the secret from Cloudflare Worker env (not process.env)
  let secret: string | undefined;
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = await getCloudflareContext({ async: true });
    secret = (ctx?.env as any)?.TURNSTILE_SECRET;
  } catch {
    secret = process.env.TURNSTILE_SECRET; // local dev fallback
  }

  console.log('[Turnstile] secret found:', !!secret, '| secret length:', secret?.length ?? 0);

  // No secret configured → bypass (not set up yet)
  if (!secret) return true;
  // Secret is configured but no token → reject
  if (!token) return false;

  const formData = new FormData();
  formData.append('secret', secret);
  formData.append('response', token);
  
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    console.log('[Turnstile] siteverify response:', JSON.stringify(data));
    return data.success;
  } catch (e) {
    console.error('[Turnstile] fetch error:', e);
    return false;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '8', 10)));
  const offset = (page - 1) * limit;

  const db = await getDB();
  
  if (db) {
    try {
      const countRow = await db.prepare("SELECT count(*) as total FROM entries").first<{ total: number }>();
      const total = countRow?.total ?? 0;
      const totalPages = Math.max(1, Math.ceil(total / limit));

      const { results } = await db.prepare("SELECT * FROM entries ORDER BY date DESC LIMIT ? OFFSET ?")
        .bind(limit, offset)
        .all();

      return NextResponse.json({
        entries: results || [],
        page,
        limit,
        total,
        totalPages
      });
    } catch (e) {
      console.error("DB error:", e);
    }
  }

  // Fallback
  const total = memoryEntries.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const sorted = [...memoryEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const paginated = sorted.slice(offset, offset + limit);

  return NextResponse.json({
    entries: paginated,
    page,
    limit,
    total,
    totalPages
  });
}

export async function POST(req: Request) {
  try {
    const { name, message, token } = await req.json();
    
    if (!name || !message) {
      return NextResponse.json({ error: 'Name and message are required' }, { status: 400 });
    }

    if (process.env.NODE_ENV === 'production') {
      const isValid = await verifyTurnstile(token);
      if (!isValid) {
        return NextResponse.json({ error: 'Turnstile verification failed' }, { status: 403 });
      }
    }

    const db = await getDB();
    const key = await visitorKey(req);
    const waitMs = await claimDailySlot(db, key);
    if (waitMs > 0) {
      const hours = Math.ceil(waitMs / (60 * 60 * 1000));
      return NextResponse.json(
        { error: `You can sign the guestbook once a day. Try again in ${hours} hour${hours === 1 ? '' : 's'}.` },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(waitMs / 1000)) } },
      );
    }

    const newEntry: GuestbookEntry = {
      id: Math.random().toString(36).substring(7),
      name: name.slice(0, 50),
      message: String(message).trim().slice(0, 100),
      date: new Date().toISOString()
    };

    try {
      if (db) {
        await db.prepare("INSERT INTO entries (id, name, message, date) VALUES (?, ?, ?, ?)")
          .bind(newEntry.id, newEntry.name, newEntry.message, newEntry.date)
          .run();
      } else {
        memoryEntries.push(newEntry);
      }
    } catch (e) {
      // Don't burn the visitor's daily slot on our own failure
      await releaseDailySlot(db, key);
      throw e;
    }

    return NextResponse.json({ success: true, entry: newEntry });
  } catch (err) {
    console.error('[guestbook] POST failed:', err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
