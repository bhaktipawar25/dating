"use client";

import React from "react";
import { ProfileAvatar } from "../ProfileAvatar";

export interface IncomingCallData {
  callId: string;
  conversationId: string;
  callerId: string;
  callerName: string;
  callerPhotoUrl?: string;
}

interface IncomingCallPromptProps {
  call: IncomingCallData | null;
  busy?: boolean;
  onAccept: (call: IncomingCallData) => void;
  onDecline: (call: IncomingCallData) => void;
}

export function IncomingCallPrompt({
  call,
  busy = false,
  onAccept,
  onDecline,
}: IncomingCallPromptProps) {
  if (!call) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="incoming-vc-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-forest/55 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-3xl border border-brand-border bg-white p-6 text-center shadow-card space-y-5">
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-full ring-4 ring-brand-mint/40">
            <ProfileAvatar
              name={call.callerName}
              photoUrl={call.callerPhotoUrl}
              size="lg"
            />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-forest">
              Incoming Video Call
            </p>
            <h2
              id="incoming-vc-title"
              className="mt-1 text-xl font-bold text-brand-ink"
            >
              {call.callerName}
            </h2>
            <p className="mt-1 text-xs text-brand-muted">
              Accept to enable your camera and microphone for this call.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => onDecline(call)}
            className="flex-1 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50"
          >
            Decline
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onAccept(call)}
            className="flex-1 rounded-xl bg-brand-forest px-4 py-3 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-brand-forestHover disabled:opacity-50"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
