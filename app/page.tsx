'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';

const GAMES = [
  {
    title: 'MINES',
    desc: 'Navigate a minefield and cash out before you explode.',
    icon: '💎',
    href: '/games/mines',
    tag: 'HIGH RISK',
  },
  {
    title: 'MEMORY',
    desc: 'Match all pairs before your luck runs out.',
    icon: '🃏',
    href: '/games/memory',
    tag: 'SKILL',
  },
];

export default function LandingPage() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <main className="min-h-screen bg-black flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 pt-20 pb-10 text-center relative overflow-hidden">
        {/* background grid glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(255,255,255,0.04) 0%, transparent 70%)',
          }}
        />

        <div
          className="transition-all duration-700"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(30px)',
          }}
        >
          <div className="flex justify-center mb-6">
            <Logo size="lg" />
          </div>

          <h1
            className="text-6xl sm:text-8xl font-black tracking-tighter mb-4 shimmer-text"
            style={{ letterSpacing: '-0.04em' }}
          >
            MORIWINS
          </h1>

          <p className="text-white/40 text-lg sm:text-xl tracking-widest mb-2 uppercase">
            Play. Risk. Win.
          </p>

          <p className="text-white/25 text-sm max-w-md mx-auto mb-10">
            A premium dark-theme gaming platform. Start with $1,000 free credits.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/register"
              className="px-8 py-3 bg-white text-black font-bold tracking-wider text-sm hover:bg-white/90 transition-all rounded glow-pulse"
            >
              GET STARTED FREE
            </Link>
            <Link
              href="/auth/login"
              className="px-8 py-3 border border-white/20 text-white font-bold tracking-wider text-sm hover:border-white/50 hover:bg-white/5 transition-all rounded"
            >
              SIGN IN
            </Link>
          </div>
        </div>
      </section>

      {/* Games preview */}
      <section className="max-w-4xl mx-auto w-full px-6 pb-20">
        <p className="text-white/20 text-xs tracking-widest uppercase mb-6 text-center">
          Available Games
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {GAMES.map((g, i) => (
            <div
              key={g.title}
              className="border border-white/8 rounded-lg p-6 bg-white/2 hover:bg-white/5 hover:border-white/20 transition-all group"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(20px)',
                transitionDelay: `${i * 100 + 400}ms`,
                transitionDuration: '500ms',
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <span className="text-3xl">{g.icon}</span>
                <span className="text-[10px] tracking-widest text-white/30 border border-white/10 px-2 py-0.5 rounded">
                  {g.tag}
                </span>
              </div>
              <h3 className="text-white font-bold tracking-widest text-sm mb-2">{g.title}</h3>
              <p className="text-white/40 text-xs leading-relaxed">{g.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/5 py-6 text-center text-white/20 text-xs tracking-wider">
        MORIWINS &copy; {new Date().getFullYear()} &mdash; FOR ENTERTAINMENT PURPOSES ONLY
      </footer>
    </main>
  );
}
