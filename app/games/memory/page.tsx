'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';

const ICONS = ['🎰', '💎', '🃏', '♠️', '🔮', '⭐', '💀', '🌙'];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type GamePhase = 'idle' | 'preview' | 'playing' | 'won' | 'lost';

const MULT_TABLE = [
  { label: '0 wrong', mult: '2.5x', color: 'text-green-400' },
  { label: '1–2 wrong', mult: '2.0x', color: 'text-green-400' },
  { label: '3–5 wrong', mult: '1.5x', color: 'text-yellow-400' },
  { label: '6–8 wrong', mult: '1.2x', color: 'text-yellow-400' },
  { label: '9+ wrong', mult: 'Loss', color: 'text-red-400' },
];

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
  const [countdown, setCountdown] = useState(3);
  const [result, setResult] = useState<{ won: boolean; payout: number; multiplier: number } | null>(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Refs to avoid stale closure in async handlers
  const lockRef = useRef(false);
  const stateRef = useRef({
    cards: [] as string[],
    flipped: [] as boolean[],
    matched: [] as boolean[],
    selected: [] as number[],
    wrongGuesses: 0,
    gameId: '',
    bet: 50,
    phase: 'idle' as GamePhase,
  });

  // Keep ref in sync
  useEffect(() => { stateRef.current.cards = cards; }, [cards]);
  useEffect(() => { stateRef.current.flipped = flipped; }, [flipped]);
  useEffect(() => { stateRef.current.matched = matched; }, [matched]);
  useEffect(() => { stateRef.current.selected = selected; }, [selected]);
  useEffect(() => { stateRef.current.wrongGuesses = wrongGuesses; }, [wrongGuesses]);
  useEffect(() => { stateRef.current.gameId = gameId; }, [gameId]);
  useEffect(() => { stateRef.current.bet = bet; }, [bet]);
  useEffect(() => { stateRef.current.phase = phase; }, [phase]);

  useEffect(() => {
    fetch('/api/user').then(r => r.json()).then(d => {
      if (d.balance !== undefined) setBalance(d.balance);
    });
  }, []);

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

    const shuffled = shuffle([...ICONS, ...ICONS]);
    const initialFlipped = Array(16).fill(true);
    setCards(shuffled);
    setFlipped(initialFlipped);
    setMatched(Array(16).fill(false));
    setSelected([]);
    setWrongGuesses(0);
    setResult(null);
    setPhase('preview');
    lockRef.current = false;
    setLoading(false);

    let c = 3;
    setCountdown(c);
    const tick = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(tick);
        setFlipped(Array(16).fill(false));
        setPhase('playing');
      }
    }, 1000);
  }

  async function completeGame(won: boolean, wrongs: number, gid: string) {
    setPhase(won ? 'won' : 'lost');
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
      if (totalMatched === 16) {
        await completeGame(true, s.wrongGuesses, s.gameId);
      }
    } else {
      const newWrong = s.wrongGuesses + 1;
      setWrongGuesses(newWrong);
      stateRef.current.wrongGuesses = newWrong;

      const resetFlipped = [...newFlipped];
      resetFlipped[a] = false;
      resetFlipped[b] = false;
      setFlipped(resetFlipped);
      stateRef.current.flipped = resetFlipped;
      setSelected([]);
      stateRef.current.selected = [];
      lockRef.current = false;

      if (newWrong >= 12) {
        await completeGame(false, newWrong, s.gameId);
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
    lockRef.current = false;
  }

  return (
    <div className="min-h-screen bg-black pb-24 md:pb-10 md:pt-14">
      <div className="max-w-lg md:max-w-2xl mx-auto px-5 md:px-8">

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
              <span className="text-xl">🃏</span>
              <h1 className="text-white font-bold text-lg">Memory</h1>
            </div>
            <p className="text-white/30 text-xs">Memorize · Match · Win</p>
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
              <label className="text-xs text-white/40 tracking-wider uppercase block mb-3">
                Bet Amount
              </label>
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

            {/* Payout table */}
            <div className="bg-[#1c1c1c] rounded-xl p-4">
              <p className="text-white/30 text-xs tracking-wider mb-3 uppercase">Payout Table</p>
              <div className="grid grid-cols-5 gap-1">
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
            <p className="text-white/50 text-sm tracking-widest uppercase">
              Memorize the cards! Hiding in{' '}
              <span className="text-white font-bold text-2xl font-mono">{countdown}</span>
            </p>
          </div>
        )}

        {/* Playing HUD */}
        {phase === 'playing' && (
          <div className="bg-[#111111] rounded-2xl px-5 py-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/30 text-[10px] mb-0.5">Pairs Found</p>
                <p className="text-white font-mono font-bold">{matched.filter(Boolean).length / 2} / 8</p>
              </div>
              <div className="text-center">
                <p className="text-white/30 text-[10px] mb-0.5">Wrong Guesses</p>
                <p className={`font-mono font-bold text-lg ${wrongGuesses >= 9 ? 'text-red-400' : wrongGuesses >= 6 ? 'text-yellow-400' : 'text-white'}`}>
                  {wrongGuesses} / 11
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
                {result.won ? `${wrongGuesses} wrong guesses` : 'Too many wrong guesses'}
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

        {/* Card grid */}
        {cards.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {cards.map((icon, idx) => {
              const isFlipped = flipped[idx];
              const isMatch = matched[idx];
              return (
                <button
                  key={idx}
                  onClick={() => handleCardClick(idx)}
                  disabled={isFlipped || isMatch || phase !== 'playing'}
                  className={`aspect-square rounded-xl text-2xl flex items-center justify-center transition-all duration-200 select-none ${
                    isMatch
                      ? 'bg-green-500/10 border border-green-500/25 cursor-default'
                      : isFlipped
                      ? 'bg-[#1c1c1c] border border-white/15 cursor-default'
                      : phase === 'playing'
                      ? 'bg-[#111111] border border-white/8 hover:bg-white/8 hover:border-white/20 cursor-pointer active:scale-95'
                      : 'bg-[#111111] border border-white/5 cursor-default'
                  }`}
                >
                  {(isFlipped || isMatch) ? icon : ''}
                </button>
              );
            })}
          </div>
        )}

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
            <li>• Cards are briefly shown for 3 seconds — memorize their positions!</li>
            <li>• Tap two cards to reveal them. Matching pairs stay revealed.</li>
            <li>• Win with fewer wrong guesses for a higher multiplier.</li>
            <li>• 12 wrong guesses and you lose your bet.</li>
          </ul>
        </div>

      </div>
      <BottomNav />
    </div>
  );
}
