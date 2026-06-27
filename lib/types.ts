export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  balance: number;
  createdAt: string;
}

export interface MinesGame {
  id: string;
  userId: string;
  grid: boolean[]; // true = mine
  revealed: boolean[];
  bet: number;
  mineCount: number;
  status: 'active' | 'won' | 'lost';
  revealedSafe: number;
  createdAt: string;
}

export interface MemoryGame {
  id: string;
  userId: string;
  bet: number;
  status: 'active' | 'won' | 'lost';
  wrongGuesses: number;
  createdAt: string;
}
