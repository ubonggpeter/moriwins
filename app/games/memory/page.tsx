'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Gem, Star, Moon, Skull, Globe, Zap, Heart, Crown, Layers, type LucideIcon } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

// Common icon that appears N times per round
const COMMON_KEY = 'star';

interface IconCfg {
  Icon: LucideIcon;
  vivid: string;
  muted: string;
  glow: string;
}

const ICON_CFGS: Record<string, IconCfg> = {
  star:   { Icon: Star,   vivid: '#facc15', muted: '#7a6612', glow: 'rgba(250,204,21,0.5)'  },
  heart:  { Icon: Heart,  vivid: '#f43f5e', muted: '#7a2030', glow: 'rgba(244,63,94,0.5)'   },
  zap:    { Icon: Zap,    vivid: '#60a5fa', muted: '#30527a', glow: 'rgba(96,165,250,0.5)'  },
  crown:  { Icon: Crown,  vivid: '#c084fc', muted: '#60427a', glow: 'rgba(192,132,252,0.5)' },
  gem:    { Icon: Gem,    vivid: '#34d399', muted: '#1a6a4a', glow: 'rgba(52,211,153,0.5)'  },
  moon:   { Icon: Moon,   vivid: '#a78bfa', muted: '#53457a', glow: 'rgba(167,139,250,0.5)' },
  globe:  { Icon: Globe,  vivid: '#38bdf8', muted: '#1c5f7a', glow: 'rgba(56,189,248,0.5)'  },
  skull:  { Icon: Skull,  vivid: '#fb923c', muted: '#7a491e', glow: 'rgba(251,146,60,0.5)'  },
  layers: { Icon: Layers, vivid: '#4ade80', muted: '#25703f', glow: 'rgba(74,222,128,0.5)'  },
};

// Round 1: 8 pairs (16 cards), Round 2: 4 pairs (8 cards), Round 3: 2 pairs (4 cards)
const ROUND_CONFIGS = [
  { pairs: 8, uniqueKeys: ['heart','zap','crown','gem','moon','globe','skull','layers'], cols: 'grid-cols-4', iconSize: 22 },
  { pairs: 4, uniqueKeys: ['heart','zap','crown','gem'], cols: 'grid-cols-4', iconSize: 28 },
  { pairs: 2, uniqueKeys: ['heart','zap'], cols: 'grid-cols-2', iconSize: 36 },
] as const;

const TOTAL_ROUNDS = 3;

// Loss at 9 wrong across all rounds
const MAX_WRONG = 9;

const MULT_TABLE = [
  { label: '0 wrong', mult: '3.0x', color: 'text-green-400' },
  { label: '1–2 wrong', mult: '2.5x', color: 'text-green-400' },
  { label: '3–4 wrong', mult: '2.0x', color: 'text-yellow-400' },
  { label: '5–6 wrong', mult: '1.5x', color: 'text-yellow-400' },
  { label: '7–8 wrong', mult: '1.2x', color: 'text-orange-400' },
  { label: '9+ wrong', mult: 'Loss', color: 'text-red-400' },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildCards(uniqueKeys: readonly string[]): string[] {
  const commons = uniqueKeys.map(() => COMMON_KEY);
  return shuffle([...commons, ...uniqueKeys]);
}

function getIconStyle(key: string, round: number): React.CSSProperties {
  const cfg = ICON_CFGS[key];
  if (!cfg) return {};
  if (round === 1) return {
    color: cfg.vivid,
    filter: `drop-shadow(0 0 7px ${cfg.glow}) drop-shadow(2px 4px 6px rgba(0,0,0,0.85))`,
  };
  if (round === 2) return {
    color: cfg.muted,
    filter: 'drop-shadow(2px 3px 5px rgba(0,0,0,0.6))',
  };
  // Round 3: grayscale white
  return {
    color: '#c0c0c0',
    filter: 'grayscale(1) drop-shadow(1px 2px 3px rgba(0,0,0,0.4))',
  };
}

type GamePhase = 'idle' | 'preview' | 'playing' | 'round-complete' | 'won' | 'lost';

export default function MemoryPage() {
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [bet, setBet] = useState(50);
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [gameId, setGameId] = useState('');
  const [round, setRound] = useState(1);
  const [cards, setCards] = useState<string[]>([]);
  const [flipped, setFlipped] = useState<boolean[]>([]);
  const [matched, setMatched] = useState<boolean[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [wrongGuesses, setWrongGuesses] = useState(0);   // per-round display
  const [totalWrong, setTotalWrong] = useState(0);       // cumulative
  const [countdown, setCountdown] = useState(3);
  const [result, setResult] = useState<{ won: boolean; payout: number; multiplier: number } | null>(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const lockRef = useRef(false);
  const stateRef = useRef({
    cards: [] as string[],
    flipped: [] as boolean[],
    matched: [] as boolean[],
    selected: [] as number[],
    wrongGuesses: 0,
    totalWrong: 0,
    round: 1,
    gameId: '',
    bet: 50,
    phase: 'idle' as GamePhase,
  });

  useEffect(() => { stateRef.current.cards    = cards;        }, [cards]);
  useEffect(() => { stateRef.current.flipped   = flipped;     }, [flipped]);
  useEffect(() => { stateRef.current.matched   = matched;     }, [matched]);
  useEffect(() => { stateRef.current.selected  = selected;    }, [selected]);
  useEffect(() => { stateRef.current.wrongGuesses = wrongGuesses; }, [wrongGuesses]);
  useEffect(() => { stateRef.current.totalWrong   = totalWrong;   }, [totalWrong]);
  useEffect(() => { stateRef.current.round     = round;       }, [round]);
  useEffect(() => { stateRef.current.gameId    = gameId;      }, [gameId]);
  useEffect(() => { stateRef.current.bet       = bet;         }, [bet]);
  useEffect(() => { stateRef.current.phase     = phase;       }, [phase]);

  useEffect(() => {
    fetch('/api/user').then(r => r.json()).then(d => {
      if (d.balance !== undefined) setBalance(d.balance);
    });
  }, []);

  function startRound(roundNum: number) {
    const cfg = ROUND_CONFIGS[roundNum - 1];
    const shuffledCards = buildCards(cfg.uniqueKeys);
    const cardCount = cfg.pairs * 2;
    const allFlipped = Array(cardCount).fill(true) as boolean[];
    const noneMatched = Array(cardCount).fill(false) as boolean[];

    stateRef.current.cards      = shuffledCards;
    stateRef.current.flipped    = [...allFlipped];
    stateRef.current.matched    = [...noneMatched];
    stateRef.current.selected   = [];
    stateRef.current.wrongGuesses = 0;
    stateRef.current.round      = roundNum;
    stateRef.current.phase      = 'preview';

    setRound(roundNum);
    setCards(shuffledCards);
    setFlipped([...allFlipped]);
    setMatched([...noneMatched]);
    setSelected([]);
    setWrongGuesses(0);
    setPhase('preview');
    lockRef.current = false;

    let c = 3;
    setCountdown(c);
    const tick = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(tick);
        const hidden = Array(cardCount).fill(false) as boolean[];
        setFlipped(hidden);
        stateRef.current.flipped = hidden;
        setPhase('playing');
        stateRef.current.phase = 'playing';
      }
    }, 1000);
  }

  async function startGame() {
    if (loading) return;
    setMsg('');
    setLoading(true);

    const res = await fetch('/api/games/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bet }),
    });
    const data = await res.json();

    if (!res.ok) {
      setMsg(data.error);
      setLoading(false);
      return;
    }

    setBalance(data.balance);
    setGameId(data.gameId);
    stateRef.current.gameId = data.gameId;
    setTotalWrong(0);
    stateRef.current.totalWrong = 0;
    setResult(null);
    setLoading(false);
    startRound(1);
  }

  async function completeGame(won: boolean, wrongs: number, gid: string) {
    setPhase(won ? 'won' : 'lost');
    stateRef.current.phase = won ? 'won' : 'lost';
    const res = await fetch('/api/games/memory', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId: gid, won, wrongGuesses: wrongs }),
    });
    const data = await res.json();
    setBalance(data.balance);
    setResult({ won: data.won, payout: data.payout, multiplier: data.multiplier });
  }

  async function handleCardClick(idx: number) {
    const s = stateRef.current;
    if (s.phase !== 'playing' || s.flipped[idx] || s.matched[idx] || lockRef.current) return;
    if (s.selected.length >= 2) return;

    const newFlipped = [...s.flipped];
    newFlipped[idx] = true;
    setFlipped(newFlipped);
    stateRef.current.flipped = newFlipped;

    const newSelected = [...s.selected, idx];
    setSelected(newSelected);
    stateRef.current.selected = newSelected;

    if (newSelected.length < 2) return;

    lockRef.current = true;
    const [a, b] = newSelected;

    await new Promise(r => setTimeout(r, 750));

    const aIsStar = s.cards[a] === COMMON_KEY;
    const bIsStar = s.cards[b] === COMMON_KEY;
    const isMatch = aIsStar !== bIsStar; // valid pair = one common + one unique

    if (isMatch) {
      const newMatched = [...s.matched];
      newMatched[a] = true;
      newMatched[b] = true;
      setMatched(newMatched);
      stateRef.current.matched = newMatched;
      setSelected([]);
      stateRef.current.selected = [];
      lockRef.current = false;

      const totalMatched = newMatched.filter(Boolean).length;
      const pairsForRound = ROUND_CONFIGS[s.round - 1].pairs;

      if (totalMatched === pairsForRound * 2) {
        if (s.round >= TOTAL_ROUNDS) {
          await completeGame(true, s.totalWrong, s.gameId);
        } else {
          setPhase('round-complete');
          stateRef.current.phase = 'round-complete';
          setTimeout(() => startRound(s.round + 1), 1800);
        }
      }
    } else {
      const newWrong = s.wrongGuesses + 1;
      setWrongGuesses(newWrong);
      stateRef.current.wrongGuesses = newWrong;

      const newTotalWrong = s.totalWrong + 1;
      setTotalWrong(newTotalWrong);
      stateRef.current.totalWrong = newTotalWrong;

      const resetFlipped = [...newFlipped];
      resetFlipped[a] = false;
      resetFlipped[b] = false;
      setFlipped(resetFlipped);
      stateRef.current.flipped = resetFlipped;
      setSelected([]);
      stateRef.current.selected = [];
      lockRef.current = false;

      if (newTotalWrong >= MAX_WRONG) {
        await completeGame(false, newTotalWrong, s.gameId);
      }
    }
  }

  function resetGame() {
    setPhase('idle');
    setCards([]);
    setFlipped([]);
    setMatched([]);
    setSelected([]);
    setResult(null);
    setMsg('');
    setWrongGuesses(0);
    setTotalWrong(0);
    setRound(1);
    lockRef.current = false;
  }

  const roundCfg = ROUND_CONFIGS[round - 1];
  const pairsMatched = matched.filter(Boolean).length / 2;
  const pairsRemaining = roundCfg.pairs - pairsMatched;

  return (
    <div className="min-h-screen bg-black pb-24 md:pb-10 md:pt-14">
      <div className="w-full max-w-lg mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="flex items-center gap-3 pt-12 pb-6">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-[#111111] flex items-center justify-center shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-white/60" />
              <h1 className="text-white font-bold text-lg">Memory</h1>
            </div>
            <p className="text-white/30 text-xs">3 Rounds · Star pairs · Match all to win</p>
          </div>
          <div className="text-right">
            <p className="text-white/30 text-[10px]">Balance</p>
            <p className="text-yellow-400 font-mono font-bold text-sm">${balance.toLocaleString()}</p>
          </div>
        </div>

        {/* ── IDLE: Bet setup ── */}
        {phase === 'idle' && (
          <div className="bg-[#111111] rounded-2xl p-5 mb-4 space-y-5">
            <div>
              <label className="text-xs text-white/40 tracking-wider uppercase block mb-3">Bet Amount</label>
              <div className="flex gap-2 flex-wrap">
                {[10, 25, 50, 100, 250].map(v => (
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
              <p className="text-white/30 text-xs tracking-wider mb-3 uppercase">Payout (complete all 3 rounds)</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {MULT_TABLE.map(r => (
                  <div key={r.label} className="text-center">
                    <p className="text-white/25 text-[9px] leading-tight">{r.label}</p>
                    <p className={`font-bold text-xs font-mono mt-1 ${r.color}`}>{r.mult}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#1a1a1a] rounded-xl p-4 space-y-2 text-white/30 text-xs">
              <p className="text-white/50 text-xs font-bold mb-1">How it works</p>
              <p>• <span className="text-white/60">Round 1</span> — 16 cards (4×4). 8 Stars + 8 unique icons shuffled face-down.</p>
              <p>• <span className="text-white/60">Round 2</span> — 8 cards. 4 Stars + 4 unique icons. Icons more muted.</p>
              <p>• <span className="text-white/60">Round 3</span> — 4 cards. 2 Stars + 2 unique icons. Icons grayscale.</p>
              <p>• A valid pair = one <span className="text-yellow-300">Star</span> + one unique icon. Two of the same type = wrong guess.</p>
              <p>• 9 wrong guesses = game over.</p>
            </div>

            {msg && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <p className="text-red-400 text-xs">{msg}</p>
              </div>
            )}

            <button
              onClick={startGame}
              disabled={loading || bet <= 0 || bet > balance}
              className="w-full bg-white text-black font-bold py-4 rounded-full text-sm hover:bg-white/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'STARTING...' : `BET $${bet} AND PLAY`}
            </button>
          </div>
        )}

        {/* ── PREVIEW countdown ── */}
        {phase === 'preview' && (
          <div className="bg-[#111111] rounded-2xl py-4 px-5 mb-4 text-center">
            <p className="text-white/30 text-[10px] tracking-widest uppercase mb-1">
              Round {round} of {TOTAL_ROUNDS} — {roundCfg.pairs} pairs
            </p>
            <p className="text-white/60 text-sm">
              Memorize the icons! Hiding in{' '}
              <span className="text-white font-black text-2xl font-mono">{countdown}</span>
            </p>
          </div>
        )}

        {/* ── ROUND COMPLETE banner ── */}
        {phase === 'round-complete' && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl py-4 px-5 mb-4 text-center">
            <p className="text-green-400 font-black text-xl">Round {round} Complete!</p>
            <p className="text-white/40 text-sm mt-1">
              {round < TOTAL_ROUNDS ? `Loading Round ${round + 1}…` : 'All rounds done!'}
            </p>
          </div>
        )}

        {/* ── PLAYING HUD ── */}
        {(phase === 'playing' || phase === 'preview' || phase === 'round-complete') && (
          <div className="bg-[#111111] rounded-2xl px-5 py-3.5 mb-4">
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="text-white/30 text-[10px] mb-0.5">Round</p>
                <p className="text-white font-mono font-bold text-sm">{round} / {TOTAL_ROUNDS}</p>
              </div>
              <div className="text-center">
                <p className="text-white/30 text-[10px] mb-0.5">Pairs Left</p>
                <p className="text-white font-mono font-bold text-sm">{pairsRemaining} of {roundCfg.pairs}</p>
              </div>
              <div className="text-center">
                <p className="text-white/30 text-[10px] mb-0.5">Wrong (total)</p>
                <p className={`font-mono font-bold text-sm ${totalWrong >= 7 ? 'text-red-400' : totalWrong >= 5 ? 'text-yellow-400' : 'text-white'}`}>
                  {totalWrong} / {MAX_WRONG - 1}
                </p>
              </div>
              <div className="text-center">
                <p className="text-white/30 text-[10px] mb-0.5">Bet</p>
                <p className="text-white font-mono font-bold text-sm">${bet}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── RESULT banner ── */}
        {(phase === 'won' || phase === 'lost') && result && (
          <div className={`rounded-2xl px-5 py-4 mb-4 flex items-center justify-between ${
            result.won ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'
          }`}>
            <div>
              <p className={`font-bold text-base ${result.won ? 'text-green-400' : 'text-red-400'}`}>
                {result.won ? `WON $${result.payout}! (${result.multiplier}x)` : 'YOU LOST'}
              </p>
              <p className="text-white/40 text-xs mt-0.5">
                {result.won
                  ? `All 3 rounds complete · ${totalWrong} wrong`
                  : `${totalWrong} wrong guesses — too many`}
              </p>
            </div>
            <button onClick={resetGame} className="px-5 py-2.5 bg-white text-black font-bold rounded-full text-sm">
              Again
            </button>
          </div>
        )}

        {/* ── CARD GRID ── */}
        {cards.length > 0 && (
          <div className={`grid ${roundCfg.cols} gap-2 sm:gap-3`}>
            {cards.map((iconKey, idx) => {
              const isFlipped = flipped[idx];
              const isMatch   = matched[idx];
              const showFace  = isFlipped || isMatch;
              const cfg       = ICON_CFGS[iconKey];
              const clickable = phase === 'playing' && !isFlipped && !isMatch;

              return (
                <div
                  key={idx}
                  className="aspect-square"
                  style={{ perspective: '500px' }}
                  onClick={() => handleCardClick(idx)}
                >
                  <div
                    style={{
                      transformStyle: 'preserve-3d',
                      transition: 'transform 0.38s cubic-bezier(0.4,0,0.2,1)',
                      transform: showFace ? 'rotateY(180deg)' : 'rotateY(0deg)',
                      position: 'relative',
                      width: '100%',
                      height: '100%',
                    }}
                  >
                    {/* Front — hidden face */}
                    <div
                      className={`absolute inset-0 rounded-xl bg-[#1a1a1a] border flex items-center justify-center transition-colors ${
                        clickable
                          ? 'border-white/10 hover:border-white/25 hover:bg-[#222] cursor-pointer active:scale-95'
                          : 'border-white/6 cursor-default'
                      }`}
                      style={{ backfaceVisibility: 'hidden' }}
                    >
                      <div
                        className="rounded-full"
                        style={{ width: 8, height: 8, background: 'rgba(255,255,255,0.07)' }}
                      />
                    </div>

                    {/* Back — icon face */}
                    <div
                      className="absolute inset-0 rounded-xl bg-[#1a1a1a] border border-white/10 flex items-center justify-center cursor-default"
                      style={{
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        boxShadow: isMatch
                          ? `inset 0 0 0 1px ${ICON_CFGS[iconKey]?.glow ?? 'transparent'}`
                          : 'none',
                      }}
                    >
                      {cfg && (
                        <cfg.Icon
                          size={roundCfg.iconSize}
                          style={getIconStyle(iconKey, round)}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Placeholder when idle */}
        {cards.length === 0 && (
          <div className="grid grid-cols-4 gap-2 opacity-15">
            {Array(16).fill(null).map((_, i) => (
              <div key={i} className="aspect-square rounded-xl bg-[#1a1a1a] border border-white/5" />
            ))}
          </div>
        )}

      </div>
      <BottomNav />
    </div>
  );
}
