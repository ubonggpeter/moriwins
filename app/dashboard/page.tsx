'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Gem, Layers, Brain, X, Menu, ExternalLink } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import Leaderboard from '@/components/Leaderboard';

interface User {
  username: string;
  email: string;
  fullName?: string;
  balance: number;
  isAdmin?: boolean;
  isSubAdmin?: boolean;
  avatarUrl?: string | null;
}

interface ReferralStats {
  referralCode: string;
  referralLink: string;
  totalReferrals: number;
  referralEarnings: number;
}

interface Announcement {
  id: string;
  title: string;
  description: string;
  link_url: string;
  created_at: string;
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
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetch('/api/user').then(r => r.json()).then(d => { if (d.username) setUser(d); }).catch(() => {});
    fetch('/api/referral').then(r => r.json()).then(d => { if (d.referralCode) setReferral(d); }).catch(() => {});
    fetch('/api/games/status').then(r => r.json()).then(d => setMutedGames({ mines: !!d.mines?.muted, memory: !!d.memory?.muted, recall: !!d.recall?.muted })).catch(() => {});
    fetch('/api/announcements').then(r => r.json()).then(d => setAnnouncements(d.announcements ?? [])).catch(() => {});
  }, []);

  function copyReferralLink() {
    if (!referral) return;
    navigator.clipboard.writeText(referral.referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const displayName = user?.fullName?.trim()
    ? user.fullName.trim().split(/\s+/).slice(0, 2).join(' ')
    : (user?.username ?? '—');
  const initial = user?.username?.[0]?.toUpperCase() ?? '?';

  return (
    <>
      {/* ── Fixed top header ──────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-[60] bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/[0.05]">
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[56px]">
            {/* Left: hamburger + greeting */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="relative w-9 h-9 rounded-full bg-[#1c1c1c] border border-white/[0.08] flex items-center justify-center text-white/60 hover:text-white hover:bg-[#222] transition-colors"
              >
                <Menu size={16} />
                {announcements.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-yellow-400 rounded-full" />
                )}
              </button>
              <div>
                <p className="text-white/40 text-[10px] tracking-wider leading-none">Welcome back</p>
                <p className="text-white font-bold text-base leading-tight mt-0.5">{displayName}</p>
              </div>
            </div>

            {/* Right: admin badge + avatar */}
            <div className="flex items-center gap-2">
              {(user?.isAdmin === true || user?.isSubAdmin === true) && (
                <Link
                  href="/admin"
                  className="bg-yellow-400 text-black text-[10px] font-black px-2.5 py-1 rounded-full tracking-wide hover:bg-yellow-300 transition-colors"
                >
                  {user?.isAdmin ? 'ADMIN' : 'SUB-ADMIN'}
                </Link>
              )}
              <div className="w-9 h-9 rounded-full bg-[#1c1c1c] border border-white/10 overflow-hidden flex items-center justify-center">
                {user?.avatarUrl
                  ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" /> /* eslint-disable-line @next/next/no-img-element */
                  : <span className="text-white font-bold text-sm">{initial}</span>}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Overlay for sidebar ───────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Left sidebar drawer ───────────────────────────── */}
      <aside
        className={`fixed top-0 left-0 h-full w-[280px] max-w-[78vw] bg-[#0e0e0e] border-r border-white/[0.07] z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 pt-12 pb-4 border-b border-white/[0.07]">
          <div>
            <p className="text-white font-black text-base">What&apos;s New</p>
            <p className="text-white/30 text-xs mt-0.5">Latest updates &amp; features</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {announcements.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/20 text-sm">No announcements yet</p>
              <p className="text-white/10 text-xs mt-1">Check back soon!</p>
            </div>
          ) : (
            announcements.map((a, i) => (
              <div key={a.id} className={`rounded-2xl p-4 ${i === 0 ? 'bg-yellow-400/8 border border-yellow-400/15' : 'bg-[#161616]'}`}>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className={`font-bold text-sm ${i === 0 ? 'text-yellow-400' : 'text-white'}`}>{a.title}</p>
                  {i === 0 && <span className="text-[9px] font-black text-yellow-400 bg-yellow-400/15 px-1.5 py-0.5 rounded-full shrink-0">NEW</span>}
                </div>
                {a.description && (
                  <p className="text-white/40 text-xs leading-relaxed mb-2">{a.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-white/20 text-[10px]">{new Date(a.created_at).toLocaleDateString()}</p>
                  {a.link_url && (
                    <Link
                      href={a.link_url}
                      onClick={() => setSidebarOpen(false)}
                      className="text-yellow-400 text-[10px] font-bold flex items-center gap-1 hover:text-yellow-300"
                    >
                      Learn more <ExternalLink size={10} />
                    </Link>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-4 pb-8 pt-3 border-t border-white/[0.07]">
          <p className="text-white/15 text-[10px] text-center">MoriWins Platform</p>
        </div>
      </aside>

      {/* ── Page content (offset by fixed header) ─────────── */}
      <div className="min-h-screen bg-black pt-[56px] pb-28 md:pb-10">
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="pt-5 md:pt-6">
            <div className="md:grid md:grid-cols-[1fr_300px] md:gap-6 md:items-start lg:grid-cols-[1fr_340px]">

              {/* Left column */}
              <div>

                {/* ── Premium glass balance card ─────────── */}
                <div className="relative overflow-hidden rounded-3xl mb-4 balance-card-shine" style={{ minHeight: 172 }}>
                  {/* Animated gradient base */}
                  <div className="absolute inset-0 balance-card-bg" />

                  {/* Gold accent blobs */}
                  <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-yellow-400/10 blur-2xl" />
                  <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-amber-500/8 blur-xl" />

                  {/* Glass frost layer */}
                  <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-[2px]" />

                  {/* Border glow */}
                  <div className="absolute inset-0 rounded-3xl border border-yellow-400/15 shadow-[inset_0_0_0_1px_rgba(255,210,80,0.08)]" />

                  {/* MORIWINS watermark */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                    <span
                      className="text-white font-black select-none"
                      style={{
                        fontSize: 'clamp(48px, 15vw, 80px)',
                        opacity: 0.025,
                        letterSpacing: '0.15em',
                        transform: 'rotate(-12deg)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      MORIWINS
                    </span>
                  </div>

                  {/* Card content */}
                  <div className="relative z-10 p-6">
                    {/* Top row: label + chip */}
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-yellow-400/60 text-[10px] font-bold tracking-[0.2em] uppercase">Cash Balance</p>
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-full bg-yellow-400/40" />
                        <div className="w-4 h-4 rounded-full bg-amber-300/25 -ml-2.5" />
                      </div>
                    </div>

                    {/* Balance amount */}
                    <p className="text-white font-mono font-black mb-1 leading-none" style={{ fontSize: 'clamp(28px, 8vw, 44px)' }}>
                      ${user?.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00'}
                    </p>
                    <p className="text-white/20 text-[10px] font-mono mb-5 tracking-widest">MORIWINS ACCOUNT</p>

                    {/* Action buttons */}
                    <div className="flex gap-3">
                      <Link
                        href="/deposit"
                        className="flex-1 bg-yellow-400 text-black font-black text-xs py-3 rounded-2xl text-center hover:bg-yellow-300 transition-colors tracking-wide"
                      >
                        + Add Money
                      </Link>
                      <Link
                        href="/withdraw"
                        className="flex-1 font-bold text-xs py-3 rounded-2xl text-center text-white/80 hover:text-white transition-colors tracking-wide border border-white/15 hover:border-white/30 bg-white/[0.04] hover:bg-white/[0.07]"
                      >
                        Withdraw
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Referral card */}
                {referral && (
                  <div className="bg-[#111111] rounded-2xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white font-bold text-sm">Invite Friends</p>
                      <div className="flex items-center gap-3">
                        <span className="text-white font-black text-sm">{referral.totalReferrals}</span>
                        <span className="text-white/30 text-[10px]">refs</span>
                        <span className="text-green-400 font-black text-sm font-mono">${referral.referralEarnings.toLocaleString()}</span>
                        <span className="bg-green-500/15 text-green-400 text-[10px] font-black px-2 py-0.5 rounded-full">+50%</span>
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

                {/* Leaderboard (mobile only) */}
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
        </div>
      </div>

      <BottomNav />
    </>
  );
}
