'use client';
import { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/Navbar';

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
    <div className="min-h-screen bg-black">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 pt-24 pb-16">
        <div className="flex items-center gap-3 mb-8">
          <span className="text-3xl">🃏</span>
          <div>
            <h1 className="text-2xl font-black tracking-widest">MEMORY</h1>
            <p className="text-white/30 text-xs tracking-wider">MEMORIZE · MATCH · WIN</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-white/30 text-xs">Balance</p>
            <p className="text-yellow-400 font-mono font-bold">${balance.toLocaleString()}</p>
          </div>
        </div>

        {/* Bet setup */}
        {phase === 'idle' && (
          <div className="border border-white/8 rounded-lg p-6 mb-6 space-y-5">
            <div>
              <label className="text-xs text-white/40 tracking-wider uppercase block mb-2">
                Bet Amount
              </label>
              <div className="flex gap-2 flex-wrap">
                {[10, 25, 50, 100, 250].map(v => (
                  <button
                    key={v}
                    onClick={() => setBet(v)}
                    className={`px-4 py-2 rounded text-sm font-mono border transition-all ${
                      bet === v
                        ? 'bg-white text-black border-white'
                        : 'bg-white/5 text-white/60 border-white/10 hover:border-white/30 hover:text-white'
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
                  className="px-3 py-2 rounded text-sm font-mono border border-white/10 bg-white/5 text-white w-24 focus:outline-none focus:border-white/40"
                />
              </div>
            </div>

            <div className="border border-white/5 rounded p-4">
              <p className="text-white/30 text-xs tracking-wider mb-3 uppercase">Payout Table</p>
              <div className="grid grid-cols-5 gap-2">
                {MULT_TABLE.map(r => (
                  <div key={r.label} className="text-center">
                    <p className="text-white/40 text-xs">{r.label}</p>
                    <p className={`font-bold text-sm font-mono mt-0.5 ${r.color}`}>{r.mult}</p>
                  </div>
                ))}
              </div>
            </div>

            {msg && (
              <p className="text-red-400 text-xs border border-red-400/20 bg-red-400/5 rounded px-3 py-2">
                {msg}
              </p>
            )}

            <button
              onClick={startGame}
              disabled={loading || bet <= 0 || bet > balance}
              className="w-full bg-white text-black font-bold py-3 rounded tracking-wider text-sm hover:bg-white/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'STARTING...' : `BET $${bet} AND PLAY`}
            </button>
          </div>
        )}

        {/* Preview countdown */}
        {phase === 'preview' && (
          <div className="text-center mb-4 border border-white/8 rounded-lg py-4">
            <p className="text-white/50 text-sm tracking-widest uppercase">
              Memorize the cards! Hiding in{' '}
              <span className="text-white font-bold text-2xl font-mono">{countdown}</span>
            </p>
          </div>
        )}

        {/* Playing HUD */}
        {phase === 'playing' && (
          <div className="flex items-center justify-between border border-white/8 rounded-lg px-5 py-3 mb-4 bg-white/2">
            <div>
              <p className="text-white/30 text-xs">Pairs Found</p>
              <p className="text-white font-mono font-bold">{matched.filter(Boolean).length / 2} / 8</p>
            </div>
            <div className="text-center">
              <p className="text-white/30 text-xs">Wrong Guesses</p>
              <p className={`font-mono font-bold text-lg ${wrongGuesses >= 9 ? 'text-red-400' : wrongGuesses >= 6 ? 'text-yellow-400' : 'text-white'}`}>
                {wrongGuesses} / 11
              </p>
            </div>
            <div>
              <p className="text-white/30 text-xs">Bet</p>
              <p className="text-white font-mono font-bold">${bet}</p>
            </div>
          </div>
        )}

        {/* Result banner */}
        {(phase === 'won' || phase === 'lost') && result && (
          <div
            className={`border rounded-lg px-5 py-4 mb-4 flex items-center justify-between ${
              result.won
                ? 'border-green-500/30 bg-green-500/5'
                : 'border-red-500/30 bg-red-500/5'
            }`}
          >
            <div>
              <p className={`font-bold text-lg ${result.won ? 'text-green-400' : 'text-red-400'}`}>
                {result.won ? `WON $${result.payout}! (${result.multiplier}x)` : 'YOU LOST'}
              </p>
              <p className="text-white/40 text-xs mt-0.5">
                {result.won ? `${wrongGuesses} wrong guesses` : 'Too many wrong guesses'}
              </p>
            </div>
            <button
              onClick={resetGame}
              className="px-5 py-2.5 bg-white text-black font-bold rounded text-sm hover:bg-white/90 transition-all"
            >
              PLAY AGAIN
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
                  className={`aspect-square rounded-lg text-2xl flex items-center justify-center border transition-all duration-200 select-none ${
                    isMatch
                      ? 'bg-green-500/10 border-green-500/30 cursor-default'
                      : isFlipped
                      ? 'bg-white/10 border-white/25 cursor-default'
                      : phase === 'playing'
                      ? 'bg-white/5 border-white/10 hover:bg-white/12 hover:border-white/25 cursor-pointer active:scale-95'
                      : 'bg-white/3 border-white/5 cursor-default'
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
              <div key={i} className="aspect-square rounded-lg bg-white/5 border border-white/5" />
            ))}
          </div>
        )}

        <div className="mt-6 border border-white/5 rounded-lg p-4">
          <p className="text-white/20 text-xs tracking-wider mb-2 uppercase">How to play</p>
          <ul className="text-white/30 text-xs space-y-1">
            <li>• Cards are briefly shown for 3 seconds — memorize their positions!</li>
            <li>• Click two cards to reveal them. Matching pairs stay revealed.</li>
            <li>• Win with fewer wrong guesses for a higher multiplier.</li>
            <li>• 12 wrong guesses and you lose your bet.</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
