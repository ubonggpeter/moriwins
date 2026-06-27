'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <Logo size="md" />
          <h1 className="text-2xl font-black tracking-widest mt-4">MORIWINS</h1>
          <p className="text-white/30 text-xs tracking-wider mt-1">CREATE FREE ACCOUNT</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded px-4 py-2.5 mb-4 text-center">
          <span className="text-yellow-400 text-xs font-mono font-bold">+$1,000</span>
          <span className="text-white/40 text-xs ml-2">FREE CREDITS ON SIGNUP</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-white/40 tracking-wider uppercase block mb-1.5">
              Username
            </label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={20}
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-white/40 transition-colors placeholder:text-white/20"
              placeholder="coolplayer"
            />
          </div>

          <div>
            <label className="text-xs text-white/40 tracking-wider uppercase block mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-white/40 transition-colors placeholder:text-white/20"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="text-xs text-white/40 tracking-wider uppercase block mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 text-white text-sm focus:outline-none focus:border-white/40 transition-colors placeholder:text-white/20"
              placeholder="at least 6 characters"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs border border-red-400/20 bg-red-400/5 rounded px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-bold py-3 rounded tracking-wider text-sm hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <p className="text-center text-white/30 text-xs mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-white hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
