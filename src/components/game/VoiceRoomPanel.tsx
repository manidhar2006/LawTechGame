import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type VoiceSignal = {
  from: string;
  to: string;
  type: "offer" | "answer" | "candidate";
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

type VoiceStatus = "idle" | "requesting" | "connecting" | "connected" | "error";

interface Props {
  sessionId: string;
  currentUserId: string;
  peerUserId: string | null;
  isInitiator: boolean;
}

const VOICE_CHANNEL_PREFIX = "voice-room";
const AUDIO_PREFS_KEY = "dg-audio-prefs";
const AUDIO_PREFS_EVENT = "dg-audio-prefs-updated";

type AudioPrefs = {
  micMuted: boolean;
  speakerMuted: boolean;
};

function readAudioPrefs(): AudioPrefs {
  if (typeof window === "undefined") return { micMuted: false, speakerMuted: false };

  try {
    const raw = window.localStorage.getItem(AUDIO_PREFS_KEY);
    if (!raw) return { micMuted: false, speakerMuted: false };
    const parsed = JSON.parse(raw) as Partial<AudioPrefs>;
    return {
      micMuted: !!parsed.micMuted,
      speakerMuted: !!parsed.speakerMuted,
    };
  } catch {
    return { micMuted: false, speakerMuted: false };
  }
}

function writeAudioPrefs(next: AudioPrefs) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUDIO_PREFS_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(AUDIO_PREFS_EVENT, { detail: next }));
}

export function VoiceRoomPanel({ sessionId, currentUserId, peerUserId, isInitiator }: Props) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const offeredPeerRef = useRef<string | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const initialPrefs = readAudioPrefs();
  const [joined, setJoined] = useState(false);
  const [muted, setMuted] = useState(initialPrefs.micMuted);
  const [speakerMuted, setSpeakerMuted] = useState(initialPrefs.speakerMuted);
  const [channelReady, setChannelReady] = useState(false);
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [errorText, setErrorText] = useState<string | null>(null);

  const statusLabel = useMemo(() => {
    if (status === "connected") return "Connected";
    if (status === "connecting") return "Connecting";
    if (status === "requesting") return "Requesting microphone";
    if (status === "error") return "Call unavailable";
    return "Not started";
  }, [status]);

  const teardownPeer = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
  }, []);

  const stopLocalStream = useCallback(() => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
  }, []);

  const leaveVoiceRoom = useCallback(() => {
    teardownPeer();
    stopLocalStream();
    pendingCandidatesRef.current = [];
    offeredPeerRef.current = null;
    setJoined(false);
    setStatus("idle");
    setErrorText(null);
  }, [stopLocalStream, teardownPeer]);

  const sendSignal = useCallback(async (signal: Omit<VoiceSignal, "from">) => {
    if (!channelRef.current) return;
    await channelRef.current.send({
      type: "broadcast",
      event: "voice-signal",
      payload: {
        ...signal,
        from: currentUserId,
      },
    });
  }, [currentUserId]);

  const ensurePeerConnection = useCallback(() => {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.onicecandidate = (event) => {
      if (!event.candidate || !peerUserId) return;
      void sendSignal({
        to: peerUserId,
        type: "candidate",
        candidate: event.candidate.toJSON(),
      });
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (!stream || !remoteAudioRef.current) return;
      remoteAudioRef.current.srcObject = stream;
      setStatus("connected");
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === "connected") setStatus("connected");
      if (state === "connecting" || state === "new") setStatus("connecting");
      if (state === "disconnected" || state === "failed") {
        setStatus("error");
        setErrorText("Voice link dropped. Tap Reconnect.");
      }
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current!));
    }

    pcRef.current = pc;
    return pc;
  }, [peerUserId, sendSignal]);

  const startOffer = useCallback(async () => {
    if (!isInitiator || !peerUserId || !channelReady || !joined) return;
    if (offeredPeerRef.current === peerUserId && pcRef.current) return;

    try {
      const pc = ensurePeerConnection();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendSignal({ to: peerUserId, type: "offer", sdp: offer });
      offeredPeerRef.current = peerUserId;
      setStatus("connecting");
    } catch {
      setStatus("error");
      setErrorText("Unable to start voice offer.");
    }
  }, [channelReady, ensurePeerConnection, isInitiator, joined, peerUserId, sendSignal]);

  const joinVoiceRoom = useCallback(async () => {
    if (joined) return;

    try {
      setStatus("requesting");
      setErrorText(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
      setJoined(true);
      setStatus("connecting");
    } catch {
      setStatus("error");
      setErrorText("Microphone permission is required for the voice room.");
    }
  }, [joined, muted]);

  useEffect(() => {
    if (!joined || !sessionId) return;

    const topic = `${VOICE_CHANNEL_PREFIX}:${sessionId}`;
    const channel = supabase
      .channel(topic)
      .on("broadcast", { event: "voice-signal" }, async ({ payload }) => {
        const signal = payload as VoiceSignal;
        if (!signal || signal.to !== currentUserId) return;

        try {
          if (signal.type === "offer" && signal.sdp) {
            const pc = ensurePeerConnection();
            await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
            if (pendingCandidatesRef.current.length > 0) {
              const pending = [...pendingCandidatesRef.current];
              pendingCandidatesRef.current = [];
              for (const candidate of pending) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              }
            }
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await sendSignal({ to: signal.from, type: "answer", sdp: answer });
            setStatus("connecting");
          }

          if (signal.type === "answer" && signal.sdp && pcRef.current) {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal.sdp));
            if (pendingCandidatesRef.current.length > 0) {
              const pending = [...pendingCandidatesRef.current];
              pendingCandidatesRef.current = [];
              for (const candidate of pending) {
                await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
              }
            }
            setStatus("connecting");
          }

          if (signal.type === "candidate" && signal.candidate) {
            if (!pcRef.current) {
              pendingCandidatesRef.current.push(signal.candidate);
            } else {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(signal.candidate));
            }
          }
        } catch {
          setStatus("error");
          setErrorText("Voice signaling failed. Try reconnecting.");
        }
      })
      .subscribe((subStatus) => {
        if (subStatus === "SUBSCRIBED") {
          setChannelReady(true);
        }
      });

    channelRef.current = channel;

    return () => {
      setChannelReady(false);
      void supabase.removeChannel(channel);
      if (channelRef.current === channel) {
        channelRef.current = null;
      }
    };
  }, [currentUserId, ensurePeerConnection, joined, sendSignal, sessionId]);

  useEffect(() => {
    if (!joined || !peerUserId || !isInitiator) return;
    void startOffer();
  }, [isInitiator, joined, peerUserId, startOffer]);

  useEffect(() => {
    if (!peerUserId || joined) return;
    void joinVoiceRoom();
  }, [joinVoiceRoom, joined, peerUserId]);

  useEffect(() => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }, [muted]);

  useEffect(() => {
    writeAudioPrefs({ micMuted: muted, speakerMuted });
  }, [muted, speakerMuted]);

  useEffect(() => {
    if (!remoteAudioRef.current) return;
    remoteAudioRef.current.muted = speakerMuted;
    remoteAudioRef.current.volume = speakerMuted ? 0 : 1;
  }, [speakerMuted]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onStorage = (event: StorageEvent) => {
      if (event.key !== AUDIO_PREFS_KEY || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue) as Partial<AudioPrefs>;
        setMuted(!!parsed.micMuted);
        setSpeakerMuted(!!parsed.speakerMuted);
      } catch {
        // ignore malformed storage payload
      }
    };

    const onLocal = (event: Event) => {
      const custom = event as CustomEvent<AudioPrefs>;
      if (!custom.detail) return;
      setMuted(!!custom.detail.micMuted);
      setSpeakerMuted(!!custom.detail.speakerMuted);
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(AUDIO_PREFS_EVENT, onLocal as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(AUDIO_PREFS_EVENT, onLocal as EventListener);
    };
  }, []);

  useEffect(() => {
    return () => {
      leaveVoiceRoom();
    };
  }, [leaveVoiceRoom]);

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg">Voice Room</h3>
          <p className="text-xs text-muted-foreground">Live call between Fiduciary and Principal</p>
        </div>
        <span
          className={cn(
            "text-xs px-2 py-1 rounded font-mono",
            status === "connected" ? "bg-accent/15 text-accent" : "bg-surface-2 text-muted-foreground",
          )}
        >
          {statusLabel}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => {
            if (joined) {
              leaveVoiceRoom();
            } else {
              void joinVoiceRoom();
            }
          }}
          className="px-3 py-1.5 rounded-md border border-border text-sm hover:border-primary/40"
        >
          {joined ? "Leave call" : "Join call"}
        </button>
        <button
          onClick={() => setMuted((prev) => !prev)}
          disabled={!joined}
          className="px-3 py-1.5 rounded-md border border-border text-sm hover:border-primary/40 disabled:opacity-40"
        >
          {muted ? "Unmute mic" : "Mute mic"}
        </button>
        <button
          onClick={() => setSpeakerMuted((prev) => !prev)}
          className="px-3 py-1.5 rounded-md border border-border text-sm hover:border-primary/40"
        >
          {speakerMuted ? "Unmute speaker" : "Mute speaker"}
        </button>
        <button
          onClick={() => {
            if (!joined) return;
            teardownPeer();
            offeredPeerRef.current = null;
            setStatus("connecting");
            if (isInitiator) {
              void startOffer();
            }
          }}
          disabled={!joined || !peerUserId}
          className="px-3 py-1.5 rounded-md border border-border text-sm hover:border-primary/40 disabled:opacity-40"
        >
          Reconnect
        </button>
      </div>

      {!peerUserId && (
        <p className="mt-3 text-xs text-muted-foreground">
          Waiting for the second player to join the room before voice can connect.
        </p>
      )}
      {errorText && <p className="mt-3 text-xs text-destructive">{errorText}</p>}

      <audio ref={remoteAudioRef} autoPlay playsInline />
    </section>
  );
}
