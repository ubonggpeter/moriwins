'use client';
import { useEffect, useState, useCallback } from 'react';

interface Entry { username: string; earnings: number; avatarUrl?: string | null; }

export default function Leaderboard() {
  const [tab, setTab] = useState<'games' | 'referrals'>('games');
  const [gameEarners, setGameEarners] = useState<Entry[]>([]);
  const [referralEarners, setReferralEarners] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(d => {
        setGameEarners(d.gameEarners ?? []);
        setReferralEarners(d.referralEarners ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const list = tab === 'games' ? gameEarners : referralEarners;

  const rankBadge = (i: number) => {
    if (i === 0) return <span className="font-black text-yellow-400 text-sm">1</span>;
    if (i === 1) return <span className="font-black text-white/60 text-sm">2</span>;
    if (i === 2) return <span className="font-black text-amber-600 text-sm">3</span>;
    return <span className="text-white/30 text-xs">{i + 1}</span>;
  };

  return (
    <div className="bg-[#111111] rounded-2xl overflow-hidden">
      <div className="flex border-b border-white/[0.06]">
        {(['games', 'referrals'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-xs font-bold tracking-wider uppercase transition-colors ${
              tab === t ? 'text-white border-b-2 border-white -mb-px' : 'text-white/30 hover:text-white/60'
            }`}
          >
            {t === 'games' ? 'Top Players' : 'Top Referrers'}
          </button>
        ))}
      </div>

      <div className="p-2">
        {loading ? (
          <div className="py-8 text-center text-white/20 text-xs">Loading...</div>
        ) : list.length === 0 ? (
          <div className="py-8 text-center text-white/20 text-xs">No entries yet — be the first!</div>
        ) : (
          list.map((entry, i) => (
            <div key={entry.username} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.03]">
              <span className="text-base w-6 text-center">{rankBadge(i)}</span>
              <div className="w-8 h-8 rounded-full bg-[#1c1c1c] flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden">
                {entry.avatarUrl
                  ? <img src={entry.avatarUrl} alt="" className="w-full h-full object-cover" /> /* eslint-disable-line @next/next/no-img-element */
                  : entry.username[0]?.toUpperCase()}
              </div>
              <span className="flex-1 text-white text-sm font-medium truncate">{entry.username}</span>
              <span className="text-green-400 font-mono font-bold text-sm">${entry.earnings.toLocaleString()}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
