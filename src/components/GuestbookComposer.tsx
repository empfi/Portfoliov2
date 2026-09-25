"use client";

import { useSyncExternalStore } from 'react';
import { useFocus } from '@/context/FocusContext';
import { draft, useDraft, MAX_CHARS } from '@/context/GuestbookDraft';

const coarse = '(pointer: coarse)';
const subscribeCoarse = (cb: () => void) => {
  const mq = window.matchMedia(coarse);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};

/**
 * Plain DOM input bar for touch devices while the guestbook is open. Mobile browsers only
 * raise the keyboard for a real, tappable form field; what's typed mirrors onto the 3D page.
 * Desktop keeps typing straight onto the page, and only gets the status line.
 */
export default function GuestbookComposer() {
  const { focusedItem } = useFocus();
  const { text, status, sending } = useDraft();
  const isTouch = useSyncExternalStore(subscribeCoarse, () => window.matchMedia(coarse).matches, () => false);

  if (focusedItem !== 'guestbook') return null;

  const statusLine = status && (
    <p className="text-center text-sm text-[#f5f5f5] bg-[#171717]/90 border border-[#333] px-3 py-2 rounded-sm">{status}</p>
  );

  if (!isTouch) {
    return statusLine ? <div className="fixed z-50 bottom-6 left-1/2 -translate-x-1/2 max-w-[90vw]">{statusLine}</div> : null;
  }

  return (
    <form
      className="fixed z-50 left-3 right-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] flex flex-col gap-2"
      onSubmit={(e) => { e.preventDefault(); draft.requestSubmit(); }}
    >
      {statusLine}
      <div className="flex gap-2 bg-[#171717] border border-[#333] p-2 rounded-sm shadow-[6px_6px_0px_rgba(0,0,0,0.6)]">
        <input
          value={text}
          onChange={(e) => draft.setText(e.target.value)}
          maxLength={MAX_CHARS}
          placeholder="Sign the guestbook…"
          enterKeyHint="send"
          autoComplete="off"
          // 16px keeps iOS Safari from zooming the page on focus
          className="flex-1 min-w-0 bg-transparent text-[#f5f5f5] text-base px-2 outline-none placeholder:text-[#777]"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="shrink-0 border-2 border-[#f5f5f5] text-[#f5f5f5] font-mono font-bold uppercase tracking-widest text-xs px-3 py-2 disabled:opacity-40"
        >
          {sending ? '…' : 'Sign'}
        </button>
      </div>
      <p className="text-right text-[10px] font-mono text-[#888]">{text.length}/{MAX_CHARS}</p>
    </form>
  );
}
