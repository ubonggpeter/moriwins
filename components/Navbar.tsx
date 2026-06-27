'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Logo from './Logo';

export default function Navbar() {
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [username, setUsername] = useState('');

  useEffect(() => {
    fetch('/api/user')
      .then(r => r.json())
      .then(d => {
        if (d.username) {
          setUsername(d.username);
          setBalance(d.balance);
        }
      })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3">
          <Logo size="sm" />
          <span className="text-white font-bold tracking-widest text-sm">MORIWINS</span>
        </Link>

        <div className="flex items-center gap-6">
          <Link href="/games/mines" className="text-white/70 hover:text-white text-sm transition-colors">
            Mines
          </Link>
          <Link href="/games/memory" className="text-white/70 hover:text-white text-sm transition-colors">
            Memory
          </Link>
          <Link href="/deposit" className="text-white/70 hover:text-white text-sm transition-colors">
            Deposit
          </Link>

          {balance !== null && (
            <span className="text-yellow-400 font-mono font-bold text-sm border border-yellow-400/30 px-3 py-1 rounded">
              ${balance.toLocaleString()}
            </span>
          )}

          <div className="flex items-center gap-3">
            {username && (
              <span className="text-white/50 text-xs hidden sm:block">{username}</span>
            )}
            <button
              onClick={handleLogout}
              className="text-xs text-white/40 hover:text-white/80 transition-colors border border-white/10 hover:border-white/30 px-3 py-1 rounded"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
