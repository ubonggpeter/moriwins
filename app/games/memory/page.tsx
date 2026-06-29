'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Gem, Star, Moon, Skull, Globe, Zap, Heart, Crown, Layers, type LucideIcon } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

interface IconConfig {
  key: string;
  Icon: LucideIcon;
  color: string;
  glow: string;
  gradFrom: string;
  gradTo: string;
  border: string;
}

const ICON_CONFIGS: IconConfig[] = [
  { key: 'star',  Icon: Star,  color: '#facc15', glow: 'rgba(250,204,21,0.45)',  gradFrom: '#1a1100', gradTo: '#0d0800', border: '#6b5600' },
  { key: 'heart', Icon: Heart, color: '#f43f5e', glow: 'rgba(244,63,94,0.45)',   gradFrom: '#1a0008', gradTo: '#0d0004', border: '#7f1d29' },
  { key: 'zap',   Icon: Zap,   color: '#60a5fa', glow: 'rgba(96,165,250,0.45)',  gradFrom: '#00091a', gradTo: '#00040d', border: '#1e3a5f' },
  { key: 'crown', Icon: Crown, color: '#c084fc', glow: 'rgba(192,132,252,0.45)', gradFrom: '#0d001a', gradTo: '#08000d', border: '#4c1d95' },
  { key: 'gem',   Icon: Gem,   color: '#34d399', glow: 'rgba(52,211,153,0.45)',  gradFrom: '#001a0e', gradTo: '#000d07', border: '#065f46' },
  { key: 'moon',  Icon: Moon,  color: '#a78bfa', glow: 'rgba(167,139,250,0.45)', gradFrom: '#0a001a', gradTo: '#05000d', border: '#3b1d7a' },
  { key: 'globe', Icon: Globe, color: '#38bdf8', glow: 'rgba(56,189,248,0.45)',  gradFrom: '#00141a', gradTo: '#000a0d', border: '#0c4a6e' },
  { key: 'skull', Icon: Skull, color: '#fb923c', glow: 'rgba(251,146,60,0.45)',  gradFrom: '#1a0800', gradTo: '#0d0400', border: '#7c2d12' },
];

const ROUNDS_PAIRS = [8, 7, 6, 5, 4, 3, 2];
const TOTAL_ROUNDS = 7;

const MULT_TABLE = [
  { label: '0 wrong', mult: '3.0x', color: 'text-green-400' },
  { label: '1–3 wrong', mult: '2.5x', color: 'text-green-400' },
  { label: '4–7 wrong', mult: '2.0x', color: 'text-yellow-400' },
  { label: '8–11 wrong', mult: '1.5x', color: 'text-yellow-400' },
  { label: '12–14 wrong', mult: '1.2x', color: 'text-orange-400' },
  { label: '15+ wrong', mult: 'Loss', color: 'text-red-400' },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type GamePhase = 'idle' | 'preview' | 'playing' | 'round-complete' | 'won' | 'lost';

export default function MemoryPage() {
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [bet, setBet] = useState(50);
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [gameId, setGameId] = useState('');
  const [cards, setCards] = useState<string[]>([]);
  const [flipped, setFlipped] = useState<boolean[]>([]);
  const [matched, setMatched] = useState<boolean[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [wrongGuesses, setWrongGuesses] = useState(0);
  const [totalWrong, setTotalWrong] = useState(0);
  const [round, setRound] = useState(1);
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

  useEffect(() => { stateRef.current.cards = cards; }, [cards]);
  useEffect(() => { stateRef.current.flipped = flipped; }, [flipped]);
  useEffect(() => { stateRef.current.matched = matched; }, [matched]);
  useEffect(() => { stateRef.current.selected = selected; }, [selected]);
  useEffect(() => { stateRef.current.wrongGuesses = wrongGuesses; }, [wrongGuesses]);
  useEffect(() => { stateRef.current.totalWrong = totalWrong; }, [totalWrong]);
  useEffect(() => { stateRef.current.round = round; }, [round]);
  useEffect(() => { stateRef.current.gameId = gameId; }, [gameId]);
  useEffect(() => { stateRef.current.bet = bet; }, [bet]);
  useEffect(() => { stateRef.current.phase = phase; }, [phase]);

  useEffect(() => {
    fetch('/api/user').then(r => r.json()).then(d => {
      if (d.balance !== undefined) setBalance(d.balance);
    });
  }, []);

  function startRound(roundNum: number) {
    const pairs = ROUNDS_PAIRS[roundNum - 1];
    const icons = ICON_CONFIGS.slice(0, pairs).map(c => c.key);
    const shuffledCards = shuffle([...icons, ...icons]);
    const cardCount = pairs * 2;
    const allFlipped = Array(cardCount).fill(true) as boolean[];
    const noneMatched = Array(cardCount).fill(false) as boolean[];

    stateRef.current.cards = shuffledCards;
    stateRef.current.flipped = [...allFlipped];
    stateRef.current.matched = [...noneMatched];
    stateRef.current.selected = [];
    stateRef.current.wrongGuesses = 0;
    stateRef.current.round = roundNum;
    stateRef.current.phase = 'preview';

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

    await new Promise(r => setTimeout(r, 700));

    if (s.cards[a] === s.cards[b]) {
      const newMatched = [...s.matched];
      newMatched[a] = true;
      newMatched[b] = true;
      setMatched(newMatched);
      stateRef.current.matched = newMatched;
      setSelected([]);
      stateRef.current.selected = [];
      lockRef.current = false;

      const totalMatched = newMatched.filter(Boolean).length;
      const pairsForRound = ROUNDS_PAIRS[s.round - 1];
      const cardCountForRound = pairsForRound * 2;

      if (totalMatched === cardCountForRound) {
        if (s.round >= TOTAL_ROUNDS) {
          await completeGame(true, s.totalWrong, s.gameId);
        } else {
          setPhase('round-complete');
          stateRef.current.phase = 'round-complete';
          const nextRound = s.round + 1;
          setTimeout(() => { startRound(nextRound); }, 1800);
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

      if (newTotalWrong >= 15) {
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

  const currentPairs = ROUNDS_PAIRS[round - 1] ?? 8;
  const gridCols = cards.length <= 4 ? 'grid-cols-2' : cards.length <= 6 ? 'grid-cols-3' : 'grid-cols-4';
  const iconSize = currentPairs <= 2 ? 32 : currentPairs <= 4 ? 28 : currentPairs <= 6 ? 24 : 20;

  return (
    <div className="min-h-screen bg-black pb-24 md:pb-10 md:pt-14">
      <div className="w-full max-w-2xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="flex items-center gap-3 pt-12 pb-6">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-[#111111] flex items-center justify-center"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Layers size={20} className="text-white/70" />
              <h1 className="text-white font-bold text-lg">Memory</h1>
            </div>
            <p className="text-white/30 text-xs">7 Rounds · Match All · Win</p>
          </div>
          <div className="text-right">
            <p className="text-white/30 text-[10px]">Balance</p>
            <p className="text-yellow-400 font-mono font-bold text-sm">${balance.toLocaleString()}</p>
          </div>
        </div>

        {/* Bet setup */}
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
                      bet === v
                        ? 'bg-white text-black font-bold'
                        : 'bg-[#1c1c1c] text-white/60 hover:text-white border border-white/8'
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

            <div className="bg-[#1c1c1c] rounded-xl p-4">
              <p className="text-white/30 text-xs tracking-wider mb-3 uppercase">Payout Table — Complete all 7 rounds</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {MULT_TABLE.map(r => (
                  <div key={r.label} className="text-center">
                    <p className="text-white/30 text-[9px] leading-tight">{r.label}</p>
                    <p className={`font-bold text-xs font-mono mt-1 ${r.color}`}>{r.mult}</p>
                  </div>
                ))}
              </div>
            </div>

            {msg && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <p className="text-red-400 text-xs">{msg}</p>
              </div>
            )}

            <button
              onClick={startGame}
              disabled={loading || bet <= 0 || bet > balance}
              className="w-full bg-white text-black font-bold py-4 rounded-full tracking-wider text-sm hover:bg-white/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'STARTING...' : `BET $${bet} AND PLAY`}
            </button>
          </div>
        )}

        {/* Preview countdown */}
        {phase === 'preview' && (
          <div className="bg-[#111111] rounded-2xl py-5 mb-4 text-center">
            <p className="text-white/30 text-[10px] tracking-widest uppercase mb-1">Round {round} of {TOTAL_ROUNDS} · {currentPairs} pairs</p>
            <p className="text-white/50 text-sm tracking-widest uppercase">
              Memorize! Hiding in{' '}
              <span className="text-white font-bold text-2xl font-mono">{countdown}</span>
            </p>
          </div>
        )}

        {/* Round complete */}
        {phase === 'round-complete' && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl py-5 mb-4 text-center">
            <p className="text-green-400 font-black text-xl">Round {round} Complete!</p>
            <p className="text-white/40 text-sm mt-1">Get ready for Round {round + 1} of {TOTAL_ROUNDS}…</p>
          </div>
        )}

        {/* Playing HUD */}
        {(phase === 'playing' || phase === 'preview' || phase === 'round-complete') && (
          <div className="bg-[#111111] rounded-2xl px-5 py-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/30 text-[10px] mb-0.5">Round</p>
                <p className="text-white font-mono font-bold">{round} / {TOTAL_ROUNDS}</p>
              </div>
              <div className="text-center">
                <p className="text-white/30 text-[10px] mb-0.5">Pairs Found</p>
                <p className="text-white font-mono font-bold">
                  {matched.filter(Boolean).length / 2} / {currentPairs}
                </p>
              </div>
              <div className="text-center">
                <p className="text-white/30 text-[10px] mb-0.5">Total Wrong</p>
                <p className={`font-mono font-bold text-lg ${totalWrong >= 12 ? 'text-red-400' : totalWrong >= 8 ? 'text-yellow-400' : 'text-white'}`}>
                  {totalWrong} / 14
                </p>
              </div>
              <div>
                <p className="text-white/30 text-[10px] mb-0.5">Bet</p>
                <p className="text-white font-mono font-bold">${bet}</p>
              </div>
            </div>
          </div>
        )}

        {/* Result banner */}
        {(phase === 'won' || phase === 'lost') && result && (
          <div className={`rounded-2xl px-5 py-4 mb-4 flex items-center justify-between ${
            result.won
              ? 'bg-green-500/10 border border-green-500/20'
              : 'bg-red-500/10 border border-red-500/20'
          }`}>
            <div>
              <p className={`font-bold text-base ${result.won ? 'text-green-400' : 'text-red-400'}`}>
                {result.won ? `WON $${result.payout}! (${result.multiplier}x)` : 'YOU LOST'}
              </p>
              <p className="text-white/40 text-xs mt-0.5">
                {result.won
                  ? `All 7 rounds clear · ${totalWrong} total wrong`
                  : `${totalWrong} wrong guesses — too many`}
              </p>
            </div>
            <button
              onClick={resetGame}
              className="px-5 py-2.5 bg-white text-black font-bold rounded-full text-sm"
            >
              Again
            </button>
          </div>
        )}

        {/* 3D Card grid */}
        {cards.length > 0 && (
          <div className={`grid ${gridCols} gap-2 sm:gap-3`}>
            {cards.map((iconKey, idx) => {
              const isFlipped = flipped[idx];
              const isMatch = matched[idx];
              const cfg = ICON_CONFIGS.find(c => c.key === iconKey)!;
              const showFace = isFlipped || isMatch;
              const clickable = phase === 'playing' && !isFlipped && !isMatch && !lockRef.current;

              return (
                <div
                  key={idx}
                  className="aspect-square"
                  style={{ perspective: '600px' }}
                  onClick={() => handleCardClick(idx)}
                >
                  <div
                    style={{
                      transformStyle: 'preserve-3d',
                      transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: showFace ? 'rotateY(180deg)' : 'rotateY(0deg)',
                      position: 'relative',
                      width: '100%',
                      height: '100%',
                    }}
                  >
                    {/* Front — hidden face */}
                    <div
                      className={`absolute inset-0 rounded-xl flex items-center justify-center transition-colors ${
                        clickable
                          ? 'bg-[#111111] border border-white/8 hover:border-white/20 hover:bg-white/5 cursor-pointer active:scale-95'
                          : 'bg-[#111111] border border-white/5 cursor-default'
                      }`}
                      style={{ backfaceVisibility: 'hidden' }}
                    >
                      <div className="w-3 h-3 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }} />
                    </div>

                    {/* Back — icon face */}
                    <div
                      className="absolute inset-0 rounded-xl flex items-center justify-center cursor-default"
                      style={{
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        background: `radial-gradient(circle at 35% 35%, ${cfg.gradFrom}, ${cfg.gradTo})`,
                        border: `1px solid ${cfg.border}`,
                        boxShadow: isMatch ? `0 0 18px ${cfg.glow}, inset 0 0 18px ${cfg.glow}` : 'none',
                      }}
                    >
                      <cfg.Icon
                        size={iconSize}
                        style={{
                          color: cfg.color,
                          filter: `drop-shadow(0 0 8px ${cfg.glow})`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Placeholder grid when no cards */}
        {cards.length === 0 && (
          <div className="grid grid-cols-4 gap-2 opacity-20">
            {Array(16).fill(null).map((_, i) => (
              <div key={i} className="aspect-square rounded-xl bg-[#111111] border border-white/5" />
            ))}
          </div>
        )}

        {/* How to play */}
        <div className="mt-5 bg-[#111111] rounded-2xl p-4">
          <p className="text-white/25 text-xs tracking-wider mb-2 uppercase">How to play</p>
          <ul className="text-white/30 text-xs space-y-1">
            <li>• 7 rounds total: starts at 8 pairs, shrinks by 1 each round (ends at 2 pairs)</li>
            <li>• Cards flash for 3 seconds — memorize positions before they hide!</li>
            <li>• Match all pairs each round to advance. 15 total wrong = game over.</li>
            <li>• Complete all 7 rounds to earn your payout.</li>
          </ul>
        </div>

      </div>
      <BottomNav />
    </div>
  );
}
