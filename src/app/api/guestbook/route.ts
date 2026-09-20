import { NextResponse } from 'next/server';
export const runtime = 'edge';

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
  if (process.env.NODE_ENV === 'production') {
    try {
      const { getCloudflareContext } = await import('@opennextjs/cloudflare');
      const ctx = getCloudflareContext();
      if (ctx && ctx.env && ctx.env.DB) {
        return ctx.env.DB as any;
      }
    } catch (e) {
      console.warn("Could not load Cloudflare DB context:", e);
    }
  }
  return null;
}

async function verifyTurnstile(token: string) {
  if (process.env.NODE_ENV !== 'production') return true;
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) return true; // Bypass if not configured yet
  
  const formData = new FormData();
  formData.append('secret', secret);
  formData.append('response', token);
  
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    return data.success;
  } catch (e) {
    return false;
  }
}

export async function GET() {
  const db = await getDB();
  
  if (db) {
    try {
      const { results } = await db.prepare("SELECT * FROM entries ORDER BY date DESC").all();
      return NextResponse.json({ entries: results });
    } catch (e) {
      console.error("DB error:", e);
    }
  }

  // Fallback
  const sorted = [...memoryEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return NextResponse.json({ entries: sorted });
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
