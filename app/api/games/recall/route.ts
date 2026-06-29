import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth';
import { getUserById, sql, initSchema } from '@/lib/db';
import { generateRecallQuestions, DIFFICULTY_CONFIG, type Difficulty } from '@/lib/recall';

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

// POST — start game (earning mode) or generate questions (training mode)
export async function POST(request: Request) {
  await initSchema();
  const body = await request.json();

  // Training mode — no bet, no DB write, return questions with correctIndex for client-side grading
  if (body.training) {
    const text = (body.text as string)?.trim();
    const difficulty = (body.difficulty as Difficulty) ?? 'Normal';
    if (!text) return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    if (!(difficulty in DIFFICULTY_CONFIG)) return NextResponse.json({ error: 'Invalid difficulty' }, { status: 400 });
    const questions = generateRecallQuestions(text, difficulty);
    if (questions.length === 0) {
      return NextResponse.json({ error: 'Text too short to generate questions — try a longer passage' }, { status: 400 });
    }
    return NextResponse.json({ training: true, questions, questionCount: questions.length });
  }

  // Earning mode
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { bet } = body;
  if (!bet || bet <= 0 || bet > user.balance) {
    return NextResponse.json({ error: 'Invalid bet amount' }, { status: 400 });
  }

  // Pick a random active text
  const texts = await sql`SELECT * FROM recall_texts WHERE is_active = true ORDER BY RANDOM() LIMIT 1`;
  if (!texts.length) {
    return NextResponse.json({ error: 'No recall texts available right now' }, { status: 400 });
  }

  const text = texts[0];
  const difficulty = text.difficulty as Difficulty;
  const questions = generateRecallQuestions(text.text_content as string, difficulty);

  if (questions.length === 0) {
    return NextResponse.json({ error: 'This text does not have enough content for questions' }, { status: 400 });
  }

  const gameId = uuidv4();

  await sql.begin(async tx => {
    const [updated] = await tx`
      UPDATE users SET balance = balance - ${bet}
      WHERE id = ${user.id} AND balance >= ${bet}
      RETURNING balance
    `;
    if (!updated) throw new Error('Insufficient balance');
    await tx`
      INSERT INTO recall_games (id, user_id, text_id, bet, questions, status)
      VALUES (${gameId}, ${user.id}, ${text.id as string}, ${bet}, ${sql.json(questions as unknown as Parameters<typeof sql.json>[0])}, 'active')
    `;
  });

  const { multiplier } = DIFFICULTY_CONFIG[difficulty];

  return NextResponse.json({
    gameId,
    textTitle: text.title as string,
    textContent: text.text_content as string,
    disappearsAfterReading: text.disappears_after_reading as boolean,
    difficulty,
    multiplier,
    questionCount: questions.length,
    // Send questions WITHOUT correctIndex to prevent client-side cheating
    questions: questions.map(q => ({ question: q.question, options: q.options })),
  });
}

// PATCH — submit answers
export async function PATCH(request: Request) {
  await initSchema();
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { gameId, answers } = await request.json();

  const rows = await sql`SELECT * FROM recall_games WHERE id = ${gameId}`;
  if (!rows.length || rows[0].user_id !== user.id) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }
  const game = rows[0];
  if (game.status !== 'active') {
    return NextResponse.json({ error: 'Game already ended' }, { status: 400 });
  }

  const questions = parseJsonb<Array<{ question: string; options: string[]; correctIndex: number }>>(game.questions);
  const correctAnswers = questions.map(q => q.correctIndex);
  const correctCount = (answers as number[]).filter((a, i) => a === correctAnswers[i]).length;
  const won = correctCount === questions.length;

  const bet = Number(game.bet);
  const textRows = await sql`SELECT difficulty FROM recall_texts WHERE id = ${game.text_id}`;
  const difficulty = (textRows[0]?.difficulty ?? 'Normal') as Difficulty;
  const { multiplier } = DIFFICULTY_CONFIG[difficulty];
  const payout = won ? Math.floor(bet * multiplier) : 0;

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
    totalCount: questions.length,
    correctAnswers,
    userAnswers: answers,
  });
}
