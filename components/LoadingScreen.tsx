'use client';
import Logo from './Logo';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
      <Logo size="lg" />
      <p className="text-white/20 text-xs tracking-widest uppercase">Loading</p>
    </div>
  );
}
