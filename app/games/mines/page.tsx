'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Gem, X, AlertCircle } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

type CellState = 'hidden' | 'safe' | 'mine' | 'mine-all';

interface GameState {
  gameId: string;
  bet: number;
  mineCount: number;
  cells: CellState[];
  multiplier: number;
  payout: number;
  status: 'active' | 'won' | 'lost';
  revealedSafe: number;
}

const MINE_COUNTS = [3, 5, 10, 15, 20];

export default function MinesPage() {
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [bet, setBet] = useState(50);
  const [mineCount, setMineCount] = useState(5);
  const [game, setGame] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [revealing, setRevealing] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/user')
      .then(r => r.json())
      .then(d => { if (d.balance !== undefined) setBalance(d.balance); })
      .catch(() => {});
  }, []);

  async function startGame() {
    if (loading) return;
    setMsg('');
    setLoading(true);
    try {
      const res = await fetch('/api/games/mines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bet, mineCount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error ?? 'Failed to start game');
        return;
      }
      setBalance(data.balance);
      setGame({
        gameId: data.gameId,
        bet,
        mineCount,
        cells: Array(25).fill('hidden'),
        multiplier: 1,
        payout: 0,
        status: 'active',
        revealedSafe: 0,
      });
    } catch {
      setMsg('Network error — please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function revealCell(idx: number) {
    if (!game || game.status !== 'active' || game.cells[idx] !== 'hidden' || loading) return;

    setRevealing(idx);
    setLoading(true);
    try {
      const res = await fetch('/api/games/mines', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: game.gameId, action: 'reveal', cellIndex: idx }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMsg(data.error ?? 'Something went wrong');
        return;
      }

      const newCells: CellState[] = [...game.cells];

      if (data.isMine) {
        const grid: boolean[] = Array.isArray(data.grid) ? data.grid : JSON.parse(data.grid);
        grid.forEach((isMine, i) => {
          if (isMine) newCells[i] = i === idx ? 'mine' : 'mine-all';
        });
        setBalance(data.balance);
        setGame(g => g ? { ...g, cells: newCells, status: 'lost', multiplier: 0, payout: 0 } : g);
        setMsg('BOOM! You hit a mine.');
      } else {
        newCells[idx] = 'safe';
        setGame(g =>
          g
            ? {
                ...g,
                cells: newCells,
                multiplier: data.multiplier ?? 1,
                payout: data.payout ?? 0,
                revealedSafe: data.revealedSafe ?? g.revealedSafe + 1,
              }
            : g
        );
      }
    } catch {
      setMsg('Network error — please try again.');
    } finally {
      setRevealing(null);
      setLoading(false);
    }
  }

  async function cashout() {
    if (!game || game.status !== 'active' || game.revealedSafe === 0 || loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/games/mines', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: game.gameId, action: 'cashout' }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMsg(data.error ?? 'Cashout failed');
        return;
      }

      setBalance(data.balance);
      setGame(g =>
        g ? { ...g, status: 'won', payout: data.payout, multiplier: data.multiplier } : g
      );
      setMsg(`Cashed out ${data.multiplier}x — Won $${data.payout}!`);
    } catch {
      setMsg('Network error — please try again.');
    } finally {
      setLoading(false);
    }
  }

  function resetGame() {
    setGame(null);
    setMsg('');
  }

  function cellStyle(state: CellState, idx: number): string {
    const base = 'w-full aspect-square flex items-center justify-center text-lg rounded-xl transition-all duration-150 select-none';
    if (state === 'safe')     return `${base} bg-green-500/15 border border-green-500/25 cursor-default`;
    if (state === 'mine')     return `${base} bg-red-500/20 border border-red-500/40 cursor-default`;
    if (state === 'mine-all') return `${base} bg-red-900/15 border border-red-900/20 cursor-default`;
    if (game?.status !== 'active') return `${base} bg-[#111111] border border-white/5 cursor-default`;
    if (revealing === idx)    return `${base} bg-white/15 border border-white/30 scale-95 cursor-default`;
    return `${base} bg-[#111111] border border-white/8 hover:bg-white/10 hover:border-white/20 cursor-pointer active:scale-95`;
  }

  function CellIcon({ state }: { state: CellState }) {
    if (state === 'safe')     return <Gem size={18} className="text-green-400" />;
    if (state === 'mine')     return <X size={20} className="text-red-400" />;
    if (state === 'mine-all') return <AlertCircle size={18} className="text-red-900/80" />;
    return null;
  }

  const isActive = game?.status === 'active';
  const isEnded  = game?.status === 'won' || game?.status === 'lost';

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
              <Gem size={20} className="text-white/70" />
              <h1 className="text-white font-bold text-lg">Mines</h1>
            </div>
            <p className="text-white/30 text-xs">Reveal cells · Avoid mines · Cash out</p>
          </div>
          <div className="text-right">
            <p className="text-white/30 text-[10px]">Balance</p>
            <p className="text-yellow-400 font-mono font-bold text-sm">${balance.toLocaleString()}</p>
          </div>
        </div>

        {/* Setup controls */}
        {!game && (
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

            <div>
              <label className="text-xs text-white/40 tracking-wider uppercase block mb-3">
                Mines ({mineCount})
              </label>
              <div className="flex gap-2">
                {MINE_COUNTS.map(v => (
                  <button
                    key={v}
                    onClick={() => setMineCount(v)}
                    className={`px-4 py-2 rounded-full text-sm font-mono transition-all ${
                      mineCount === v
                        ? 'bg-white text-black font-bold'
                        : 'bg-[#1c1c1c] text-white/60 hover:text-white border border-white/8'
                    }`}
                  >
                    {v}
                  </button>
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

        {/* Active HUD */}
        {isActive && game && (
          <div className="bg-[#111111] rounded-2xl px-5 py-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/30 text-[10px] mb-0.5">Bet</p>
                <p className="text-white font-mono font-bold">${game.bet}</p>
              </div>
              <div className="text-center">
                <p className="text-white/30 text-[10px] mb-0.5">Multiplier</p>
                <p className="text-white font-mono font-bold text-lg">
                  {game.multiplier.toFixed(2)}x
                </p>
              </div>
              <div className="text-center">
                <p className="text-white/30 text-[10px] mb-0.5">Cashout</p>
                <p className="text-green-400 font-mono font-bold text-lg">${game.payout}</p>
              </div>
              <button
                onClick={cashout}
                disabled={game.revealedSafe === 0 || loading}
                className="px-4 py-2.5 bg-green-500 text-black font-bold rounded-full text-xs hover:bg-green-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                CASH OUT
              </button>
            </div>
          </div>
        )}

        {/* In-game error */}
        {game && msg && !isEnded && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4">
            <p className="text-red-400 text-xs">{msg}</p>
          </div>
        )}

        {/* Result banner */}
        {isEnded && game && (
          <div className={`rounded-2xl px-5 py-4 mb-4 flex items-center justify-between ${
            game.status === 'won'
              ? 'bg-green-500/10 border border-green-500/20'
              : 'bg-red-500/10 border border-red-500/20'
          }`}>
            <div>
              <p className={`font-bold text-base ${game.status === 'won' ? 'text-green-400' : 'text-red-400'}`}>
                {game.status === 'won' ? `WON $${game.payout}!` : 'GAME OVER'}
              </p>
              <p className="text-white/40 text-xs mt-0.5">{msg}</p>
            </div>
            <button
              onClick={resetGame}
              className="px-5 py-2.5 bg-white text-black font-bold rounded-full text-sm"
            >
              Again
            </button>
          </div>
        )}

        {/* Grid */}
        {game ? (
          <div className="grid grid-cols-5 gap-2">
            {game.cells.map((state, idx) => (
              <button
                key={idx}
                onClick={() => revealCell(idx)}
                className={cellStyle(state, idx)}
                disabled={!isActive || state !== 'hidden' || loading}
              >
                <CellIcon state={state} />
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-2 opacity-20">
            {Array(25).fill(null).map((_, i) => (
              <div key={i} className="aspect-square rounded-xl bg-[#111111] border border-white/5" />
            ))}
          </div>
        )}

        {/* How to play */}
        <div className="mt-5 bg-[#111111] rounded-2xl p-4">
          <p className="text-white/25 text-xs tracking-wider mb-2 uppercase">How to play</p>
          <ul className="text-white/30 text-xs space-y-1">
            <li>• Set your bet and number of mines, then tap Play.</li>
            <li>• Reveal cells — safe cells multiply your winnings.</li>
            <li>• Hit a mine and you lose your bet.</li>
            <li>• Cash out anytime to secure your winnings.</li>
          </ul>
        </div>

      </div>
      <BottomNav />
    </div>
  );
}
