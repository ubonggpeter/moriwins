'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';

const GAMES = [
  {
    key: 'mines' as const,
    title: 'Mines',
    subtitle: 'Minesweeper · Bet-based',
    desc: 'Reveal cells and avoid mines. Cash out anytime before you explode.',
    icon: '💎',
    href: '/games/mines',
    tag: 'HIGH RISK',
    tagColor: 'text-red-400',
    rtp: '97% RTP',
  },
  {
    key: 'memory' as const,
    title: 'Memory',
    subtitle: 'Card Match · Skill-based',
    desc: 'Memorize the card layout and match all pairs to win.',
    icon: '🃏',
    href: '/games/memory',
    tag: 'SKILL',
    tagColor: 'text-blue-400',
    rtp: 'Up to 2.5x',
  },
];

export default function GamesPage() {
  const router = useRouter();
  const [muted, setMuted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/games/status')
      .then(r => r.json())
      .then(d => setMuted({ mines: !!d.mines?.muted, memory: !!d.memory?.muted }))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-black pb-20 md:pb-10 md:pt-14">
      <div className="max-w-lg md:max-w-4xl mx-auto px-5 md:px-8">

        {/* Header */}
        <div className="flex items-center gap-3 pt-10 md:pt-8 pb-6">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-[#111111] flex items-center justify-center"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-white font-bold text-lg md:text-xl">Games</h1>
            <p className="text-white/30 text-xs">Choose your game</p>
          </div>
        </div>

        {/* Game cards — 1 col mobile, 2 col desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {GAMES.filter(g => !muted[g.key]).map(g => (
            <Link key={g.key} href={g.href} className="block bg-[#111111] rounded-2xl p-5 md:p-6">
              <div className="flex items-start justify-between mb-4">
                <span className="text-4xl md:text-5xl">{g.icon}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] tracking-wider ${g.tagColor}`}>{g.tag}</span>
                  <span className="text-[10px] text-white/25 border border-white/10 px-2 py-0.5 rounded-full">
                    {g.rtp}
                  </span>
                </div>
              </div>
              <p className="text-white font-bold text-base md:text-lg mb-1">{g.title}</p>
              <p className="text-white/35 text-xs mb-1">{g.subtitle}</p>
              <p className="text-white/30 text-xs leading-relaxed mb-4">{g.desc}</p>
              <div className="bg-white text-black font-bold text-sm py-3 rounded-full text-center">
                Play {g.title}
              </div>
            </Link>
          ))}
        </div>

      </div>
      <BottomNav />
    </div>
  );
}
