'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Gem, Layers, Brain } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import Leaderboard from '@/components/Leaderboard';

interface User {
  username: string;
  email: string;
  balance: number;
  isAdmin?: boolean;
  avatarUrl?: string | null;
}

interface ReferralStats {
  referralCode: string;
  referralLink: string;
  totalReferrals: number;
  referralEarnings: number;
}

const GAMES = [
  { key: 'mines',  title: 'Mines',       desc: 'Reveal cells and avoid mines',          Icon: Gem,    href: '/games/mines',  tag: 'HIGH RISK', tagColor: 'text-red-400' },
  { key: 'memory', title: 'Memory',      desc: 'Match all pairs to win',                Icon: Layers, href: '/games/memory', tag: 'SKILL',     tagColor: 'text-blue-400' },
  { key: 'recall', title: 'Text Recall', desc: 'Read a passage, fill in missing words', Icon: Brain,  href: '/games/recall', tag: 'MEMORY',    tagColor: 'text-purple-400' },
];

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [referral, setReferral] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [mutedGames, setMutedGames] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/user')
      .then(r => r.json())
      .then(d => { if (d.username) setUser(d); })
      .catch(() => {});
    fetch('/api/referral')
      .then(r => r.json())
      .then(d => { if (d.referralCode) setReferral(d); })
      .catch(() => {});
    fetch('/api/games/status')
      .then(r => r.json())
      .then(d => setMutedGames({ mines: !!d.mines?.muted, memory: !!d.memory?.muted, recall: !!d.recall?.muted }))
      .catch(() => {});
  }, []);

  function copyReferralLink() {
    if (!referral) return;
    navigator.clipboard.writeText(referral.referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const initial = user?.username?.[0]?.toUpperCase() ?? '?';

  return (
    <div className="min-h-screen bg-black pb-28 md:pb-10 md:pt-14">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex items-center justify-between pt-10 md:pt-8 pb-6">
          <div>
            <p className="text-white/40 text-xs tracking-wider">Welcome back</p>
            <p className="text-white font-bold text-lg md:text-xl mt-0.5">{user?.username ?? '—'}</p>
          </div>
          <div className="flex items-center gap-2">
            {user?.isAdmin === true && (
              <Link
                href="/admin"
                className="bg-yellow-400 text-black text-xs font-black px-3 py-1.5 rounded-full tracking-wide hover:bg-yellow-300 transition-colors"
              >
                ADMIN
              </Link>
            )}
            <div className="w-10 h-10 rounded-full bg-[#1c1c1c] border border-white/10 overflow-hidden flex items-center justify-center">
              {user?.avatarUrl
                ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" /> /* eslint-disable-line @next/next/no-img-element */
                : <span className="text-white font-bold text-sm">{initial}</span>}
            </div>
          </div>
        </div>

        {/* Desktop 2-column / mobile single-column layout */}
        <div className="md:grid md:grid-cols-[1fr_300px] md:gap-6 md:items-start lg:grid-cols-[1fr_340px]">

          {/* Left column */}
          <div>
            {/* Balance card */}
            <div className="bg-[#111111] rounded-2xl p-6 mb-4">
              <p className="text-white/40 text-xs tracking-wider mb-1">Cash balance</p>
              <p className="text-yellow-400 font-mono font-black text-3xl md:text-4xl lg:text-5xl mb-5 break-all">
                ${user?.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '—'}
              </p>
              <div className="flex gap-3">
                <Link
                  href="/deposit"
                  className="flex-1 bg-white text-black font-bold text-sm py-3 rounded-full text-center"
                >
                  Add Money
                </Link>
                <Link
                  href="/withdraw"
                  className="flex-1 bg-[#1c1c1c] text-white font-bold text-sm py-3 rounded-full text-center border border-white/[0.08]"
                >
                  Withdraw
                </Link>
              </div>
            </div>

            {/* Referral card — compact banner */}
            {referral && (
              <div className="bg-[#111111] rounded-2xl p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white font-bold text-sm">Invite Friends</p>
                  <div className="flex items-center gap-3">
                    <span className="text-white font-black text-sm">{referral.totalReferrals}</span>
                    <span className="text-white/30 text-[10px]">refs</span>
                    <span className="text-green-400 font-black text-sm font-mono">${referral.referralEarnings.toLocaleString()}</span>
                    <span className="bg-green-500/15 text-green-400 text-[10px] font-black px-2 py-0.5 rounded-full">+$50</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-[#1a1a1a] rounded-lg px-3 py-1.5 shrink-0">
                    <span className="text-yellow-400 text-xs font-mono font-black tracking-widest">{referral.referralCode}</span>
                  </div>
                  <div className="bg-[#1a1a1a] rounded-lg px-3 py-1.5 flex-1 min-w-0 overflow-hidden">
                    <p className="text-white/40 text-[10px] font-mono truncate">{referral.referralLink}</p>
                  </div>
                  <button
                    onClick={copyReferralLink}
                    className={`shrink-0 font-bold text-xs px-4 py-1.5 rounded-full transition-colors ${
                      copied ? 'bg-green-500 text-black' : 'bg-white text-black hover:bg-gray-100'
                    }`}
                  >
                    {copied ? '✓' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            {/* Daily goal */}
            <div className="bg-[#111111] rounded-2xl p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white/50 text-xs tracking-wider">Daily Goal</p>
                <p className="text-white/50 text-xs font-mono">$0 / $500</p>
              </div>
              <div className="w-full h-1.5 bg-white/8 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-400 rounded-full" style={{ width: '0%' }} />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6">
              {[
                { label: 'Balance', value: `$${user?.balance.toLocaleString() ?? 0}`, color: 'text-yellow-400' },
                { label: 'Status', value: 'Active', color: 'text-green-400' },
                { label: 'Games', value: '3', color: 'text-white' },
              ].map(s => (
                <div key={s.label} className="bg-[#111111] rounded-2xl p-3 md:p-4 text-center overflow-hidden">
                  <p className={`text-sm md:text-base font-bold truncate ${s.color}`}>{s.value}</p>
                  <p className="text-white/30 text-[10px] tracking-wider mt-1 uppercase">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Game cards */}
            <p className="text-white/30 text-xs tracking-widest uppercase mb-3">Play Now</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              {GAMES.filter(g => !mutedGames[g.key]).map(g => (
                <Link key={g.title} href={g.href} className="bg-[#111111] rounded-2xl p-5 flex items-center gap-4 group">
                  <g.Icon size={22} className="text-white/70 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-white font-bold text-sm">{g.title}</p>
                      <span className={`text-[9px] tracking-wider ${g.tagColor}`}>{g.tag}</span>
                    </div>
                    <p className="text-white/35 text-xs truncate">{g.desc}</p>
                  </div>
                  <div className="bg-white text-black font-bold text-xs px-4 py-2 rounded-full shrink-0">Play</div>
                </Link>
              ))}
            </div>

            {/* Leaderboard (mobile only — desktop shows it in right column) */}
            <div className="md:hidden">
              <p className="text-white/30 text-xs tracking-widest uppercase mb-3">Leaderboard</p>
              <Leaderboard />
            </div>
          </div>

          {/* Right column — leaderboard on desktop */}
          <div className="hidden md:block">
            <p className="text-white/30 text-xs tracking-widest uppercase mb-3">Leaderboard</p>
            <Leaderboard />
          </div>

        </div>
      </div>
      <BottomNav />
    </div>
  );
}
