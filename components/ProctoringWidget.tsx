'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CameraOff, ShieldAlert, GripHorizontal } from 'lucide-react';

export interface TriggerEvent {
  reason: string;
  deducted: number;
}

interface Props {
  active: boolean;
  gameId: string;
  gameType: string;
  bet: number;
  onForceEnd: () => void;
  onBalanceUpdate: (newBalance: number) => void;
}

const MAX_TRIGGERS = 3;
const TAB_BLUR_MS = 1000;           // 1 second before warning fires
const FACE_CHECK_MS = 800;           // detection interval
const NO_FACE_MS = 5000;             // 5 s no face → trigger
const HEAD_MOVE_THRESHOLD = 0.30;    // 30 % of frame dimension
const HEAD_WARNS_PER_TRIGGER = 3;    // 3 head warnings → 1 malpractice trigger
const TRIGGER_COOLDOWN_MS = 3000;    // min ms between any two triggers

export default function ProctoringWidget({ active, gameId, gameType, bet, onForceEnd, onBalanceUpdate }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const detectorRef = useRef<any>(null);
  const detectingRef = useRef(false);
  const faceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tabTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lastFaceRef = useRef<number>(Date.now());
  const prevCenterRef = useRef<{ x: number; y: number } | null>(null);
  const headWarnRef = useRef(0);
  const triggerCountRef = useRef(0);
  const triggerEventsRef = useRef<TriggerEvent[]>([]);
  const lastTriggerTimeRef = useRef<number>(0);
  const endedRef = useRef(false);

  // Widget sizing — 150 on desktop, 120 on mobile (set after mount)
  const [size, setSize] = useState(120);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [posReady, setPosReady] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [warnModal, setWarnModal] = useState<{ count: number; reason: string; deducted: number } | null>(null);
  const [endModal, setEndModal] = useState<{ events: TriggerEvent[] } | null>(null);

  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const sz = window.innerWidth >= 768 ? 150 : 120;
    setSize(sz);
    setPos({ x: window.innerWidth - sz - 16, y: window.innerHeight - sz - 96 });
    setPosReady(true);
  }, []);

  const logAndDeduct = useCallback(async (triggerType: string, actionTaken: string, deductAmount: number) => {
    try {
      const res = await fetch('/api/malpractice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameSessionId: gameId, gameType, triggerType, actionTaken, deductAmount }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.newBalance === 'number') onBalanceUpdate(data.newBalance);
      }
    } catch { /* best effort */ }
  }, [gameId, gameType, onBalanceUpdate]);

  const trigger = useCallback((reason: string) => {
    if (endedRef.current) return;
    const now = Date.now();
    if (now - lastTriggerTimeRef.current < TRIGGER_COOLDOWN_MS) return;
    lastTriggerTimeRef.current = now;

    const deductAmount = Math.floor(bet * 0.5);
    const n = ++triggerCountRef.current;
    const event: TriggerEvent = { reason, deducted: deductAmount };
    triggerEventsRef.current.push(event);

    // Reset head movement counter on every trigger
    headWarnRef.current = 0;
    prevCenterRef.current = null;

    const actionTaken = n >= MAX_TRIGGERS ? 'game_ended' : `warning_${n}`;
    logAndDeduct(reason, actionTaken, deductAmount);

    if (n >= MAX_TRIGGERS) {
      endedRef.current = true;
      setWarnModal(null);
      setEndModal({ events: [...triggerEventsRef.current] });
    } else {
      setWarnModal({ count: n, reason, deducted: deductAmount });
    }
  }, [bet, logAndDeduct]);

  const stopCamera = useCallback(() => {
    if (faceIntervalRef.current) { clearInterval(faceIntervalRef.current); faceIntervalRef.current = null; }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    detectorRef.current = null;
    detectingRef.current = false;
    setCameraOn(false);
  }, []);

  const processFaces = useCallback((faces: { boundingBox: { x: number; y: number; width: number; height: number } }[]) => {
    const now = Date.now();
    const vid = videoRef.current;
    const videoW = vid?.videoWidth || 320;
    const videoH = vid?.videoHeight || 240;

    if (faces.length === 0) {
      if (now - lastFaceRef.current > NO_FACE_MS) {
        lastFaceRef.current = now;
        trigger('No face detected for 5 seconds');
      }
      prevCenterRef.current = null;
      return;
    }

    lastFaceRef.current = now;

    // Multiple faces detected
    if (faces.length > 1) {
      const second = faces[1].boundingBox;
      const ar = second.width / (second.height || 1);
      const reason = (ar < 0.5 || ar > 2.2)
        ? 'Possible recording device detected near screen'
        : 'Another person detected near your screen';
      trigger(reason);
      prevCenterRef.current = null;
      return;
    }

    // Single face — head movement tracking
    const bb = faces[0].boundingBox;
    const cx = (bb.x + bb.width / 2) / videoW;
    const cy = (bb.y + bb.height / 2) / videoH;

    if (prevCenterRef.current) {
      const dx = Math.abs(cx - prevCenterRef.current.x);
      const dy = Math.abs(cy - prevCenterRef.current.y);
      if (dx > HEAD_MOVE_THRESHOLD || dy > HEAD_MOVE_THRESHOLD) {
        headWarnRef.current++;
        if (headWarnRef.current >= HEAD_WARNS_PER_TRIGGER) {
          headWarnRef.current = 0;
          trigger('Excessive head movement detected');
        }
      }
    }
    prevCenterRef.current = { x: cx, y: cy };
  }, [trigger]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraOn(true);

      if ('FaceDetector' in window) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          detectorRef.current = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 3 });
        } catch { /* browser doesn't support FaceDetector */ }
      }

      lastFaceRef.current = Date.now();
      faceIntervalRef.current = setInterval(async () => {
        if (detectingRef.current || !videoRef.current) return;
        if (!detectorRef.current) {
          // No face detector available — only check for no-face via stream health
          return;
        }
        detectingRef.current = true;
        try {
          const faces = await detectorRef.current.detect(videoRef.current);
          processFaces(faces);
        } catch { /* ignore individual frame errors */ } finally {
          detectingRef.current = false;
        }
      }, FACE_CHECK_MS);
    } catch {
      setCameraOn(false);
    }
  }, [processFaces]);

  // Tab visibility + window blur/focus (1-second threshold)
  useEffect(() => {
    if (!active) return;

    const arm = () => {
      if (!tabTimerRef.current) {
        tabTimerRef.current = setTimeout(() => {
          trigger('Switched tab or minimized window');
        }, TAB_BLUR_MS);
      }
    };
    const disarm = () => {
      if (tabTimerRef.current) { clearTimeout(tabTimerRef.current); tabTimerRef.current = null; }
    };

    const onVisibility = () => { if (document.hidden) { arm(); } else { disarm(); } };
    const onBlur = () => arm();
    const onFocus = () => disarm();

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      disarm();
    };
  }, [active, trigger]);

  // Navigation away
  useEffect(() => {
    if (!active) return;
    const onUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); trigger('Attempted to navigate away from game'); };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [active, trigger]);

  // Camera lifecycle
  useEffect(() => {
    if (active) {
      triggerCountRef.current = 0;
      headWarnRef.current = 0;
      triggerEventsRef.current = [];
      endedRef.current = false;
      lastTriggerTimeRef.current = 0;
      prevCenterRef.current = null;
      startCamera();
    } else {
      stopCamera();
      setWarnModal(null);
      setEndModal(null);
      if (tabTimerRef.current) { clearTimeout(tabTimerRef.current); tabTimerRef.current = null; }
    }
    return () => { stopCamera(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Drag — pointer events handle both mouse and touch
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    const maxX = window.innerWidth - size;
    const maxY = window.innerHeight - size;
    setPos({
      x: Math.max(0, Math.min(maxX, e.clientX - dragOffset.current.x)),
      y: Math.max(0, Math.min(maxY, e.clientY - dragOffset.current.y)),
    });
  }
  function onPointerUp() { dragging.current = false; }

  // Explicit touch handlers (belt-and-suspenders for older mobile browsers)
  function onTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    const t = e.touches[0];
    dragging.current = true;
    dragOffset.current = { x: t.clientX - pos.x, y: t.clientY - pos.y };
  }
  function onTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!dragging.current) return;
    const t = e.touches[0];
    const maxX = window.innerWidth - size;
    const maxY = window.innerHeight - size;
    setPos({
      x: Math.max(0, Math.min(maxX, t.clientX - dragOffset.current.x)),
      y: Math.max(0, Math.min(maxY, t.clientY - dragOffset.current.y)),
    });
  }
  function onTouchEnd() { dragging.current = false; }

  if (!active || !posReady) return null;

  return (
    <>
      {/* Floating circular camera widget */}
      <div
        className="fixed z-40 select-none"
        style={{ left: 0, top: 0, transform: `translate(${pos.x}px, ${pos.y}px)`, width: size, height: size }}
      >
        <div
          className="rounded-full overflow-hidden bg-[#111111] shadow-2xl border-2 border-white/10 relative"
          style={{ width: size, height: size, cursor: dragging.current ? 'grabbing' : 'grab', touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Camera feed */}
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted
            playsInline
            autoPlay
          />

          {/* No camera fallback */}
          {!cameraOn && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[#111111]">
              <CameraOff size={size >= 150 ? 28 : 22} className="text-white/20" />
            </div>
          )}

          {/* Top overlay — status + drag handle */}
          <div className="absolute top-0 inset-x-0 flex items-center justify-between px-2 pt-1.5 bg-gradient-to-b from-black/70 to-transparent">
            <div className="flex items-center gap-1">
              {cameraOn
                ? <Camera size={9} className="text-yellow-400" />
                : <CameraOff size={9} className="text-white/30" />}
              <span className="text-[7px] text-white/50 uppercase tracking-widest font-bold">Proctor</span>
            </div>
            <GripHorizontal size={10} className="text-white/30" />
          </div>

          {/* Live pulse dot */}
          {cameraOn && (
            <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          )}
        </div>
      </div>

      {/* Warning modal (triggers 1 & 2) */}
      {warnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="bg-[#111111] border border-yellow-400/30 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <ShieldAlert size={24} className="text-yellow-400 shrink-0" />
              <h2 className="text-white font-bold text-lg">
                Malpractice Warning {warnModal.count}/{MAX_TRIGGERS}
              </h2>
            </div>
            <p className="text-white/70 text-sm mb-3">{warnModal.reason}</p>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4">
              <p className="text-red-400 text-sm font-bold">
                ${warnModal.deducted.toLocaleString()} has been deducted from your balance.
              </p>
            </div>
            <p className="text-white/40 text-xs mb-5">
              {MAX_TRIGGERS - warnModal.count === 1
                ? 'One more violation will end your game immediately as a loss.'
                : `${MAX_TRIGGERS - warnModal.count} more violations will end your game.`}
            </p>
            <button
              className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl text-sm"
              onClick={() => setWarnModal(null)}
            >
              I Understand
            </button>
          </div>
        </div>
      )}

      {/* End-game summary modal (trigger 3) */}
      {endModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111111] border border-red-500/30 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <ShieldAlert size={24} className="text-red-400 shrink-0" />
              <h2 className="text-white font-bold text-lg">Game Ended — Malpractice</h2>
            </div>
            <div className="space-y-2 mb-4">
              {endModal.events.map((ev, i) => (
                <div key={i} className="flex items-start justify-between gap-3 bg-[#1a1a1a] rounded-xl px-3 py-2">
                  <div>
                    <p className="text-white/30 text-[10px] uppercase font-bold mb-0.5">Violation {i + 1}</p>
                    <p className="text-white/70 text-xs">{ev.reason}</p>
                  </div>
                  <span className="text-red-400 font-mono text-xs font-bold shrink-0">−${ev.deducted}</span>
                </div>
              ))}
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5">
              <p className="text-red-400 text-sm font-bold">
                Total deducted: ${endModal.events.reduce((s, e) => s + e.deducted, 0).toLocaleString()}
              </p>
            </div>
            <button
              className="w-full bg-red-500/80 hover:bg-red-500 text-white font-bold py-3 rounded-xl text-sm transition-colors"
              onClick={() => { setEndModal(null); onForceEnd(); }}
            >
              OK — Back to Lobby
            </button>
          </div>
        </div>
      )}
    </>
  );
}
