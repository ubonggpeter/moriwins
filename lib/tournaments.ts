import { sql } from './db';

type Entry = { id: string; user_id: string; bet_amount: number; result_amount: number };

export async function completeTournament(tournamentId: string): Promise<{
  totalEntries: number;
  winnersCount: number;
  losersCount: number;
  totalLosses: number;
  prizePool: number;
  distributed: number;
}> {
  const [tournament] = await sql`SELECT * FROM tournaments WHERE id = ${tournamentId}`;
  if (!tournament || tournament.status === 'completed') {
    return { totalEntries: 0, winnersCount: 0, losersCount: 0, totalLosses: 0, prizePool: 0, distributed: 0 };
  }

  const entries = await sql`SELECT * FROM tournament_entries WHERE tournament_id = ${tournamentId}`;
  const all = entries as unknown as Entry[];
  const winners = all.filter(e => Number(e.result_amount) > 0);
  const losers  = all.filter(e => Number(e.result_amount) === 0);

  const totalLosses = losers.reduce((s, e) => s + Number(e.bet_amount), 0);
  const prizePool   = Math.floor(totalLosses * 0.5);

  let distributed = 0;
  if (winners.length > 0 && prizePool > 0) {
    const sumResults = winners.reduce((s, e) => s + Number(e.result_amount), 0);
    for (const w of winners) {
      const share = Math.floor(prizePool * Number(w.result_amount) / sumResults);
      if (share > 0) {
        await sql`
          UPDATE users
          SET balance = balance + ${share},
              total_game_winnings = total_game_winnings + ${share}
          WHERE id = ${w.user_id}
        `;
        distributed += share;
      }
    }
  }

  await sql`UPDATE tournaments SET status = 'completed' WHERE id = ${tournamentId}`;

  console.log(`[tournaments] Completed ${tournamentId}: ${all.length} entries, pool $${prizePool}, distributed $${distributed}`);

  return { totalEntries: all.length, winnersCount: winners.length, losersCount: losers.length, totalLosses, prizePool, distributed };
}
