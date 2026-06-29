'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Crown, Globe, Star, Heart, Zap, Gem, Layers, type LucideIcon } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

// ── Types ─────────────────────────────────────────────────────────────────────

interface IconCfg {
  key: string;
  Icon: LucideIcon;
  label: string;
  iconStyle: React.CSSProperties;
}

interface RoundCfg {
  totalBoxes: number;
  cols: string;
  studySeconds: number;
  iconSize: number;
  countEach: number;
  icons: [IconCfg, IconCfg];
}

interface RoundResult {
  correct: number[];    // selected AND was target icon
  wrong: number[];      // selected AND was NOT target icon
  missed: number[];     // not selected AND was target icon
  wrongCount: number;
  isGameOver: boolean;  // totalWrong >= MAX_WRONG
  isWon: boolean;       // all 3 rounds done and not game over
}

type GameMode = 'training' | 'earning';
type Phase = 'mode-select' | 'earning-setup' | 'study' | 'recall' | 'round-result';

// ── Config ────────────────────────────────────────────────────────────────────

const ROUND_CFGS: RoundCfg[] = [
  {
    totalBoxes: 16, cols: 'grid-cols-4', studySeconds: 4, iconSize: 22, countEach: 8,
    icons: [
      {
        key: 'crown', Icon: Crown, label: 'Crown',
        iconStyle: {
          color: '#facc15',
          filter: 'drop-shadow(0 0 8px rgba(250,204,21,0.75)) drop-shadow(2px 4px 6px rgba(0,0,0,0.85))',
        },
      },
      {
        key: 'globe', Icon: Globe, label: 'Globe',
        iconStyle: {
          color: '#60a5fa',
          filter: 'drop-shadow(0 0 8px rgba(96,165,250,0.75)) drop-shadow(2px 4px 6px rgba(0,0,0,0.85))',
        },
      },
    ],
  },
  {
    totalBoxes: 8, cols: 'grid-cols-4', studySeconds: 3, iconSize: 28, countEach: 4,
    icons: [
      {
        key: 'star', Icon: Star, label: 'Star',
        iconStyle: {
          color: '#f87171',
          filter: 'drop-shadow(0 0 5px rgba(248,113,113,0.55)) drop-shadow(2px 3px 4px rgba(0,0,0,0.7))',
        },
      },
      {
        key: 'heart', Icon: Heart, label: 'Heart',
        iconStyle: {
          color: '#f472b6',
          filter: 'drop-shadow(0 0 5px rgba(244,114,182,0.55)) drop-shadow(2px 3px 4px rgba(0,0,0,0.7))',
        },
      },
    ],
  },
  {
    totalBoxes: 4, cols: 'grid-cols-2', studySeconds: 2, iconSize: 36, countEach: 2,
    icons: [
      {
        key: 'zap', Icon: Zap, label: 'Zap',
        iconStyle: {
          color: '#d1d5db',
          filter: 'grayscale(1) drop-shadow(1px 2px 3px rgba(0,0,0,0.4))',
        },
      },
      {
        key: 'gem', Icon: Gem, label: 'Gem',
        iconStyle: {
          color: '#9ca3af',
          filter: 'grayscale(1) drop-shadow(1px 2px 3px rgba(0,0,0,0.4))',
        },
      },
    ],
  },
];

const TOTAL_ROUNDS = 3;
const MAX_WRONG = 9;

const MULT_TABLE = [
  { label: '0 wrong',  mult: '3.0x', color: 'text-green-400'  },
  { label: '1–2 wrong', mult: '2.5x', color: 'text-green-400'  },
  { label: '3–4 wrong', mult: '2.0x', color: 'text-yellow-400' },
  { label: '5–6 wrong', mult: '1.5x', color: 'text-yellow-400' },
  { label: '7–8 wrong', mult: '1.2x', color: 'text-orange-400' },
  { label: '9+ wrong',  mult: 'Loss', color: 'text-red-400'    },
];

const PRESET_BETS = [10, 25, 50, 100, 250];

// ── Helpers ───────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildGrid(cfg: RoundCfg): string[] {
  return shuffle([
    ...Array(cfg.countEach).fill(cfg.icons[0].key),
    ...Array(cfg.countEach).fill(cfg.icons[1].key),
  ]);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MemoryPage() {
  const router = useRouter();
  const [mode, setMode] = useState<GameMode>('training');
  const [phase, setPhase] = useState<Phase>('mode-select');
  const [round, setRound] = useState(1);
  const [balance, setBalance] = useState(0);
  const [bet, setBet] = useState(50);
  const [gameId, setGameId] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const [grid, setGrid] = useState<string[]>([]);
  const [studyTime, setStudyTime] = useState(4);
  const [targetKey, setTargetKey] = useState('');

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [totalWrong, setTotalWrong] = useState(0);
  const [gameResult, setGameResult] = useState<{ payout: number; multiplier: number } | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch('/api/user').then(r => r.json()).then(d => {
      if (d.balance !== undefined) setBalance(d.balance);
    });
  }, []);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // ── Game actions ────────────────────────────────────────────────────────────

  function startStudy(roundNum: number) {
    if (timerRef.current) clearInterval(timerRef.current);
    const roundCfg = ROUND_CFGS[roundNum - 1];
    const newGrid = buildGrid(roundCfg);

    setRound(roundNum);
    setGrid(newGrid);
    setStudyTime(roundCfg.studySeconds);
    setSelected(new Set());
    setRoundResult(null);
    setPhase('study');

    let t = roundCfg.studySeconds;
    timerRef.current = setInterval(() => {
      t--;
      setStudyTime(t);
      if (t <= 0) {
        clearInterval(timerRef.current!);
        // Randomly pick which icon to recall
        const idx = Math.random() < 0.5 ? 0 : 1;
        setTargetKey(roundCfg.icons[idx].key);
        setPhase('recall');
      }
    }, 1000);
  }

  async function startGame(gameMode: GameMode) {
    setMode(gameMode);
    setTotalWrong(0);
    setRoundResult(null);
    setGameResult(null);
    setMsg('');

    if (gameMode === 'training') {
      startStudy(1);
      return;
    }

    setLoading(true);
    const res = await fetch('/api/games/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bet }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setMsg(data.error); return; }
    setBalance(data.balance);
    setGameId(data.gameId);
    startStudy(1);
  }

  async function finalizeGame(won: boolean, wrongs: number, gid: string, gameMode: GameMode) {
    if (gameMode !== 'earning' || !gid) return;
    const res = await fetch('/api/games/memory', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId: gid, won, wrongGuesses: wrongs }),
    });
    const data = await res.json();
    setBalance(data.balance);
    setGameResult({ payout: data.payout, multiplier: data.multiplier });
  }

  function submitRecall() {
    if (phase !== 'recall') return;
    const targetPositions = grid.reduce<number[]>((acc, key, i) => {
      if (key === targetKey) acc.push(i);
      return acc;
    }, []);

    const selArr = Array.from(selected);
    const correct = selArr.filter(i => targetPositions.includes(i));
    const wrong   = selArr.filter(i => !targetPositions.includes(i));
    const missed  = targetPositions.filter(i => !selected.has(i));

    const newTotalWrong = totalWrong + wrong.length;
    setTotalWrong(newTotalWrong);

    const isGameOver = newTotalWrong >= MAX_WRONG;
    const isWon      = !isGameOver && round >= TOTAL_ROUNDS;

    const result: RoundResult = {
      correct, wrong, missed,
      wrongCount: wrong.length,
      isGameOver,
      isWon,
    };
    setRoundResult(result);
    setPhase('round-result');

    if (isGameOver || isWon) {
      finalizeGame(isWon, newTotalWrong, gameId, mode);
    }
  }

  function proceedToNextRound() {
    if (!roundResult) return;
    startStudy(round + 1);
  }

  function resetGame() {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('mode-select');
    setRound(1);
    setGrid([]);
    setSelected(new Set());
    setRoundResult(null);
    setTotalWrong(0);
    setGameResult(null);
    setGameId('');
    setMsg('');
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const roundCfg = ROUND_CFGS[round - 1] ?? ROUND_CFGS[0];
  const targetCfg = roundCfg.icons.find(i => i.key === targetKey);

  function boxResultState(idx: number): 'correct' | 'wrong' | 'missed' | 'neutral' | null {
    if (!roundResult) return null;
    if (roundResult.correct.includes(idx)) return 'correct';
    if (roundResult.wrong.includes(idx))   return 'wrong';
    if (roundResult.missed.includes(idx))  return 'missed';
    return 'neutral';
  }

  // ── HUD bar ─────────────────────────────────────────────────────────────────

  const showHud = phase === 'study' || phase === 'recall' || phase === 'round-result';

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-black pb-24 md:pb-10 md:pt-14">
      <div className="w-full max-w-md mx-auto px-4 sm:px-5">

        {/* Header */}
        <div className="flex items-center gap-3 pt-12 pb-5">
          <button
            onClick={() => { if (timerRef.current) clearInterval(timerRef.current); router.back(); }}
            className="w-9 h-9 rounded-full bg-[#111111] flex items-center justify-center shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-white/50" />
              <h1 className="text-white font-bold text-lg">Memory</h1>
            </div>
            <p className="text-white/30 text-xs">Study · Recall · Win</p>
          </div>
          <div className="text-right">
            <p className="text-white/30 text-[10px]">Balance</p>
            <p className="text-yellow-400 font-mono font-bold text-sm">${balance.toLocaleString()}</p>
          </div>
        </div>

        {/* HUD */}
        {showHud && (
          <div className="bg-[#111111] rounded-2xl px-5 py-3 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/30 text-[10px]">Round</p>
                <p className="text-white font-bold font-mono text-sm">{round} / {TOTAL_ROUNDS}</p>
              </div>
              {phase === 'study' && (
                <div className="text-center">
                  <p className="text-white/30 text-[10px]">Memorize in</p>
                  <p className="text-white font-black text-2xl font-mono">{studyTime}s</p>
                </div>
              )}
              {phase === 'recall' && (
                <div className="text-center">
                  <p className="text-white/30 text-[10px]">Selected</p>
                  <p className="text-white font-bold font-mono text-sm">{selected.size} / {roundCfg.countEach}</p>
                </div>
              )}
              {phase === 'round-result' && roundResult && (
                <div className="text-center">
                  <p className="text-white/30 text-[10px]">This round</p>
                  <p className={`font-bold font-mono text-sm ${roundResult.wrongCount > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {roundResult.correct.length}/{roundCfg.countEach} · {roundResult.wrongCount} wrong
                  </p>
                </div>
              )}
              <div className="text-right">
                <p className="text-white/30 text-[10px]">Total wrong</p>
                <p className={`font-bold font-mono text-sm ${totalWrong >= 7 ? 'text-red-400' : totalWrong >= 5 ? 'text-yellow-400' : 'text-white'}`}>
                  {totalWrong} / {MAX_WRONG - 1}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── MODE SELECT ── */}
        {phase === 'mode-select' && (
          <div className="space-y-4">
            <button
              onClick={() => startGame('training')}
              className="w-full bg-[#111111] rounded-2xl p-6 text-left hover:bg-[#161616] transition-colors"
            >
              <p className="text-white font-black text-xl mb-1">Training Mode</p>
              <p className="text-white/40 text-sm leading-relaxed">
                Practice for free. No bet, no payout. Perfect for learning the mechanic.
              </p>
            </button>

            <button
              onClick={() => { setMode('earning'); setPhase('earning-setup'); }}
              className="w-full bg-[#111111] rounded-2xl p-6 text-left hover:bg-[#161616] transition-colors border border-yellow-400/20"
            >
              <p className="text-white font-black text-xl mb-1">Earning Mode</p>
              <p className="text-white/40 text-sm mb-4 leading-relaxed">
                Bet on your memory. Complete all 3 rounds to earn a payout.
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {MULT_TABLE.map(r => (
                  <div key={r.label} className="text-center">
                    <p className="text-white/25 text-[9px] leading-tight">{r.label}</p>
                    <p className={`font-bold text-xs font-mono mt-0.5 ${r.color}`}>{r.mult}</p>
                  </div>
                ))}
              </div>
            </button>

            <div className="bg-[#111111] rounded-2xl p-4 space-y-1.5">
              <p className="text-white/50 text-xs font-bold mb-2">How it works</p>
              <p className="text-white/30 text-xs">• Icons flash on the grid for a few seconds — memorize their positions.</p>
              <p className="text-white/30 text-xs">• Icons hide. You&apos;re asked: <span className="text-white/60">&ldquo;Where was the Crown?&rdquo;</span></p>
              <p className="text-white/30 text-xs">• Click every box where that icon appeared.</p>
              <p className="text-white/30 text-xs">• Wrong clicks = wrong guesses. 9 total wrong = game over.</p>
              <p className="text-white/30 text-xs">• Round 1: 16 boxes → Round 2: 8 boxes → Round 3: 4 boxes.</p>
            </div>
          </div>
        )}

        {/* ── EARNING SETUP ── */}
        {phase === 'earning-setup' && (
          <div className="bg-[#111111] rounded-2xl p-5 space-y-5">
            <div>
              <label className="text-xs text-white/40 tracking-wider uppercase block mb-3">Bet Amount</label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_BETS.map(v => (
                  <button
                    key={v}
                    onClick={() => setBet(v)}
                    className={`px-4 py-2 rounded-full text-sm font-mono transition-all ${
                      bet === v ? 'bg-white text-black font-bold' : 'bg-[#1c1c1c] text-white/60 hover:text-white border border-white/8'
                    }`}
                  >
                    ${v}
                  </button>
                ))}
                <input
                  type="number"
                  value={bet}
                  min={1}
                  max={balance}
                  onChange={e => setBet(Number(e.target.value))}
                  className="px-3 py-2 rounded-full text-sm font-mono border border-white/8 bg-[#1c1c1c] text-white w-20 focus:outline-none focus:border-white/30"
                />
              </div>
            </div>

            <div className="bg-[#1a1a1a] rounded-xl p-4">
              <p className="text-white/30 text-xs tracking-wider mb-3 uppercase">Payout Table</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {MULT_TABLE.map(r => (
                  <div key={r.label} className="text-center">
                    <p className="text-white/25 text-[9px] leading-tight">{r.label}</p>
                    <p className={`font-bold text-xs font-mono mt-1 ${r.color}`}>{r.mult}</p>
                  </div>
                ))}
              </div>
            </div>

            {msg && <p className="text-red-400 text-xs text-center">{msg}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setPhase('mode-select')}
                className="flex-1 bg-[#1a1a1a] text-white font-bold py-3.5 rounded-full text-sm border border-white/10"
              >
                Back
              </button>
              <button
                onClick={() => startGame('earning')}
                disabled={loading || bet <= 0 || bet > balance}
                className="flex-1 bg-white text-black font-bold py-3.5 rounded-full text-sm hover:bg-white/90 transition-all disabled:opacity-40"
              >
                {loading ? 'Starting…' : `Bet $${bet} & Play`}
              </button>
            </div>
          </div>
        )}

        {/* ── STUDY PHASE ── */}
        {phase === 'study' && (
          <div className="space-y-4">
            <div className="bg-[#111111] rounded-xl px-4 py-3 text-center">
              <p className="text-white font-bold text-sm">Memorize all icon positions!</p>
              <p className="text-white/35 text-xs mt-0.5">You&apos;ll be asked where ONE specific icon was located.</p>
            </div>

            <div className={`grid ${roundCfg.cols} gap-2`}>
              {grid.map((iconKey, idx) => {
                const iconCfg = roundCfg.icons.find(i => i.key === iconKey)!;
                return (
                  <div
                    key={idx}
                    className="aspect-square rounded-xl bg-[#1a1a1a] border border-white/8 flex items-center justify-center"
                  >
                    <iconCfg.Icon size={roundCfg.iconSize} style={iconCfg.iconStyle} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── RECALL PHASE ── */}
        {phase === 'recall' && targetCfg && (
          <div className="space-y-4">
            {/* Target instruction */}
            <div className="bg-[#111111] rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#1a1a1a] border border-white/10 flex items-center justify-center shrink-0">
                <targetCfg.Icon size={roundCfg.iconSize - 2} style={targetCfg.iconStyle} />
              </div>
              <div>
                <p className="text-white font-bold text-sm">
                  Where was the <span style={{ color: (targetCfg.iconStyle.color as string) }}>{targetCfg.label}</span>?
                </p>
                <p className="text-white/35 text-xs mt-0.5">
                  Click all {roundCfg.countEach} boxes where {targetCfg.label} appeared.
                </p>
              </div>
            </div>

            {/* Grid — blank boxes, clickable */}
            <div className={`grid ${roundCfg.cols} gap-2`}>
              {grid.map((_, idx) => {
                const isSel = selected.has(idx);
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelected(prev => {
                        const next = new Set(prev);
                        if (next.has(idx)) next.delete(idx); else next.add(idx);
                        return next;
                      });
                    }}
                    className={`aspect-square rounded-xl border transition-all active:scale-95 select-none ${
                      isSel
                        ? 'bg-white/15 border-white/40'
                        : 'bg-[#1a1a1a] border-white/8 hover:border-white/20 hover:bg-white/5'
                    }`}
                  >
                    {isSel && (
                      <div className="flex items-center justify-center h-full">
                        <div className="w-2.5 h-2.5 rounded-full bg-white/60" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={submitRecall}
              disabled={selected.size === 0}
              className="w-full bg-white text-black font-bold py-4 rounded-full text-sm hover:bg-white/90 transition-all disabled:opacity-40"
            >
              Submit — {selected.size} selected
            </button>
          </div>
        )}

        {/* ── ROUND RESULT ── */}
        {phase === 'round-result' && roundResult && targetCfg && (
          <div className="space-y-4">
            {/* Banner */}
            {(roundResult.isGameOver || roundResult.isWon) && (
              <div className={`rounded-2xl px-5 py-5 text-center ${
                roundResult.isWon
                  ? 'bg-green-500/10 border border-green-500/20'
                  : 'bg-red-500/10 border border-red-500/20'
              }`}>
                <p className={`font-black text-2xl mb-1 ${roundResult.isWon ? 'text-green-400' : 'text-red-400'}`}>
                  {roundResult.isWon ? 'You Won!' : 'Game Over'}
                </p>
                <p className="text-white/40 text-sm">
                  {roundResult.isWon
                    ? `All ${TOTAL_ROUNDS} rounds complete · ${totalWrong} total wrong clicks`
                    : `${totalWrong} wrong clicks — limit reached`}
                </p>
                {roundResult.isWon && mode === 'earning' && (
                  gameResult
                    ? <p className="text-yellow-400 font-black text-3xl font-mono mt-3">+${gameResult.payout} ({gameResult.multiplier}x)</p>
                    : <p className="text-white/30 text-sm mt-2 animate-pulse">Calculating payout…</p>
                )}
                {roundResult.isWon && mode === 'training' && (
                  <p className="text-white/40 text-xs mt-2">Training mode — no payout</p>
                )}
              </div>
            )}

            {/* Per-round score (shown for intermediate rounds too) */}
            {!roundResult.isGameOver && !roundResult.isWon && (
              <div className={`rounded-xl px-4 py-3 ${
                roundResult.wrongCount === 0
                  ? 'bg-green-500/10 border border-green-500/20'
                  : 'bg-yellow-400/10 border border-yellow-400/20'
              }`}>
                <p className={`font-bold text-sm ${roundResult.wrongCount === 0 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {roundResult.wrongCount === 0 ? `Round ${round} — Perfect!` : `Round ${round} — ${roundResult.correct.length}/${roundCfg.countEach} correct`}
                </p>
                <p className="text-white/35 text-xs mt-0.5">
                  {roundResult.wrongCount} wrong click{roundResult.wrongCount !== 1 ? 's' : ''} · {roundResult.missed.length} missed
                </p>
              </div>
            )}

            {/* Grid with full reveal */}
            <div className={`grid ${roundCfg.cols} gap-2`}>
              {grid.map((iconKey, idx) => {
                const state = boxResultState(idx);
                const iconCfg = roundCfg.icons.find(i => i.key === iconKey)!;
                const isTarget = iconKey === targetKey;
                return (
                  <div
                    key={idx}
                    className={`aspect-square rounded-xl border flex items-center justify-center ${
                      state === 'correct' ? 'bg-green-500/15 border-green-500/40'  :
                      state === 'wrong'   ? 'bg-red-500/15   border-red-500/40'    :
                      state === 'missed'  ? 'bg-orange-500/15 border-orange-500/35' :
                      'bg-[#1a1a1a] border-white/5'
                    }`}
                  >
                    <iconCfg.Icon
                      size={roundCfg.iconSize}
                      style={{
                        ...iconCfg.iconStyle,
                        opacity: state === 'neutral' ? 0.2 : isTarget ? 1 : 0.45,
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 flex-wrap text-white/40 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded bg-green-500/40" /> Correct
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded bg-red-500/40" /> Wrong click
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded bg-orange-500/40" /> Missed
              </span>
            </div>

            {/* Actions */}
            {roundResult.isGameOver || roundResult.isWon ? (
              <div className="flex gap-3">
                <button onClick={resetGame} className="flex-1 bg-white text-black font-bold py-3.5 rounded-full text-sm">
                  Play Again
                </button>
                <button onClick={() => router.push('/games')} className="flex-1 bg-[#111111] text-white font-bold py-3.5 rounded-full text-sm border border-white/10">
                  All Games
                </button>
              </div>
            ) : (
              <button onClick={proceedToNextRound} className="w-full bg-white text-black font-bold py-4 rounded-full text-sm hover:bg-white/90 transition-all">
                Next Round →
              </button>
            )}
          </div>
        )}

      </div>
      <BottomNav />
    </div>
  );
}
