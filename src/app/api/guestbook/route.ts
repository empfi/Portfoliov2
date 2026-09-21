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

    const newEntry: GuestbookEntry = {
      id: Math.random().toString(36).substring(7),
      name: name.slice(0, 50),
      message: message.slice(0, 200),
      date: new Date().toISOString()
    };

    const db = await getDB();
    if (db) {
      await db.prepare("INSERT INTO entries (id, name, message, date) VALUES (?, ?, ?, ?)")
        .bind(newEntry.id, newEntry.name, newEntry.message, newEntry.date)
        .run();
    } else {
      memoryEntries.push(newEntry);
    }
    
    return NextResponse.json({ success: true, entry: newEntry });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
