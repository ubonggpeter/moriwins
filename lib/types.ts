export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  balance: number;
  createdAt: string;
  isAdmin: boolean;
  referralCode: string;
  referredBy: string | null;
  referralEarnings: number;
  totalGameWinnings: number;
  avatarUrl: string | null;
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

export interface BankAccount {
  id: string;
  userId: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  createdAt: string;
}

export interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  bankAccountId: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeaderboardEntry {
  username: string;
  earnings: number;
}

export interface ReferralStats {
  referralCode: string;
  referralLink: string;
  totalReferrals: number;
  referralEarnings: number;
}
