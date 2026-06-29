'use client';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Logo from '@/components/Logo';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [refBy, setRefBy] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) setRefBy(ref);
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, ref: refBy || undefined }),
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
    <main className="min-h-screen bg-black flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-[430px] md:bg-[#0a0a0a] md:border md:border-white/[0.06] md:rounded-3xl md:p-10">
        <div className="flex flex-col items-center mb-8">
          <Logo size="md" />
          <h1 className="text-2xl font-black tracking-widest mt-4">MORIWINS</h1>
          <p className="text-white/30 text-xs tracking-wider mt-1">CREATE FREE ACCOUNT</p>
        </div>

        {/* Free credits banner */}
        <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
          <span className="text-2xl">🎁</span>
          <div>
            <p className="text-yellow-400 text-sm font-bold font-mono">$1,000 FREE CREDITS</p>
            <p className="text-white/40 text-xs mt-0.5">Instantly credited on signup</p>
          </div>
        </div>

        {/* Referral notice */}
        {refBy && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
            <span className="text-2xl">🤝</span>
            <div>
              <p className="text-green-400 text-sm font-bold">You were referred by a friend</p>
              <p className="text-white/40 text-xs mt-0.5">They&apos;ll earn $50 when you join</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-white/40 tracking-wider uppercase block mb-2">
              Username
            </label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={20}
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              className="w-full bg-[#111111] border border-white/8 rounded-2xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-white/30 transition-colors placeholder:text-white/20"
              placeholder="coolplayer"
            />
          </div>

          <div>
            <label className="text-xs text-white/40 tracking-wider uppercase block mb-2">
              Email
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full bg-[#111111] border border-white/8 rounded-2xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-white/30 transition-colors placeholder:text-white/20"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="text-xs text-white/40 tracking-wider uppercase block mb-2">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full bg-[#111111] border border-white/8 rounded-2xl px-4 py-3.5 text-white text-sm focus:outline-none focus:border-white/30 transition-colors placeholder:text-white/20"
              placeholder="at least 6 characters"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3">
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-bold py-4 rounded-2xl tracking-wider text-sm hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
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

// useSearchParams() requires a Suspense boundary in Next.js 14 App Router
export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
