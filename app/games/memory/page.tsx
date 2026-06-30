'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Crown, User, Skull, Heart, Zap, Leaf,
  DollarSign, Plane, Bird, Bug, Fish, Sprout,
  Layers, type LucideIcon,
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';

// --- Icon map ---
type IconKey =
  | 'crown' | 'user'
  | 'skull' | 'heart' | 'zap' | 'leaf'
  | 'dollar' | 'plane' | 'bird' | 'bug' | 'fish' | 'sprout';

const ICON_MAP: Record<IconKey, LucideIcon> = {
  crown: Crown, user: User,
  skull: Skull, heart: Heart, zap: Zap, leaf: Leaf,
  dollar: DollarSign, plane: Plane, bird: Bird, bug: Bug, fish: Fish, sprout: Sprout,
};

function getIconColor(name: IconKey, round: number): string {
  if (round === 3) return '#9ca3af';
  if (round === 2) {
    const MUTED: Partial<Record<IconKey, string>> = {
      skull: '#c47a7a', heart: '#c47aa0', zap: '#b8a840', leaf: '#6a9a6a',
    };
    return MUTED[name] ?? '#9ca3af';
  }
  const VIVID: Partial<Record<IconKey, string>> = {
    crown: '#facc15', user: '#60a5fa',
  };
  return VIVID[name] ?? '#ffffff';
}

// Round card pools (16 cards each = 8 pairs)
const ROUND_POOLS: IconKey[][] = [
  [
    'crown','crown','crown','crown','crown','crown','crown','crown',
    'user','user','user','user','user','user','user','user',
  ],
  [
    'skull','skull','skull','skull',
    'heart','heart','heart','heart',
    'zap','zap','zap','zap',
    'leaf','leaf','leaf','leaf',
  ],
  [
    'skull','skull','dollar','dollar','plane','plane','bird','bird',
    'bug','bug','fish','fish','leaf','leaf','sprout','sprout',
  ],
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function CardIcon({ name, round }: { name: IconKey; round: number }) {
  const Icon = ICON_MAP[name];
  if (!Icon) return null;
  return <Icon size={26} color={getIconColor(name, round)} strokeWidth={2} />;
}

function calcMemoryMultiplierLocal(wrongGuesses: number): number {
  if (wrongGuesses === 0) return 3.0;
  if (wrongGuesses <= 3) return 2.5;
  if (wrongGuesses <= 6) return 2.0;
  if (wrongGuesses <= 9) return 1.5;
  return 0;
}

// --- Types ---
type GamePhase = 'idle' | 'preview' | 'playing' | 'round-complete' | 'won' | 'lost';
type GameMode = 'training' | 'earning';

const MULT_TABLE = [
  { label: '0 wrong', mult: '3.0x', color: 'text-green-400' },
  { label: '1–3 wrong', mult: '2.5x', color: 'text-green-400' },
  { label: '4–6 wrong', mult: '2.0x', color: 'text-yellow-400' },
  { label: '7–9 wrong', mult: '1.5x', color: 'text-yellow-400' },
];

// --- Component ---
export default function MemoryPage() {
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [bet, setBet] = useState(50);
  const [mode, setMode] = useState<GameMode>('earning');
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [round, setRound] = useState(1);
  const [lives, setLives] = useState(3);
  const [totalWrong, setTotalWrong] = useState(0);
  const [gameId, setGameId] = useState('');
  const [cards, setCards] = useState<IconKey[]>([]);
  const [flipped, setFlipped] = useState<boolean[]>([]);
  const [matched, setMatched] = useState<boolean[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [countdown, setCountdown] = useState(3);
  const [result, setResult] = useState<{ won: boolean; payout: number; multiplier: number } | null>(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const [startingLives, setStartingLives] = useState(3);
  const [extraLivesBought, setExtraLivesBought] = useState(0);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [buyLifeCost, setBuyLifeCost] = useState(0);
  const [buyingLife, setBuyingLife] = useState(false);

  const lockRef = useRef(false);
  const stateRef = useRef({
    cards: [] as IconKey[],
    flipped: [] as boolean[],
    matched: [] as boolean[],
    selected: [] as number[],
    lives: 3,
    totalWrong: 0,
    round: 1,
    gameId: '',
    bet: 50,
    phase: 'idle' as GamePhase,
    mode: 'earning' as GameMode,
    startingLives: 3,
    extraLivesBought: 0,
  });

  useEffect(() => { stateRef.current.cards = cards; }, [cards]);
  useEffect(() => { stateRef.current.flipped = flipped; }, [flipped]);
  useEffect(() => { stateRef.current.matched = matched; }, [matched]);
  useEffect(() => { stateRef.current.selected = selected; }, [selected]);
  useEffect(() => { stateRef.current.lives = lives; }, [lives]);
  useEffect(() => { stateRef.current.totalWrong = totalWrong; }, [totalWrong]);
  useEffect(() => { stateRef.current.round = round; }, [round]);
  useEffect(() => { stateRef.current.gameId = gameId; }, [gameId]);
  useEffect(() => { stateRef.current.bet = bet; }, [bet]);
  useEffect(() => { stateRef.current.phase = phase; }, [phase]);
  useEffect(() => { stateRef.current.mode = mode; }, [mode]);
  useEffect(() => { stateRef.current.startingLives = startingLives; }, [startingLives]);
  useEffect(() => { stateRef.current.extraLivesBought = extraLivesBought; }, [extraLivesBought]);

  useEffect(() => {
    fetch('/api/user').then(r => r.json()).then(d => {
      if (d.balance !== undefined) setBalance(d.balance);
    });
    fetch('/api/games/status').then(r => r.json()).then(d => {
      const sl = d.memory?.startingLives ?? 3;
      setStartingLives(sl);
      stateRef.current.startingLives = sl;
    });
  }, []);

  function beginRound(roundNum: number) {
    const pool = ROUND_POOLS[roundNum - 1];
    const shuffled = shuffle([...pool]) as IconKey[];
    const allShown = Array(16).fill(true);
    const sl = stateRef.current.startingLives;

    setCards(shuffled);
    stateRef.current.cards = shuffled;
    setFlipped(allShown);
    stateRef.current.flipped = allShown;
    setMatched(Array(16).fill(false));
    stateRef.current.matched = Array(16).fill(false);
    setSelected([]);
    stateRef.current.selected = [];
    setLives(sl);
    stateRef.current.lives = sl;
    setExtraLivesBought(0);
    stateRef.current.extraLivesBought = 0;
    lockRef.current = false;

    const newPhase: GamePhase = 'preview';
    setPhase(newPhase);
    stateRef.current.phase = newPhase;

    let c = 3;
    setCountdown(c);
    const tick = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(tick);
        const allHidden = Array(16).fill(false);
        setFlipped(allHidden);
        stateRef.current.flipped = allHidden;
        setPhase('playing');
        stateRef.current.phase = 'playing';
      }
    }, 1000);
  }

  async function startGame() {
    if (loading) return;
    setMsg('');
    setLoading(true);

    if (mode === 'earning') {
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
    }

    setRound(1);
    stateRef.current.round = 1;
    setTotalWrong(0);
    stateRef.current.totalWrong = 0;
    setResult(null);
    setShowBuyModal(false);
    setLoading(false);
    beginRound(1);
  }

  async function completeGame(won: boolean) {
    const { totalWrong: tw, gameId: gid, mode: m } = stateRef.current;
    const newPhase: GamePhase = won ? 'won' : 'lost';
    setPhase(newPhase);
    stateRef.current.phase = newPhase;

    if (m === 'earning') {
      const res = await fetch('/api/games/memory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: gid, won, wrongGuesses: tw }),
      });
      const data = await res.json();
      setBalance(data.balance);
      setResult({ won: data.won, payout: data.payout, multiplier: data.multiplier });
    } else {
      setResult({ won, payout: 0, multiplier: 0 });
    }
  }

  function goToNextRound() {
    const nextRound = stateRef.current.round + 1;
    setRound(nextRound);
    stateRef.current.round = nextRound;
    beginRound(nextRound);
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

      if (newMatched.filter(Boolean).length === 16) {
        if (s.round === 3) {
          await completeGame(true);
        } else {
          setPhase('round-complete');
          stateRef.current.phase = 'round-complete';
        }
      }
    } else {
      const newLives = s.lives - 1;
      setLives(newLives);
      stateRef.current.lives = newLives;
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

      if (newLives <= 0) {
        const s2 = stateRef.current;
        if (s2.mode === 'earning' && s2.extraLivesBought < 3) {
          const mult = calcMemoryMultiplierLocal(s2.totalWrong);
          const cost = mult > 0 ? Math.floor(s2.bet * mult * 0.6) : Math.floor(s2.bet * 0.6);
          setBuyLifeCost(cost);
          setShowBuyModal(true);
          // Keep lockRef.current = true while modal is shown
        } else {
          lockRef.current = false;
          await completeGame(false);
        }
      } else {
        lockRef.current = false;
      }
    }
  }

  async function buyLifeMemory() {
    setBuyingLife(true);
    const { gameId: gid, totalWrong: tw, extraLivesBought: eb } = stateRef.current;

    try {
      const res = await fetch('/api/games/memory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: gid, action: 'buy-life', wrongGuesses: tw }),
      });
      const data = await res.json();

      if (!res.ok) {
        setShowBuyModal(false);
        lockRef.current = false;
        await completeGame(false);
        return;
      }

      setBalance(data.balance);
      const newExtra = eb + 1;
      setExtraLivesBought(newExtra);
      stateRef.current.extraLivesBought = newExtra;
      setLives(1);
      stateRef.current.lives = 1;
      setShowBuyModal(false);
      lockRef.current = false;
    } catch {
      setShowBuyModal(false);
      lockRef.current = false;
      await completeGame(false);
    } finally {
      setBuyingLife(false);
    }
  }

  async function giveUpMemory() {
    setShowBuyModal(false);
    lockRef.current = false;
    await completeGame(false);
  }

  function resetGame() {
    setPhase('idle');
    setCards([]);
    setFlipped([]);
    setMatched([]);
    setSelected([]);
    setResult(null);
    setMsg('');
    setRound(1);
    setLives(stateRef.current.startingLives);
    setTotalWrong(0);
    setExtraLivesBought(0);
    setShowBuyModal(false);
    lockRef.current = false;
  }

  const pairsFound = matched.filter(Boolean).length / 2;
  const pairsRemaining = 8 - pairsFound;
  const isEndPhase = phase === 'won' || phase === 'lost' || phase === 'round-complete';

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
            <p className="text-white/30 text-xs">3 Rounds · Match Pairs · Win</p>
          </div>
          <div className="text-right">
            <p className="text-white/30 text-[10px]">Balance</p>
            <p className="text-yellow-400 font-mono font-bold text-sm">${balance.toLocaleString()}</p>
          </div>
        </div>

        {/* IDLE */}
        {phase === 'idle' && (
          <div className="space-y-4">
            {/* Mode toggle */}
            <div className="bg-[#111111] rounded-2xl p-1 flex gap-1">
              <button
                onClick={() => setMode('training')}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                  mode === 'training' ? 'bg-white text-black' : 'text-white/40 hover:text-white'
                }`}
              >
                Training
              </button>
              <button
                onClick={() => setMode('earning')}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                  mode === 'earning' ? 'bg-white text-black' : 'text-white/40 hover:text-white'
                }`}
              >
                Earning
              </button>
            </div>

            {mode === 'earning' && (
              <div className="bg-[#111111] rounded-2xl p-5 space-y-5">
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
                  <p className="text-white/30 text-xs tracking-wider mb-3 uppercase">Payout Table</p>
                  <div className="grid grid-cols-4 gap-1">
                    {MULT_TABLE.map(r => (
                      <div key={r.label} className="text-center">
                        <p className="text-white/30 text-[9px] leading-tight">{r.label}</p>
                        <p className={`font-bold text-xs font-mono mt-1 ${r.color}`}>{r.mult}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {msg && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <p className="text-red-400 text-xs">{msg}</p>
              </div>
            )}

            <button
              onClick={startGame}
              disabled={loading || (mode === 'earning' && (bet <= 0 || bet > balance))}
              className="w-full bg-white text-black font-bold py-4 rounded-full tracking-wider text-sm hover:bg-white/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'STARTING...' : mode === 'earning' ? `BET $${bet} AND PLAY` : 'PLAY FREE'}
            </button>

            <div className="bg-[#111111] rounded-2xl p-4">
              <p className="text-white/25 text-xs tracking-wider mb-2 uppercase">How to play</p>
              <ul className="text-white/30 text-xs space-y-1">
                <li>• 3 rounds, 16 cards each (4×4 grid)</li>
                <li>• Cards shown for 3 seconds — memorize them!</li>
                <li>• Flip two cards; matching pairs stay face-up</li>
                <li>• {startingLives} {startingLives === 1 ? 'life' : 'lives'} per round — wrong match costs 1 life</li>
                <li>• 0 lives = game over · Clear all 3 rounds to win</li>
              </ul>
            </div>
          </div>
        )}

        {/* HUD — shown during preview and playing */}
        {(phase === 'preview' || phase === 'playing') && (
          <div className="bg-[#111111] rounded-2xl px-5 py-4 mb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/30 text-[10px] mb-0.5">Round</p>
                <p className="text-white font-mono font-bold">{round} of 3</p>
              </div>
              <div className="text-center">
                <p className="text-white/30 text-[10px] mb-1.5">Lives</p>
                <div className="flex gap-1 justify-center items-center">
                  {Array.from({ length: startingLives }).map((_, i) => (
                    <Heart
                      key={i}
                      size={16}
                      color={i < lives ? '#f87171' : 'rgba(255,255,255,0.12)'}
                      fill={i < lives ? '#f87171' : 'none'}
                    />
                  ))}
                  {extraLivesBought > 0 && (
                    <span className="text-yellow-400 text-[10px] font-bold ml-1">+{extraLivesBought}</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-white/30 text-[10px] mb-0.5">Pairs Left</p>
                <p className="text-white font-mono font-bold">{pairsRemaining}</p>
              </div>
            </div>
          </div>
        )}

        {/* Preview countdown */}
        {phase === 'preview' && (
          <div className="bg-[#111111] rounded-2xl py-3 mb-3 text-center">
            <p className="text-white/50 text-sm tracking-widest uppercase">
              Memorize! Hiding in{' '}
              <span className="text-white font-bold text-xl font-mono">{countdown}</span>
            </p>
          </div>
        )}

        {/* Round complete */}
        {phase === 'round-complete' && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl px-5 py-4 mb-3 flex items-center justify-between">
            <div>
              <p className="text-green-400 font-bold">Round {round} Complete!</p>
              <p className="text-white/40 text-xs mt-0.5">
                {totalWrong === 0 ? 'Perfect — no mistakes!' : `${totalWrong} mistake${totalWrong !== 1 ? 's' : ''} total`}
              </p>
            </div>
            <button
              onClick={goToNextRound}
              className="px-5 py-2.5 bg-white text-black font-bold rounded-full text-sm"
            >
              Round {round + 1}
            </button>
          </div>
        )}

        {/* Won / Lost */}
        {(phase === 'won' || phase === 'lost') && result && (
          <div className={`rounded-2xl px-5 py-4 mb-3 flex items-center justify-between ${
            result.won
              ? 'bg-green-500/10 border border-green-500/20'
              : 'bg-red-500/10 border border-red-500/20'
          }`}>
            <div>
              {result.won ? (
                <>
                  <p className="text-green-400 font-bold text-base">
                    {mode === 'earning' ? `WON $${result.payout}! (${result.multiplier}x)` : 'YOU WON!'}
                  </p>
                  <p className="text-white/40 text-xs mt-0.5">
                    {totalWrong} wrong guess{totalWrong !== 1 ? 'es' : ''} across 3 rounds
                  </p>
                </>
              ) : (
                <>
                  <p className="text-red-400 font-bold text-base">GAME OVER</p>
                  <p className="text-white/40 text-xs mt-0.5">Ran out of lives on Round {round}</p>
                </>
              )}
            </div>
            <button
              onClick={resetGame}
              className="px-5 py-2.5 bg-white text-black font-bold rounded-full text-sm"
            >
              Play Again
            </button>
          </div>
        )}

        {/* Card grid */}
        {cards.length > 0 ? (
          <div className="grid grid-cols-4 gap-2">
            {cards.map((icon, idx) => {
              const isFlipped = flipped[idx];
              const isMatch = matched[idx];
              const showIcon = isFlipped || isMatch || isEndPhase;
              return (
                <button
                  key={idx}
                  onClick={() => handleCardClick(idx)}
                  disabled={isFlipped || isMatch || phase !== 'playing'}
                  className={`aspect-square rounded-xl flex items-center justify-center transition-all duration-150 select-none ${
                    isMatch
                      ? 'bg-[#1c1c1c] border border-green-500/20 cursor-default'
                      : isFlipped
                      ? 'bg-[#1c1c1c] border border-white/15 cursor-default'
                      : phase === 'playing'
                      ? 'bg-[#111111] border border-white/8 hover:bg-white/5 hover:border-white/20 cursor-pointer active:scale-95'
                      : 'bg-[#111111] border border-white/5 cursor-default'
                  }`}
                >
                  {showIcon && <CardIcon name={icon} round={round} />}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 opacity-20">
            {Array(16).fill(null).map((_, i) => (
              <div key={i} className="aspect-square rounded-xl bg-[#111111] border border-white/5" />
            ))}
          </div>
        )}

      </div>

      {/* Buy-life modal */}
      {showBuyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 w-full max-w-sm text-center space-y-4">
            <div className="flex justify-center mb-2">
              <Heart size={36} color="#f87171" fill="#f87171" />
            </div>
            <p className="text-white font-bold text-lg">Out of Lives!</p>
            <p className="text-white/50 text-sm">
              Buy an extra life for{' '}
              <span className="text-yellow-400 font-bold font-mono">${buyLifeCost.toLocaleString()}</span>{' '}
              and keep playing?
            </p>
            <p className="text-white/25 text-xs">
              Extra lives this round: {extraLivesBought + 1}/3
            </p>
            <div className="flex gap-3">
              <button
                onClick={giveUpMemory}
                disabled={buyingLife}
                className="flex-1 bg-[#1c1c1c] text-white/60 font-bold py-3 rounded-full text-sm border border-white/10 hover:text-white transition-colors disabled:opacity-40"
              >
                Give Up
              </button>
              <button
                onClick={buyLifeMemory}
                disabled={buyingLife || balance < buyLifeCost}
                className="flex-1 bg-yellow-400 text-black font-bold py-3 rounded-full text-sm hover:bg-yellow-300 transition-colors disabled:opacity-40"
              >
                {buyingLife ? 'Buying...' : `Buy $${buyLifeCost}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
