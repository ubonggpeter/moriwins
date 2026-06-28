'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';

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
        // Reveal all mines — data.grid is boolean[]
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
    const base =
      'w-full aspect-square flex items-center justify-center text-xl rounded transition-all duration-200 border select-none';
    if (state === 'safe')     return `${base} bg-white/10 border-white/30 cursor-default`;
    if (state === 'mine')     return `${base} bg-red-500/20 border-red-500/60 cursor-default`;
    if (state === 'mine-all') return `${base} bg-red-900/20 border-red-900/30 cursor-default`;
    if (game?.status !== 'active') return `${base} bg-white/[0.03] border-white/5 cursor-default`;
    if (revealing === idx)    return `${base} bg-white/20 border-white/50 cursor-default scale-95`;
    return `${base} bg-white/5 border-white/10 hover:bg-white/15 hover:border-white/30 cursor-pointer hover:scale-95`;
  }

  function cellContent(state: CellState): string {
    if (state === 'safe')     return '💎';
    if (state === 'mine')     return '💥';
    if (state === 'mine-all') return '💣';
    return '';
  }

  const isActive = game?.status === 'active';
  const isEnded  = game?.status === 'won' || game?.status === 'lost';

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 pt-24 pb-16">
        <div className="flex items-center gap-3 mb-8">
          <span className="text-3xl">💎</span>
          <div>
            <h1 className="text-2xl font-black tracking-widest">MINES</h1>
            <p className="text-white/30 text-xs tracking-wider">REVEAL CELLS · AVOID MINES · CASH OUT</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-white/30 text-xs">Balance</p>
            <p className="text-yellow-400 font-mono font-bold">${balance.toLocaleString()}</p>
          </div>
        </div>

        {/* Setup controls — shown before game starts */}
        {!game && (
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

            <div>
              <label className="text-xs text-white/40 tracking-wider uppercase block mb-2">
                Mines ({mineCount})
              </label>
              <div className="flex gap-2">
                {MINE_COUNTS.map(v => (
                  <button
                    key={v}
                    onClick={() => setMineCount(v)}
                    className={`px-4 py-2 rounded text-sm font-mono border transition-all ${
                      mineCount === v
                        ? 'bg-white text-black border-white'
                        : 'bg-white/5 text-white/60 border-white/10 hover:border-white/30 hover:text-white'
                    }`}
                  >
                    {v}
                  </button>
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

        {/* Active game HUD */}
        {isActive && game && (
          <div className="flex items-center justify-between border border-white/8 rounded-lg px-5 py-3 mb-4 bg-white/[0.02]">
            <div>
              <p className="text-white/30 text-xs">Bet</p>
              <p className="text-white font-mono font-bold">${game.bet}</p>
            </div>
            <div className="text-center">
              <p className="text-white/30 text-xs">Multiplier</p>
              <p className="text-white font-mono font-bold text-xl">
                {game.multiplier.toFixed(2)}x
              </p>
            </div>
            <div className="text-center">
              <p className="text-white/30 text-xs">Cashout Value</p>
              <p className="text-green-400 font-mono font-bold text-xl">${game.payout}</p>
            </div>
            <button
              onClick={cashout}
              disabled={game.revealedSafe === 0 || loading}
              className="px-5 py-2.5 bg-green-500 text-black font-bold rounded text-sm hover:bg-green-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              CASH OUT
            </button>
          </div>
        )}

        {/* In-game error */}
        {game && msg && !isEnded && (
          <p className="text-red-400 text-xs border border-red-400/20 bg-red-400/5 rounded px-3 py-2 mb-4">
            {msg}
          </p>
        )}

        {/* Game result */}
        {isEnded && game && (
          <div
            className={`border rounded-lg px-5 py-4 mb-4 flex items-center justify-between ${
              game.status === 'won'
                ? 'border-green-500/30 bg-green-500/5'
                : 'border-red-500/30 bg-red-500/5'
            }`}
          >
            <div>
              <p className={`font-bold text-lg ${game.status === 'won' ? 'text-green-400' : 'text-red-400'}`}>
                {game.status === 'won' ? `WON $${game.payout}!` : 'GAME OVER'}
              </p>
              <p className="text-white/40 text-xs mt-0.5">{msg}</p>
            </div>
            <button
              onClick={resetGame}
              className="px-5 py-2.5 bg-white text-black font-bold rounded text-sm hover:bg-white/90 transition-all"
            >
              PLAY AGAIN
            </button>
          </div>
        )}

        {/* Grid */}
        {game ? (
          <div className="grid grid-cols-5 gap-1.5">
            {game.cells.map((state, idx) => (
              <button
                key={idx}
                onClick={() => revealCell(idx)}
                className={cellStyle(state, idx)}
                disabled={!isActive || state !== 'hidden' || loading}
              >
                {cellContent(state)}
              </button>
            ))}
          </div>
        ) : (
          <div className="border border-white/5 rounded-lg grid grid-cols-5 gap-1.5 p-4 opacity-30">
            {Array(25).fill(null).map((_, i) => (
              <div key={i} className="aspect-square rounded bg-white/5 border border-white/5" />
            ))}
          </div>
        )}

        <div className="mt-6 border border-white/5 rounded-lg p-4">
          <p className="text-white/20 text-xs tracking-wider mb-2 uppercase">How to play</p>
          <ul className="text-white/30 text-xs space-y-1">
            <li>• Set your bet and number of mines, then click Play.</li>
            <li>• Reveal cells — safe cells (💎) multiply your winnings.</li>
            <li>• Hit a mine (💥) and you lose your bet.</li>
            <li>• Cash out anytime to secure your winnings.</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
