'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Gem, Layers, Brain } from 'lucide-react';
import Logo from '@/components/Logo';
import Leaderboard from '@/components/Leaderboard';

const GAMES = [
  { title: 'Mines', desc: 'Reveal cells, avoid mines, cash out anytime.', Icon: Gem, tag: 'HIGH RISK' },
  { title: 'Memory', desc: 'Memorize cards and match all pairs to win.', Icon: Layers, tag: 'SKILL' },
  { title: 'Text Recall', desc: 'Read a passage, fill in the missing words.', Icon: Brain, tag: 'MEMORY' },
];

export default function LandingPage() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <main className="min-h-screen bg-black flex flex-col max-w-lg md:max-w-2xl mx-auto">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 pt-20 pb-10 text-center">
        <div
          className="transition-all duration-700"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(24px)',
          }}
        >
          <div className="flex justify-center mb-6">
            <Logo size="lg" />
          </div>

          <h1
            className="text-5xl font-black tracking-tighter mb-3 shimmer-text"
            style={{ letterSpacing: '-0.04em' }}
          >
            MORIWINS
          </h1>

          <p className="text-white/40 text-base tracking-widest mb-2 uppercase">
            Play. Risk. Win.
          </p>

          <p className="text-white/25 text-sm max-w-xs mx-auto mb-8 leading-relaxed">
            A dark gaming platform. Start with <span className="text-yellow-400 font-mono font-bold">$1,000</span> free credits.
          </p>

          <div className="flex flex-col gap-3">
            <Link
              href="/auth/register"
              className="w-full py-4 bg-white text-black font-bold tracking-wider text-sm rounded-2xl glow-pulse"
            >
              GET STARTED FREE
            </Link>
            <Link
              href="/auth/login"
              className="w-full py-4 border border-white/15 text-white font-bold tracking-wider text-sm rounded-2xl hover:border-white/30 transition-all"
            >
              SIGN IN
            </Link>
          </div>
        </div>
      </section>

      {/* Games preview */}
      <section className="px-6 pb-8">
        <p className="text-white/20 text-xs tracking-widest uppercase mb-4 text-center">
          Games Available
        </p>
        <div className="space-y-3">
          {GAMES.map((g, i) => (
            <div
              key={g.title}
              className="bg-[#111111] rounded-2xl p-5"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(16px)',
                transitionDelay: `${i * 80 + 300}ms`,
                transitionDuration: '500ms',
                transition: 'opacity 500ms, transform 500ms',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <g.Icon size={24} className="text-white/70" />
                  <div>
                    <p className="text-white font-bold text-sm">{g.title}</p>
                    <p className="text-white/40 text-xs mt-0.5">{g.desc}</p>
                  </div>
                </div>
                <span className="text-[10px] tracking-widest text-white/30 border border-white/10 px-2 py-0.5 rounded-full">
                  {g.tag}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Leaderboard */}
      <section className="px-6 pb-12">
        <p className="text-white/20 text-xs tracking-widest uppercase mb-4 text-center">Top Earners</p>
        <Leaderboard />
      </section>

      <footer className="border-t border-white/5 py-5 text-center text-white/15 text-xs tracking-wider">
        MORIWINS &copy; {new Date().getFullYear()} &mdash; ENTERTAINMENT ONLY
      </footer>
    </main>
  );
}
