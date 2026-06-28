// Pure game-logic functions — no I/O, no DB, no side-effects.
// Game state is persisted in PostgreSQL (see API routes).

const GRID_SIZE = 25; // 5x5

export function createMineGrid(mineCount: number): boolean[] {
  const grid = Array(GRID_SIZE).fill(false);
  const positions = Array.from({ length: GRID_SIZE }, (_, i) => i);
  for (let i = 0; i < mineCount; i++) {
    const j = Math.floor(Math.random() * (positions.length - i)) + i;
    [positions[i], positions[j]] = [positions[j], positions[i]];
    grid[positions[i]] = true;
  }
  return grid;
}

export function calcMinesMultiplier(total: number, mines: number, revealed: number): number {
  if (revealed === 0) return 1;
  const safe = total - mines;
  let mult = 0.97;
  for (let i = 0; i < revealed; i++) {
    mult *= (total - i) / (safe - i);
  }
  return Math.round(mult * 100) / 100;
}

export function calcMemoryMultiplier(wrongGuesses: number): number {
  if (wrongGuesses === 0) return 2.5;
  if (wrongGuesses <= 2) return 2.0;
  if (wrongGuesses <= 5) return 1.5;
  if (wrongGuesses <= 8) return 1.2;
  return 0;
}
