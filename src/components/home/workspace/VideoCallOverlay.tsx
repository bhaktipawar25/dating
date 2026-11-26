"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { StatusBanner } from "@/components/auth/StatusBanner";
import { registerLogoutCleanup } from "@/lib/auth/sessionCleanup";
import type { ChatSocketConnection } from "@/services/chat/types";
import { ProfileAvatar } from "../ProfileAvatar";

export interface ActiveVcCall {
  callId: string;
  conversationId: string;
  partnerName: string;
  partnerPhotoUrl?: string;
  direction: "outgoing" | "incoming";
  iceServers?: RTCIceServer[];
  isMock?: boolean;
}

interface VideoCallOverlayProps {
  call: ActiveVcCall;
  chatSocket: ChatSocketConnection | null;
  incomingSignal?: {
    signalType: "offer" | "answer" | "ice_candidate" | "ended" | "declined";
    sdp?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidateInit;
  } | null;
  onEndCall: (call: ActiveVcCall) => void;
  onBlockAndEnd: (call: ActiveVcCall) => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function VideoCallOverlay({
  call,
  chatSocket,
  incomingSignal,
  onEndCall,
  onBlockAndEnd,
}: VideoCallOverlayProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const dragOriginRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [connectionLabel, setConnectionLabel] = useState<string>(
    call.direction === "outgoing" ? "Calling..." : "Connecting..."
  );
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(0);

  // Draggable PiP offset relative to bottom-right
  const [pipPos, setPipPos] = useState<{ x: number; y: number }>({
    x: 16,
    y: 16,
  });

  const cleanupMediaAndPeer = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    if (peerRef.current) {
      peerRef.current.onicecandidate = null;
      peerRef.current.ontrack = null;
      peerRef.current.onconnectionstatechange = null;
      peerRef.current.close();
      peerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const unregister = registerLogoutCleanup(cleanupMediaAndPeer);
    return () => {
      unregister();
      cleanupMediaAndPeer();
    };
  }, [cleanupMediaAndPeer]);

  // Initialize local camera/mic + RTCPeerConnection
  useEffect(() => {
    let active = true;

    async function setupCall() {
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== "function"
      ) {
        setPermissionError(
          "Video calling requires browser camera & microphone access over HTTPS."
        );
        setConnectionLabel("Unavailable");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });

        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }

        const peer = new RTCPeerConnection({
          iceServers: call.iceServers ?? [
            { urls: "stun:stun.l.google.com:19302" },
          ],
        });
        peerRef.current = peer;

        stream.getTracks().forEach((track) => {
          peer.addTrack(track, stream);
        });

        peer.ontrack = (event) => {
          const [remoteStream] = event.streams;
          if (remoteStream && remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.play().catch(() => {});
            setHasRemoteVideo(true);
            setConnectionLabel("Connected");
          }
        };

        peer.onicecandidate = (event) => {
          if (event.candidate && chatSocket) {
            chatSocket.sendVcSignal({
              conversationId: call.conversationId,
              callId: call.callId,
              signalType: "ice_candidate",
              candidate: event.candidate.toJSON(),
            });
          }
        };

        peer.onconnectionstatechange = () => {
          const state = peer.connectionState;
          if (state === "connected") setConnectionLabel("Connected");
          else if (state === "connecting") setConnectionLabel("Connecting...");
          else if (state === "disconnected" || state === "failed") {
            setConnectionLabel("Connection interrupted");
          }
        };

        if (call.isMock) {
          // Clearly simulated call timing when no WebRTC peer backend is running
          setTimeout(() => {
            if (active) setConnectionLabel("Simulated Preview Active");
          }, 900);
        } else if (call.direction === "outgoing") {
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          chatSocket?.sendVcSignal({
            conversationId: call.conversationId,
            callId: call.callId,
            signalType: "offer",
            sdp: offer,
          });
        }
      } catch (err) {
        if (!active) return;
        const msg =
          err instanceof DOMException &&
          (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")
            ? "Camera or microphone permission was denied. Allow access in your browser settings and try again."
            : "Unable to access camera or microphone for this video call.";
        setPermissionError(msg);
        setConnectionLabel("Permission required");
      }
    }

    setupCall();

    return () => {
      active = false;
    };
  }, [call, chatSocket]);

  // Handle incoming WebRTC signaling frames from WS /v1/chat/stream
  useEffect(() => {
    const peer = peerRef.current;
    if (!incomingSignal || !peer) return;

    async function handleSignal() {
      if (!incomingSignal || !peerRef.current) return;
      const pc = peerRef.current;

      if (
        incomingSignal.signalType === "ended" ||
        incomingSignal.signalType === "declined"
      ) {
        cleanupMediaAndPeer();
        onEndCall(call);
        return;
      }

      if (incomingSignal.signalType === "offer" && incomingSignal.sdp) {
        await pc.setRemoteDescription(
          new RTCSessionDescription(incomingSignal.sdp)
        );
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        chatSocket?.sendVcSignal({
          conversationId: call.conversationId,
          callId: call.callId,
          signalType: "answer",
          sdp: answer,
        });
      } else if (
        incomingSignal.signalType === "answer" &&
        incomingSignal.sdp
      ) {
        await pc.setRemoteDescription(
          new RTCSessionDescription(incomingSignal.sdp)
        );
      } else if (
        incomingSignal.signalType === "ice_candidate" &&
        incomingSignal.candidate
      ) {
        await pc.addIceCandidate(
          new RTCIceCandidate(incomingSignal.candidate)
        );
      }
    }

    handleSignal().catch(() => {
      // Non-fatal signaling error guard
    });
  }, [incomingSignal, call, chatSocket, cleanupMediaAndPeer, onEndCall]);

  // Call duration timer
  useEffect(() => {
    if (
      connectionLabel !== "Connected" &&
      connectionLabel !== "Simulated Preview Active"
    ) {
      return;
    }

    const timer = setInterval(() => {
      setDurationSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [connectionLabel]);

  const toggleMic = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const nextMuted = !micMuted;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setMicMuted(nextMuted);
  };

  const toggleCamera = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const nextOff = !cameraOff;
    stream.getVideoTracks().forEach((track) => {
      track.enabled = !nextOff;
    });
    setCameraOff(nextOff);
  };

  const handleEnd = () => {
    cleanupMediaAndPeer();
    onEndCall(call);
  };

  const handleBlockAndEnd = () => {
    cleanupMediaAndPeer();
    onBlockAndEnd(call);
  };

  // Draggable PiP handlers
  const handlePipPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragOriginRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: pipPos.x,
      origY: pipPos.y,
    };
  };

  const handlePipPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragOriginRef.current || !stageRef.current) return;
    const dx = dragOriginRef.current.startX - e.clientX;
    const dy = dragOriginRef.current.startY - e.clientY;
    const maxX = Math.max(16, stageRef.current.clientWidth - 180);
    const maxY = Math.max(16, stageRef.current.clientHeight - 135);

    setPipPos({
      x: Math.min(maxX, Math.max(12, dragOriginRef.current.origX + dx)),
      y: Math.min(maxY, Math.max(12, dragOriginRef.current.origY + dy)),
    });
  };

  const handlePipPointerUp = () => {
    dragOriginRef.current = null;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Video call with ${call.partnerName}`}
      className="fixed inset-0 z-50 flex flex-col bg-[#0F2A27] text-white"
    >
      {/* Top Status Bar */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <ProfileAvatar
            name={call.partnerName}
            photoUrl={call.partnerPhotoUrl}
            size="sm"
          />
          <div>
            <p className="text-sm font-bold">{call.partnerName}</p>
            <p className="text-xs text-brand-seafoam">
              {connectionLabel}
              {durationSeconds > 0 ? ` · ${formatDuration(durationSeconds)}` : ""}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleBlockAndEnd}
          className="rounded-xl border border-rose-400/50 bg-rose-950/60 px-3 py-1.5 text-xs font-semibold text-rose-200 transition-colors hover:bg-rose-900"
        >
          Block &amp; End
        </button>
      </div>

      {/* Main Video Stage */}
      <div ref={stageRef} className="relative flex-1 overflow-hidden p-4">
        {permissionError && (
          <div className="mx-auto mb-3 max-w-md">
            <StatusBanner variant="error" message={permissionError} />
          </div>
        )}

        {/* Remote Participant Video */}
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-3xl border border-white/15 bg-brand-forest/70">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`h-full w-full object-cover ${
              hasRemoteVideo ? "block" : "hidden"
            }`}
          />

          {!hasRemoteVideo && (
            <div className="flex flex-col items-center gap-3 p-6 text-center">
              <ProfileAvatar
                name={call.partnerName}
                photoUrl={call.partnerPhotoUrl}
                size="lg"
              />
              <p className="text-base font-bold">{call.partnerName}</p>
              <p className="max-w-xs text-xs text-brand-seafoam/90">
                {call.isMock
                  ? "Local WebRTC camera preview active. Connect the Date² signaling backend to stream remote participant video."
                  : connectionLabel}
              </p>
            </div>
          )}
        </div>

        {/* Draggable Local Floating PiP Window */}
        <div
          onPointerDown={handlePipPointerDown}
          onPointerMove={handlePipPointerMove}
          onPointerUp={handlePipPointerUp}
          onPointerCancel={handlePipPointerUp}
          style={{ right: `${pipPos.x}px`, bottom: `${pipPos.y}px` }}
          title="Drag to move local video window"
          className="absolute z-20 h-32 w-44 cursor-grab overflow-hidden rounded-2xl border-2 border-brand-mint/70 bg-brand-ink shadow-card select-none touch-none active:cursor-grabbing sm:h-36 sm:w-48"
        >
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full -scale-x-100 object-cover ${
              cameraOff || permissionError ? "hidden" : "block"
            }`}
          />
          {(cameraOff || permissionError) && (
            <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-brand-seafoam">
              Camera Off
            </div>
          )}
          <span className="absolute bottom-1.5 left-2 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            You {micMuted ? "(Muted)" : ""}
          </span>
        </div>
      </div>

      {/* Bottom Call Controls */}
      <div className="flex items-center justify-center gap-4 border-t border-white/10 bg-black/25 px-4 py-4">
        <button
          type="button"
          onClick={toggleMic}
          disabled={Boolean(permissionError)}
          aria-pressed={micMuted}
          className={`rounded-2xl border px-4 py-2.5 text-xs font-semibold transition-colors disabled:opacity-45 ${
            micMuted
              ? "border-amber-400 bg-amber-500/20 text-amber-100"
              : "border-white/20 bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          {micMuted ? "Unmute Mic" : "Mute Mic"}
        </button>

        <button
          type="button"
          onClick={toggleCamera}
          disabled={Boolean(permissionError)}
          aria-pressed={cameraOff}
          className={`rounded-2xl border px-4 py-2.5 text-xs font-semibold transition-colors disabled:opacity-45 ${
            cameraOff
              ? "border-amber-400 bg-amber-500/20 text-amber-100"
              : "border-white/20 bg-white/10 text-white hover:bg-white/20"
          }`}
        >
          {cameraOff ? "Turn Camera On" : "Turn Camera Off"}
        </button>

        <button
          type="button"
          onClick={handleEnd}
          className="rounded-2xl bg-rose-600 px-5 py-2.5 text-xs font-semibold text-white shadow-soft transition-colors hover:bg-rose-700"
        >
          End Call
        </button>
      </div>
    </div>
  );
}
