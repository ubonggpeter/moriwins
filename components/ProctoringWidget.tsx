'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CameraOff, Minimize2, Maximize2, ShieldAlert } from 'lucide-react';

interface Props {
  active: boolean;
  gameId: string;
  gameType: string;
  onWarning: (count: number, reason: string) => void;
  onForceEnd: () => void;
}

const MAX_WARNINGS = 3;
const FACE_CHECK_INTERVAL = 2500;
const NO_FACE_THRESHOLD = 5000;
const TAB_BLUR_THRESHOLD = 10000;

export default function ProctoringWidget({ active, gameId, gameType, onWarning, onForceEnd }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const detectorRef = useRef<any>(null);
  const faceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tabTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFaceRef = useRef<number>(Date.now());
  const warnCountRef = useRef(0);
  const endedRef = useRef(false);

  const [pos, setPos] = useState({ x: 16, y: 80 });
  const [minimized, setMinimized] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [warnModal, setWarnModal] = useState<{ count: number; reason: string } | null>(null);

  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const log = useCallback(async (triggerType: string, actionTaken: string) => {
    try {
      await fetch('/api/malpractice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameSessionId: gameId, gameType, triggerType, actionTaken }),
      });
    } catch { /* best effort */ }
  }, [gameId, gameType]);

  const trigger = useCallback((reason: string) => {
    if (endedRef.current) return;
    const n = ++warnCountRef.current;
    const action = n >= MAX_WARNINGS ? 'game_ended' : `warning_${n}`;
    log(reason, action);
    if (n >= MAX_WARNINGS) {
      endedRef.current = true;
      setWarnModal(null);
      onForceEnd();
    } else {
      setWarnModal({ count: n, reason });
      onWarning(n, reason);
    }
  }, [log, onWarning, onForceEnd]);

  const stopCamera = useCallback(() => {
    if (faceIntervalRef.current) { clearInterval(faceIntervalRef.current); faceIntervalRef.current = null; }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    detectorRef.current = null;
    setCameraOn(false);
  }, []);

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
          detectorRef.current = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
        } catch { /* not supported in this browser */ }
      }

      if (detectorRef.current) {
        lastFaceRef.current = Date.now();
        faceIntervalRef.current = setInterval(async () => {
          if (!videoRef.current || !detectorRef.current) return;
          try {
            const faces = await detectorRef.current.detect(videoRef.current);
            if (faces.length > 0) {
              lastFaceRef.current = Date.now();
            } else if (Date.now() - lastFaceRef.current > NO_FACE_THRESHOLD) {
              lastFaceRef.current = Date.now();
              trigger('No face detected for 5 seconds');
            }
          } catch { /* ignore individual detection errors */ }
        }, FACE_CHECK_INTERVAL);
      }
    } catch {
      setCameraOn(false);
    }
  }, [trigger]);

  // Tab visibility monitoring
  useEffect(() => {
    if (!active) return;
    const onVisibility = () => {
      if (document.hidden) {
        tabTimerRef.current = setTimeout(() => trigger('Switched tab or minimized window for 10 seconds'), TAB_BLUR_THRESHOLD);
      } else {
        if (tabTimerRef.current) { clearTimeout(tabTimerRef.current); tabTimerRef.current = null; }
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (tabTimerRef.current) { clearTimeout(tabTimerRef.current); tabTimerRef.current = null; }
    };
  }, [active, trigger]);

  // Navigation detection
  useEffect(() => {
    if (!active) return;
    const onUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      trigger('Attempted to navigate away from game');
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [active, trigger]);

  // Camera lifecycle
  useEffect(() => {
    if (active) {
      warnCountRef.current = 0;
      endedRef.current = false;
      startCamera();
    } else {
      stopCamera();
      setWarnModal(null);
      if (tabTimerRef.current) { clearTimeout(tabTimerRef.current); tabTimerRef.current = null; }
    }
    return () => { stopCamera(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    setPos({
      x: Math.max(0, Math.min((typeof window !== 'undefined' ? window.innerWidth : 400) - 104, e.clientX - dragOffset.current.x)),
      y: Math.max(0, Math.min((typeof window !== 'undefined' ? window.innerHeight : 800) - 104, e.clientY - dragOffset.current.y)),
    });
  }
  function onPointerUp() { dragging.current = false; }

  if (!active) return null;

  return (
    <>
      <div className="fixed z-40 select-none" style={{ left: pos.x, top: pos.y }}>
        <div
          className="rounded-2xl overflow-hidden border border-white/10 bg-[#111111] shadow-xl"
          style={{ width: 96, cursor: dragging.current ? 'grabbing' : 'grab' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <div className="flex items-center justify-between px-2 py-1 bg-black/60">
            <div className="flex items-center gap-1">
              {cameraOn
                ? <Camera size={10} className="text-yellow-400" />
                : <CameraOff size={10} className="text-white/30" />}
              <span className="text-[8px] text-white/40 uppercase tracking-wider">Proctor</span>
            </div>
            <button
              className="text-white/30 hover:text-white/60 transition-colors"
              onPointerDown={e => e.stopPropagation()}
              onClick={() => setMinimized(m => !m)}
            >
              {minimized ? <Maximize2 size={9} /> : <Minimize2 size={9} />}
            </button>
          </div>
          {!minimized && (
            <div className="relative bg-black" style={{ height: 72 }}>
              <video ref={videoRef} className="w-full h-full object-cover opacity-90" muted playsInline autoPlay />
              {!cameraOn && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <CameraOff size={20} className="text-white/20" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {warnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111111] border border-yellow-400/30 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <ShieldAlert size={24} className="text-yellow-400 shrink-0" />
              <h2 className="text-white font-bold text-lg">
                Malpractice Warning {warnModal.count}/{MAX_WARNINGS}
              </h2>
            </div>
            <p className="text-white/60 text-sm mb-2">{warnModal.reason}</p>
            <p className="text-white/40 text-xs mb-6">
              {MAX_WARNINGS - warnModal.count === 1
                ? 'One more violation will end your game immediately as a loss.'
                : `${MAX_WARNINGS - warnModal.count} more violations will end your game.`}
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
    </>
  );
}
