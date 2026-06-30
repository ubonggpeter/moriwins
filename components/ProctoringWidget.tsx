'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CameraOff, ShieldAlert, GripHorizontal, AlertTriangle } from 'lucide-react';

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
const TAB_BLUR_MS = 1000;
const FACE_CHECK_MS = 800;
const FOREIGN_OBJ_MS = 3000;   // 0 faces + bright frame for this long → flag
const DARK_THRESHOLD_MS = 5000; // dark for this long → show dark modal
const HEAD_MOVE_THRESHOLD = 0.30;
const HEAD_WARNS_PER_TRIGGER = 3;
const TRIGGER_COOLDOWN_MS = 3000;
const DISTANCE_CHECK_EVERY = 4; // every 4th face-check cycle ≈ 3.2 s
const BRIGHT_THRESHOLD = 30;    // avg pixel value 0-255
const FACE_SIZE_THRESHOLD = 0.15; // face bounding-box width < 15% of video = too far

function sampleBrightness(video: HTMLVideoElement): number {
  try {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 48;
    const ctx = c.getContext('2d');
    if (!ctx) return 255;
    ctx.drawImage(video, 0, 0, 64, 48);
    const d = ctx.getImageData(0, 0, 64, 48).data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) sum += (d[i] + d[i + 1] + d[i + 2]) / 3;
    return sum / (d.length / 4);
  } catch { return 255; }
}

function hasBrightCenter(video: HTMLVideoElement): boolean {
  try {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 48;
    const ctx = c.getContext('2d');
    if (!ctx) return false;
    ctx.drawImage(video, 0, 0, 64, 48);
    const x0 = Math.floor(64 * 0.3), y0 = Math.floor(48 * 0.3);
    const w = Math.floor(64 * 0.4), h = Math.floor(48 * 0.4);
    const d = ctx.getImageData(x0, y0, w, h).data;
    let bright = 0;
    for (let i = 0; i < d.length; i += 4) {
      if ((d[i] + d[i + 1] + d[i + 2]) / 3 > BRIGHT_THRESHOLD) bright++;
    }
    return bright / (d.length / 4) > 0.40;
  } catch { return false; }
}

export default function ProctoringWidget({ active, gameId, gameType, bet, onForceEnd, onBalanceUpdate }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const detectorRef = useRef<any>(null);
  const detectingRef = useRef(false);
  const faceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tabTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lastFaceRef = useRef<number>(Date.now());
  const noFaceStartRef = useRef<number | null>(null);
  const darkSinceRef = useRef<number | null>(null);
  const checkCountRef = useRef(0);
  const darkModalShownRef = useRef(false);
  const prevCenterRef = useRef<{ x: number; y: number } | null>(null);
  const headWarnRef = useRef(0);
  const triggerCountRef = useRef(0);
  const triggerEventsRef = useRef<TriggerEvent[]>([]);
  const lastTriggerTimeRef = useRef<number>(0);
  const endedRef = useRef(false);

  // 78 mobile / 98 desktop (set after mount)
  const [size, setSize] = useState(78);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [posReady, setPosReady] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [camDisabled, setCamDisabled] = useState(false);
  const [tooFar, setTooFar] = useState(false);
  const [showDarkModal, setShowDarkModal] = useState(false);
  const [warnModal, setWarnModal] = useState<{ count: number; reason: string; deducted: number } | null>(null);
  const [endModal, setEndModal] = useState<{ events: TriggerEvent[] } | null>(null);

  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const sz = window.innerWidth >= 768 ? 98 : 78;
    setSize(sz);
    setPos({ x: window.innerWidth - sz - 16, y: window.innerHeight - sz - 96 });
    setPosReady(true);
  }, []);

  const logEvent = useCallback(async (triggerType: string, actionTaken: string, deductAmount: number) => {
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

    headWarnRef.current = 0;
    prevCenterRef.current = null;
    noFaceStartRef.current = null;

    const actionTaken = n >= MAX_TRIGGERS ? 'game_ended' : `warning_${n}`;
    logEvent(reason, actionTaken, deductAmount);

    if (n >= MAX_TRIGGERS) {
      endedRef.current = true;
      setWarnModal(null);
      setEndModal({ events: [...triggerEventsRef.current] });
    } else {
      setWarnModal({ count: n, reason, deducted: deductAmount });
    }
  }, [bet, logEvent]);

  const stopCamera = useCallback(() => {
    if (faceIntervalRef.current) { clearInterval(faceIntervalRef.current); faceIntervalRef.current = null; }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    detectorRef.current = null;
    detectingRef.current = false;
    setCameraOn(false);
  }, []);

  const processFaces = useCallback((
    faces: { boundingBox: { x: number; y: number; width: number; height: number } }[]
  ) => {
    const now = Date.now();
    const vid = videoRef.current;
    const videoW = vid?.videoWidth || 320;

    // Sample brightness on every other cycle (cheap but avoid every 800ms)
    const brightness = vid ? sampleBrightness(vid) : 255;

    if (faces.length === 0) {
      // ── Dark room ──
      if (brightness < BRIGHT_THRESHOLD) {
        noFaceStartRef.current = null;
        if (darkSinceRef.current === null) darkSinceRef.current = now;
        if (!darkModalShownRef.current && now - darkSinceRef.current > DARK_THRESHOLD_MS) {
          darkModalShownRef.current = true;
          setShowDarkModal(true);
        }
        return;
      }

      // ── Bright frame, no face → foreign object ──
      darkSinceRef.current = null;
      if (noFaceStartRef.current === null) noFaceStartRef.current = now;

      if (now - noFaceStartRef.current > FOREIGN_OBJ_MS) {
        noFaceStartRef.current = now; // reset to prevent rapid re-fire
        const centerBright = vid ? hasBrightCenter(vid) : false;
        trigger(centerBright
          ? 'Possible device or object placed in front of camera'
          : 'Unrecognized object blocking camera — possible recording device or obstruction'
        );
      }

      prevCenterRef.current = null;
      setTooFar(false);
      return;
    }

    // ── Face(s) present ──
    lastFaceRef.current = now;
    noFaceStartRef.current = null;
    darkSinceRef.current = null;

    if (faces.length > 1) {
      const second = faces[1].boundingBox;
      const ar = second.width / (second.height || 1);
      trigger(ar < 0.5 || ar > 2.2
        ? 'Possible recording device detected near screen'
        : 'Another person detected near your screen'
      );
      prevCenterRef.current = null;
      setTooFar(false);
      return;
    }

    // Single face
    const bb = faces[0].boundingBox;

    // Distance check (every DISTANCE_CHECK_EVERY cycles ≈ 3 s)
    checkCountRef.current++;
    if (checkCountRef.current % DISTANCE_CHECK_EVERY === 0) {
      setTooFar(bb.width / videoW < FACE_SIZE_THRESHOLD);
    }

    // Head movement
    const cx = (bb.x + bb.width / 2) / videoW;
    const cy = (bb.y + bb.height / 2) / (vid?.videoHeight || 240);
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
        } catch { /* unsupported */ }
      }

      lastFaceRef.current = Date.now();
      faceIntervalRef.current = setInterval(async () => {
        if (detectingRef.current || !videoRef.current) return;
        detectingRef.current = true;
        try {
          if (detectorRef.current) {
            const faces = await detectorRef.current.detect(videoRef.current);
            processFaces(faces);
          } else {
            // No FaceDetector — still run brightness/dark-room check
            const brightness = sampleBrightness(videoRef.current);
            if (brightness < BRIGHT_THRESHOLD) {
              const now = Date.now();
              if (darkSinceRef.current === null) darkSinceRef.current = now;
              if (!darkModalShownRef.current && now - darkSinceRef.current > DARK_THRESHOLD_MS) {
                darkModalShownRef.current = true;
                setShowDarkModal(true);
              }
            } else {
              darkSinceRef.current = null;
            }
          }
        } catch { /* ignore frame errors */ } finally {
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
        tabTimerRef.current = setTimeout(() => trigger('Switched tab or minimized window'), TAB_BLUR_MS);
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
    const onUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); trigger('Attempted to navigate away'); };
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
      noFaceStartRef.current = null;
      darkSinceRef.current = null;
      darkModalShownRef.current = false;
      checkCountRef.current = 0;
      setCamDisabled(false);
      setTooFar(false);
      startCamera();
    } else {
      stopCamera();
      setWarnModal(null);
      setEndModal(null);
      setShowDarkModal(false);
      setTooFar(false);
      if (tabTimerRef.current) { clearTimeout(tabTimerRef.current); tabTimerRef.current = null; }
    }
    return () => { stopCamera(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  async function handlePlayWithoutCamera() {
    stopCamera();
    setCamDisabled(true);
    setShowDarkModal(false);
    await logEvent('manual_camera_off', 'manual_camera_off', 0);
  }

  // Drag handlers
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    setPos({
      x: Math.max(0, Math.min(window.innerWidth - size, e.clientX - dragOffset.current.x)),
      y: Math.max(0, Math.min(window.innerHeight - size, e.clientY - dragOffset.current.y)),
    });
  }
  function onPointerUp() { dragging.current = false; }
  function onTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    const t = e.touches[0];
    dragging.current = true;
    dragOffset.current = { x: t.clientX - pos.x, y: t.clientY - pos.y };
  }
  function onTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!dragging.current) return;
    const t = e.touches[0];
    setPos({
      x: Math.max(0, Math.min(window.innerWidth - size, t.clientX - dragOffset.current.x)),
      y: Math.max(0, Math.min(window.innerHeight - size, t.clientY - dragOffset.current.y)),
    });
  }
  function onTouchEnd() { dragging.current = false; }

  if (!active || !posReady) return null;

  // Camera disabled — show small flagged badge instead of widget
  if (camDisabled) {
    return (
      <div
        className="fixed z-40 select-none"
        style={{ left: 0, top: 0, transform: `translate(${pos.x}px, ${pos.y}px)` }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp} onTouchStart={onTouchStart} onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex items-center gap-1.5 bg-yellow-400/10 border border-yellow-400/30 rounded-full px-3 py-1.5 cursor-grab"
          style={{ touchAction: 'none' }}>
          <AlertTriangle size={11} className="text-yellow-400" />
          <span className="text-[9px] text-yellow-400 font-bold uppercase tracking-wider">Flagged for Review</span>
        </div>
      </div>
    );
  }

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
          onPointerDown={onPointerDown} onPointerMove={onPointerMove}
          onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        >
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline autoPlay />

          {!cameraOn && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#111111]">
              <CameraOff size={size >= 98 ? 22 : 16} className="text-white/20" />
            </div>
          )}

          {/* Top overlay */}
          <div className="absolute top-0 inset-x-0 flex items-center justify-between px-1.5 pt-1 bg-gradient-to-b from-black/70 to-transparent">
            <div className="flex items-center gap-0.5">
              {cameraOn
                ? <Camera size={7} className="text-yellow-400" />
                : <CameraOff size={7} className="text-white/30" />}
              <span className="text-[6px] text-white/40 uppercase tracking-widest font-bold">Proctor</span>
            </div>
            <GripHorizontal size={8} className="text-white/30" />
          </div>

          {/* Live pulse */}
          {cameraOn && <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}

          {/* "Come closer" toast */}
          {tooFar && cameraOn && (
            <div className="absolute inset-x-0 bottom-0 bg-yellow-400/90 text-black text-[6px] font-bold text-center py-0.5 leading-tight">
              Move closer
            </div>
          )}
        </div>
      </div>

      {/* Dark camera modal */}
      {showDarkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <CameraOff size={22} className="text-white/50 shrink-0" />
              <h2 className="text-white font-bold text-lg">Room Too Dark</h2>
            </div>
            <p className="text-white/60 text-sm mb-6">
              Your camera feed is too dark for face monitoring. Please turn on a light so your face is clearly visible.
            </p>
            <div className="space-y-3">
              <button
                className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl text-sm"
                onClick={() => { darkModalShownRef.current = false; setShowDarkModal(false); }}
              >
                Turn On Light — Continue
              </button>
              <button
                className="w-full bg-[#1a1a1a] border border-white/10 text-white/60 font-bold py-3 rounded-xl text-sm hover:text-white/80 transition-colors"
                onClick={handlePlayWithoutCamera}
              >
                Play Without Camera
              </button>
            </div>
            <p className="text-white/25 text-[10px] mt-4 text-center leading-relaxed">
              Choosing &ldquo;Play Without Camera&rdquo; will flag this session for manual review by a live invigilator after the game ends.
            </p>
          </div>
        </div>
      )}

      {/* Warning modal (triggers 1 & 2) */}
      {warnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="bg-[#111111] border border-yellow-400/30 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <ShieldAlert size={24} className="text-yellow-400 shrink-0" />
              <h2 className="text-white font-bold text-lg">
                Warning {warnModal.count} of {MAX_TRIGGERS}
              </h2>
            </div>
            <p className="text-white/70 text-sm mb-3">{warnModal.reason}</p>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4">
              <p className="text-red-400 text-sm font-bold">
                ₦{warnModal.deducted.toLocaleString()} deducted from your balance.
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

      {/* End-game summary modal */}
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
                    <p className="text-white/30 text-[10px] uppercase font-bold mb-0.5">Violation {i + 1} of {MAX_TRIGGERS}</p>
                    <p className="text-white/70 text-xs">{ev.reason}</p>
                  </div>
                  <span className="text-red-400 font-mono text-xs font-bold shrink-0">−₦{ev.deducted.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5">
              <p className="text-red-400 text-sm font-bold">
                Total deducted: ₦{endModal.events.reduce((s, e) => s + e.deducted, 0).toLocaleString()}
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
