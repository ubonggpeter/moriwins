import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth';
import { getUserById, sql, initSchema } from '@/lib/db';
import { generateChunkedBlankFill, gradeAnswers, DIFFICULTY_CONFIG, type Difficulty } from '@/lib/recall';

export const dynamic = 'force-dynamic';

async function getAuthedUser() {
  const token = cookies().get('token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  return getUserById(payload.userId);
}

function parseJsonb<T>(v: unknown): T {
  return typeof v === 'string' ? JSON.parse(v) as T : v as T;
}

// POST — start game (earning) or generate blanks (training)
export async function POST(request: Request) {
  await initSchema();
  const body = await request.json();

  // Training mode — no bet, no DB write
  if (body.training) {
    const text = (body.text as string)?.trim();
    const difficulty = ((body.difficulty as string) ?? 'Normal') as Difficulty;
    if (!text) return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    if (!(difficulty in DIFFICULTY_CONFIG)) return NextResponse.json({ error: 'Invalid difficulty' }, { status: 400 });

    const result = generateChunkedBlankFill(text, difficulty);
    if (result.totalBlanks === 0) {
      return NextResponse.json({ error: 'Text too short to generate blanks — try a longer passage' }, { status: 400 });
    }

    return NextResponse.json({
      training: true,
      chunks: result.chunks,
      totalChunks: result.chunks.length,
      totalBlanks: result.totalBlanks,
      multiplier: DIFFICULTY_CONFIG[difficulty].multiplier,
    });
  }

  // Earning mode
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { bet } = body;
  if (!bet || bet <= 0 || bet > user.balance) {
    return NextResponse.json({ error: 'Invalid bet amount' }, { status: 400 });
  }

  const texts = await sql`SELECT * FROM recall_texts WHERE is_active = true ORDER BY RANDOM() LIMIT 1`;
  if (!texts.length) {
    return NextResponse.json({ error: 'No recall texts available right now' }, { status: 400 });
  }

  const text = texts[0];
  const difficulty = text.difficulty as Difficulty;
  const result = generateChunkedBlankFill(text.text_content as string, difficulty);

  if (result.totalBlanks === 0) {
    return NextResponse.json({ error: 'This text does not have enough content for blanks' }, { status: 400 });
  }

  const gameId = uuidv4();
  const stored = {
    chunks: result.chunks,
    allAnswers: result.allAnswers,
    totalBlanks: result.totalBlanks,
    multiplier: DIFFICULTY_CONFIG[difficulty].multiplier,
  };

  await sql.begin(async tx => {
    const [updated] = await tx`
      UPDATE users SET balance = balance - ${bet}
      WHERE id = ${user.id} AND balance >= ${bet}
      RETURNING balance
    `;
    if (!updated) throw new Error('Insufficient balance');
    await tx`
      INSERT INTO recall_games (id, user_id, text_id, bet, questions, status)
      VALUES (${gameId}, ${user.id}, ${text.id as string}, ${bet}, ${sql.json(stored as unknown as Parameters<typeof sql.json>[0])}, 'active')
    `;
  });

  // Send chunks to client: strip blank values, keep answers for real-time UI
  const clientChunks = result.chunks.map(chunk => ({
    chunkText: chunk.chunkText,
    tokens: chunk.tokens.map(tok => tok.blank ? { ...tok, value: '' } : tok),
    answers: chunk.answers,
    totalBlanks: chunk.totalBlanks,
  }));

  return NextResponse.json({
    gameId,
    textTitle: text.title as string,
    difficulty,
    multiplier: DIFFICULTY_CONFIG[difficulty].multiplier,
    chunks: clientChunks,
    totalChunks: result.chunks.length,
    totalBlanks: result.totalBlanks,
  });
}

// PATCH — submit all answers (flat array across all chunks)
export async function PATCH(request: Request) {
  await initSchema();
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { gameId, answers: userAnswers } = await request.json();

  const rows = await sql`SELECT * FROM recall_games WHERE id = ${gameId}`;
  if (!rows.length || rows[0].user_id !== user.id) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }
  const game = rows[0];
  if (game.status !== 'active') {
    return NextResponse.json({ error: 'Game already ended' }, { status: 400 });
  }

  const stored = parseJsonb<{
    chunks?: unknown[];
    allAnswers?: string[];
    answers?: string[]; // legacy format fallback
    totalBlanks: number;
    multiplier: number;
  }>(game.questions);

  const allAnswers = stored.allAnswers ?? stored.answers ?? [];
  const { totalBlanks, multiplier } = stored;

  const grades = gradeAnswers(allAnswers, userAnswers as string[]);
  const correctCount = grades.reduce((s, g) => s + g, 0);
  const fraction = totalBlanks > 0 ? correctCount / totalBlanks : 0;

  const bet = Number(game.bet);
  const payout = fraction > 0 ? Math.floor(bet * multiplier * fraction) : 0;
  const won = correctCount === totalBlanks;

  await sql.begin(async tx => {
    await tx`UPDATE recall_games SET status = ${won ? 'won' : 'lost'}, payout = ${payout} WHERE id = ${gameId}`;
    if (payout > 0) {
      await tx`
        UPDATE users
        SET balance = balance + ${payout}, total_game_winnings = total_game_winnings + ${payout}
        WHERE id = ${user.id}
      `;
    }
  });

  const [balRow] = await sql`SELECT balance FROM users WHERE id = ${user.id}`;

  return NextResponse.json({
    won,
    payout,
    balance: Number(balRow.balance),
    correctCount,
    totalBlanks,
    correctAnswers: allAnswers,
    grades,
  });
}
