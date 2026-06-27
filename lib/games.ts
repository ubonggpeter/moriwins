import type { MinesGame, MemoryGame } from './types';

// In-memory game store (resets on restart — fine for demo)
export const activeMinesGames = new Map<string, MinesGame>();
export const activeMemoryGames = new Map<string, MemoryGame>();

const GRID_SIZE = 25; // 5x5

export function createMinesGame(
  id: string,
  userId: string,
  bet: number,
  mineCount: number
): MinesGame {
  // Place mines randomly
  const grid = Array(GRID_SIZE).fill(false);
  const positions = Array.from({ length: GRID_SIZE }, (_, i) => i);
  for (let i = 0; i < mineCount; i++) {
    const j = Math.floor(Math.random() * (positions.length - i)) + i;
    [positions[i], positions[j]] = [positions[j], positions[i]];
    grid[positions[i]] = true;
  }

  const game: MinesGame = {
    id,
    userId,
    grid,
    revealed: Array(GRID_SIZE).fill(false),
    bet,
    mineCount,
    status: 'active',
    revealedSafe: 0,
    createdAt: new Date().toISOString(),
  };
  activeMinesGames.set(id, game);
  return game;
}

export function calcMinesMultiplier(total: number, mines: number, revealed: number): number {
  // Product of (total-i)/(safe-i) for i=0..revealed-1, with 97% RTP
  if (revealed === 0) return 1;
  const safe = total - mines;
  let mult = 0.97;
  for (let i = 0; i < revealed; i++) {
    mult *= (total - i) / (safe - i);
  }
  return Math.round(mult * 100) / 100;
}

export function revealCell(
  game: MinesGame,
  cellIndex: number
): { isMine: boolean; multiplier: number; payout: number } {
  if (game.revealed[cellIndex]) throw new Error('Cell already revealed');

  game.revealed[cellIndex] = true;
  const isMine = game.grid[cellIndex];

  if (isMine) {
    game.status = 'lost';
    return { isMine: true, multiplier: 0, payout: 0 };
  }

  game.revealedSafe++;
  const multiplier = calcMinesMultiplier(GRID_SIZE, game.mineCount, game.revealedSafe);
  return { isMine: false, multiplier, payout: Math.floor(game.bet * multiplier) };
}

export function cashoutMines(game: MinesGame): number {
  if (game.status !== 'active' || game.revealedSafe === 0) return 0;
  const multiplier = calcMinesMultiplier(GRID_SIZE, game.mineCount, game.revealedSafe);
  const payout = Math.floor(game.bet * multiplier);
  game.status = 'won';
  return payout;
}

export function calcMemoryMultiplier(wrongGuesses: number): number {
  if (wrongGuesses === 0) return 2.5;
  if (wrongGuesses <= 2) return 2.0;
  if (wrongGuesses <= 5) return 1.5;
  if (wrongGuesses <= 8) return 1.2;
  return 0;
}
