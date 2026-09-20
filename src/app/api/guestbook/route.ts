import { NextResponse } from 'next/server';
export const runtime = 'edge';

export interface GuestbookEntry {
  id: string;
  name: string;
  message: string;
  date: string;
}

// In-memory store (resets on server restart)
let entries: GuestbookEntry[] = [
  { id: '1', name: 'Giuli', message: 'Welcome to my desk!', date: new Date().toISOString() }
];

export async function GET() {
  // Return entries sorted by newest first
  const sorted = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return NextResponse.json({ entries: sorted });
}

export async function POST(req: Request) {
  try {
    const { name, message } = await req.json();
    
    if (!name || !message) {
      return NextResponse.json({ error: 'Name and message are required' }, { status: 400 });
    }

    const newEntry: GuestbookEntry = {
      id: Math.random().toString(36).substring(7),
      name: name.slice(0, 50),
      message: message.slice(0, 200),
      date: new Date().toISOString()
    };

    entries.push(newEntry);
    
    return NextResponse.json({ success: true, entry: newEntry });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
