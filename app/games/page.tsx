'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Gem, Layers, Brain, Trophy } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

const GAMES = [
  { key: 'mines'  as const, title: 'Mines',       subtitle: 'Minesweeper · Bet-based',     desc: 'Reveal cells and avoid mines. Cash out anytime before you explode.', Icon: Gem,    href: '/games/mines',  tag: 'HIGH RISK', tagColor: 'text-red-400',    rtp: '97% RTP'   },
  { key: 'memory' as const, title: 'Memory',      subtitle: 'Card Match · Skill-based',     desc: 'Memorize the card layout and match all pairs to win.',              Icon: Layers, href: '/games/memory', tag: 'SKILL',     tagColor: 'text-blue-400',   rtp: 'Up to 2.5x' },
  { key: 'recall' as const, title: 'Text Recall', subtitle: 'Fill the Blanks · Text-based', desc: 'Read a passage, then fill in the missing words from memory.',       Icon: Brain,  href: '/games/recall', tag: 'MEMORY',    tagColor: 'text-purple-400', rtp: 'Up to 5x'  },
];

export default function GamesPage() {
  const router = useRouter();
  const [muted, setMuted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/games/status')
      .then(r => r.json())
      .then(d => setMuted({ mines: !!d.mines?.muted, memory: !!d.memory?.muted, recall: !!d.recall?.muted }))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-black pb-28 md:pb-10 md:pt-14">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

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

        {/* Tournaments banner */}
        <Link href="/tournaments" className="block bg-[#111111] border border-yellow-400/20 rounded-2xl p-4 mb-4 flex items-center gap-4 hover:border-yellow-400/40 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-yellow-400/10 flex items-center justify-center shrink-0">
            <Trophy size={20} className="text-yellow-400" />
          </div>
          <div className="flex-1">
            <p className="text-white font-bold text-sm">Tournaments</p>
            <p className="text-white/40 text-xs">Compete against others · Win the prize pool</p>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-4 h-4 text-white/30 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        {/* Game cards — 1 col mobile, 2 col desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {GAMES.filter(g => !muted[g.key]).map(g => (
            <Link key={g.key} href={g.href} className="block bg-[#111111] rounded-2xl p-5 md:p-6">
              <div className="flex items-start justify-between mb-4">
                <g.Icon size={36} className="text-white/70 md:w-12 md:h-12" />
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
