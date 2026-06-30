'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, Gem, Layers, Brain, Clock, Users, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';

const GAME_ICONS: Record<string, React.ReactNode> = {
  mines:  <Gem size={16} className="text-red-400" />,
  memory: <Layers size={16} className="text-blue-400" />,
  recall: <Brain size={16} className="text-purple-400" />,
};
const GAME_LABELS: Record<string, string> = { mines: 'Mines', memory: 'Memory', recall: 'Text Recall' };
const GAME_HREFS: Record<string, string> = { mines: '/games/mines', memory: '/games/memory', recall: '/games/recall' };

interface Tournament {
  id: string;
  game_type: string;
  entry_bet: number;
  start_time: string;
  end_time: string | null;
  status: string;
  entry_count: number;
  total_pool: number;
}
interface Winner { tournament_id: string; game_type: string; username: string; result_amount: number; }
interface Standing { username: string; result_amount: number; bet_amount: number; rank: number; }

function useCountdown(target: string) {
  const [secs, setSecs] = useState(() => Math.max(0, Math.floor((new Date(target).getTime() - Date.now()) / 1000)));
  useEffect(() => {
    setSecs(Math.max(0, Math.floor((new Date(target).getTime() - Date.now()) / 1000)));
  }, [target]);
  useEffect(() => {
    if (secs <= 0) return;
    const id = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [secs]);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return secs > 0
    ? `${h > 0 ? `${h}h ` : ''}${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`
    : 'Ending soon';
}

function CountdownBadge({ startTime }: { startTime: string }) {
  const label = useCountdown(startTime);
  return (
    <span className="flex items-center gap-1 text-yellow-400 text-xs font-mono font-bold">
      <Clock size={11} /> {label}
    </span>
  );
}

function EndCountdownBadge({ endTime }: { endTime: string }) {
  const label = useCountdown(endTime);
  return (
    <span className="flex items-center gap-1 text-orange-400 text-xs font-mono">
      <Clock size={11} /> Ends in {label}
    </span>
  );
}

function LiveStandings({ tournamentId }: { tournamentId: string }) {
  const [standings, setStandings] = useState<Standing[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch_ = useCallback(() => {
    fetch(`/api/tournaments/${tournamentId}/standings`)
      .then(r => r.json())
      .then(d => setStandings(d.standings ?? []))
      .catch(() => {});
  }, [tournamentId]);

  useEffect(() => {
    fetch_();
    timerRef.current = setInterval(fetch_, 7000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fetch_]);

  if (standings.length === 0) {
    return (
      <div className="mt-4 pt-4 border-t border-white/[0.06]">
        <p className="text-white/25 text-xs text-center py-2">No players yet — be the first to join and play!</p>
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-white/[0.06]">
      <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2">Live Standings</p>
      <div className="space-y-1">
        {standings.map((s, i) => (
          <div key={s.username} className="flex items-center gap-2 py-1">
            <span className={`w-5 text-center text-xs font-black shrink-0 ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-white/60' : i === 2 ? 'text-orange-400' : 'text-white/20'}`}>
              {s.rank}
            </span>
            <span className="flex-1 text-white text-xs font-bold truncate">{s.username}</span>
            {s.result_amount > 0 ? (
              <span className="text-green-400 font-mono text-xs font-bold shrink-0">${s.result_amount.toLocaleString()}</span>
            ) : (
              <span className="text-white/20 font-mono text-xs shrink-0">playing…</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TournamentsPage() {
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [todayWinners, setTodayWinners] = useState<Winner[]>([]);
  const [userEntries, setUserEntries] = useState<Record<string, boolean>>({});
  const [joining, setJoining] = useState<string | null>(null);
  const [joinMsg, setJoinMsg] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch('/api/tournaments')
      .then(r => r.json())
      .then(d => {
        setTournaments(d.tournaments ?? []);
        setTodayWinners(d.todayWinners ?? []);
        setUserEntries(d.userEntries ?? {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
    fetch('/api/user').then(r => r.json()).then(d => { if (d.balance !== undefined) setBalance(d.balance); });
  }, []);

  useEffect(() => { load(); }, [load]);

  async function joinTournament(tournamentId: string) {
    setJoining(tournamentId);
    const res = await fetch('/api/tournaments/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tournamentId }),
    });
    const data = await res.json();
    setJoining(null);
    if (res.ok) {
      setBalance(data.balance);
      setUserEntries(p => ({ ...p, [tournamentId]: true }));
      setJoinMsg(p => ({ ...p, [tournamentId]: 'Joined!' }));
    } else {
      setJoinMsg(p => ({ ...p, [tournamentId]: data.error ?? 'Failed' }));
    }
  }

  const active   = tournaments.filter(t => t.status === 'active');
  const upcoming = tournaments.filter(t => t.status === 'upcoming');

  return (
    <div className="min-h-screen bg-black pb-24 md:pb-10 md:pt-14">
      <div className="w-full max-w-2xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="flex items-center gap-3 pt-12 pb-6">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-[#111111] flex items-center justify-center"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Trophy size={20} className="text-yellow-400" />
              <h1 className="text-white font-bold text-lg">Tournaments</h1>
            </div>
            <p className="text-white/30 text-xs">Compete · Win the prize pool</p>
          </div>
          <div className="text-right">
            <p className="text-white/30 text-[10px]">Balance</p>
            <p className="text-yellow-400 font-mono font-bold text-sm">${balance.toLocaleString()}</p>
          </div>
        </div>

        {loading && (
          <div className="text-center py-12">
            <p className="text-white/30 text-sm">Loading tournaments...</p>
          </div>
        )}

        {!loading && tournaments.length === 0 && (
          <div className="bg-[#111111] rounded-2xl p-8 text-center">
            <Trophy size={36} className="text-white/15 mx-auto mb-3" />
            <p className="text-white/50 font-bold">No tournaments right now</p>
            <p className="text-white/25 text-xs mt-1">Check back soon — admin creates new ones regularly</p>
          </div>
        )}

        {/* Active tournaments */}
        {active.length > 0 && (
          <div className="mb-6">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Active Now</p>
            <div className="space-y-3">
              {active.map(t => {
                const joined = userEntries[t.id];
                const msg    = joinMsg[t.id];
                return (
                  <div key={t.id} className="bg-[#111111] rounded-2xl p-5 border border-green-500/15">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-green-500/15 flex items-center justify-center">
                          {GAME_ICONS[t.game_type]}
                        </span>
                        <div>
                          <p className="text-white font-bold text-sm">{GAME_LABELS[t.game_type]}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-bold">LIVE</span>
                            {t.end_time && <EndCountdownBadge endTime={t.end_time} />}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white/30 text-[10px]">Entry</p>
                        <p className="text-yellow-400 font-mono font-bold">${t.entry_bet.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex gap-4 mb-4 text-center">
                      <div className="flex-1 bg-[#1a1a1a] rounded-xl py-2">
                        <p className="text-white font-bold text-sm font-mono">{t.entry_count}</p>
                        <p className="text-white/30 text-[10px]">Players</p>
                      </div>
                      <div className="flex-1 bg-[#1a1a1a] rounded-xl py-2">
                        <p className="text-green-400 font-bold text-sm font-mono">${Math.floor(t.total_pool * 0.5).toLocaleString()}</p>
                        <p className="text-white/30 text-[10px]">Prize Pool</p>
                      </div>
                    </div>

                    {msg && (
                      <p className={`text-xs text-center mb-2 font-bold ${msg === 'Joined!' ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>
                    )}

                    {joined ? (
                      <Link
                        href={GAME_HREFS[t.game_type]}
                        className="flex items-center justify-center gap-2 w-full bg-white text-black font-bold py-3 rounded-full text-sm hover:bg-gray-100 transition-colors"
                      >
                        Play {GAME_LABELS[t.game_type]} <ChevronRight size={14} />
                      </Link>
                    ) : (
                      <button
                        onClick={() => joinTournament(t.id)}
                        disabled={joining === t.id}
                        className="w-full bg-yellow-400 text-black font-bold py-3 rounded-full text-sm hover:bg-yellow-300 transition-colors disabled:opacity-50"
                      >
                        {joining === t.id ? 'Joining...' : `Join for $${t.entry_bet}`}
                      </button>
                    )}

                    <LiveStandings tournamentId={t.id} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Upcoming tournaments */}
        {upcoming.length > 0 && (
          <div className="mb-6">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Upcoming</p>
            <div className="space-y-3">
              {upcoming.map(t => {
                const joined = userEntries[t.id];
                const msg    = joinMsg[t.id];
                return (
                  <div key={t.id} className="bg-[#111111] rounded-2xl p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-[#1c1c1c] flex items-center justify-center">
                          {GAME_ICONS[t.game_type]}
                        </span>
                        <div>
                          <p className="text-white font-bold text-sm">{GAME_LABELS[t.game_type]}</p>
                          <CountdownBadge startTime={t.start_time} />
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white/30 text-[10px]">Entry</p>
                        <p className="text-yellow-400 font-mono font-bold">${t.entry_bet.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-white/30 text-xs mb-3">
                      <span className="flex items-center gap-1"><Users size={11} /> {t.entry_count} joined</span>
                      <span>·</span>
                      <span>Est. prize: ${Math.floor(t.total_pool * 0.5).toLocaleString()}</span>
                    </div>

                    {msg && (
                      <p className={`text-xs mb-2 font-bold ${msg === 'Joined!' ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>
                    )}

                    {joined ? (
                      <div className="w-full bg-green-500/10 border border-green-500/20 text-green-400 font-bold py-2.5 rounded-full text-sm text-center">
                        Registered — starts soon
                      </div>
                    ) : (
                      <button
                        onClick={() => joinTournament(t.id)}
                        disabled={joining === t.id}
                        className="w-full bg-[#1c1c1c] border border-white/10 text-white font-bold py-2.5 rounded-full text-sm hover:bg-white/8 transition-colors disabled:opacity-50"
                      >
                        {joining === t.id ? 'Joining...' : `Reserve spot · $${t.entry_bet}`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Today's winners */}
        {todayWinners.length > 0 && (
          <div className="mb-6">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Today&apos;s Winners</p>
            <div className="bg-[#111111] rounded-2xl overflow-hidden">
              {todayWinners.map((w, i) => (
                <div
                  key={`${w.tournament_id}-${w.username}`}
                  className={`flex items-center gap-3 px-4 py-3 ${i < todayWinners.length - 1 ? 'border-b border-white/[0.05]' : ''}`}
                >
                  <span className={`w-6 text-center font-black text-sm ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-white/60' : i === 2 ? 'text-orange-400' : 'text-white/25'}`}>
                    {i + 1}
                  </span>
                  <span className="flex-1 text-white text-sm font-bold">{w.username}</span>
                  <span className="shrink-0">{GAME_ICONS[w.game_type]}</span>
                  <span className="text-green-400 font-mono font-bold text-sm">${w.result_amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="bg-[#111111] rounded-2xl p-4 mb-6">
          <p className="text-white/25 text-xs tracking-wider mb-2 uppercase">How it works</p>
          <ul className="text-white/30 text-xs space-y-1">
            <li>• Pay the entry fee to join a tournament</li>
            <li>• Play the assigned game while the tournament is active</li>
            <li>• Win your game → your result is recorded automatically</li>
            <li>• When the tournament ends, 50% of all losing entry fees is split among winners</li>
            <li>• Split is proportional — higher game result = larger share</li>
          </ul>
        </div>

      </div>
      <BottomNav />
    </div>
  );
}
