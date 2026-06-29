export interface RecallToken {
  type: 'word' | 'space';
  value: string;
  blank: boolean;
  blankIndex: number; // -1 if not blank
  charCount: number;  // character count hint for input sizing (0 if not blank)
}

export interface BlankFillResult {
  tokens: RecallToken[];
  answers: string[];
  totalBlanks: number;
}

export const DIFFICULTY_CONFIG = {
  'Very Simple': { blankRatio: 0.10, multiplier: 1.2 },
  'Simple':      { blankRatio: 0.20, multiplier: 1.5 },
  'Normal':      { blankRatio: 0.30, multiplier: 2.0 },
  'Complex':     { blankRatio: 0.40, multiplier: 3.0 },
  'Difficult':   { blankRatio: 0.50, multiplier: 5.0 },
} as const;

export type Difficulty = keyof typeof DIFFICULTY_CONFIG;
export const DIFFICULTIES = Object.keys(DIFFICULTY_CONFIG) as Difficulty[];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateBlankFill(text: string, difficulty: Difficulty): BlankFillResult {
  const { blankRatio } = DIFFICULTY_CONFIG[difficulty];

  // Split text into alternating word/whitespace tokens, drop empty strings
  const rawParts = text.split(/(\s+)/).filter(p => p !== '');

  interface RawToken { type: 'word' | 'space'; value: string }
  const rawTokens: RawToken[] = rawParts.map(p => ({
    type: /^\s+$/.test(p) ? 'space' : 'word',
    value: p,
  }));

  // Find indices of blankable words (alpha/numeric content ≥ 3 chars)
  const blankableIndices: number[] = [];
  rawTokens.forEach((tok, i) => {
    if (tok.type === 'word') {
      const clean = tok.value.replace(/[^a-zA-Z0-9]/g, '');
      if (clean.length >= 3) blankableIndices.push(i);
    }
  });

  const blankCount = Math.max(1, Math.floor(blankableIndices.length * blankRatio));
  const blankSet = new Set(shuffle([...blankableIndices]).slice(0, blankCount));

  const answers: string[] = [];
  let answerIdx = 0;

  const tokens: RecallToken[] = rawTokens.map((tok, i) => {
    if (tok.type === 'word' && blankSet.has(i)) {
      const clean = tok.value.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');
      answers.push(clean);
      return { type: 'word', value: tok.value, blank: true, blankIndex: answerIdx++, charCount: clean.length };
    }
    return { type: tok.type as 'word' | 'space', value: tok.value, blank: false, blankIndex: -1, charCount: 0 };
  });

  return { tokens, answers, totalBlanks: answers.length };
}

export interface ChunkBlankFillResult {
  chunks: Array<{
    chunkText: string;
    tokens: RecallToken[];
    answers: string[];
    totalBlanks: number;
  }>;
  allAnswers: string[];
  totalBlanks: number;
}

export function generateChunkedBlankFill(
  text: string,
  difficulty: Difficulty,
  wordsPerChunk = 15,
): ChunkBlankFillResult {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const allAnswers: string[] = [];
  const chunks: ChunkBlankFillResult['chunks'] = [];

  for (let i = 0; i < words.length; i += wordsPerChunk) {
    const chunkWords = words.slice(i, i + wordsPerChunk);
    const chunkText = chunkWords.join(' ');
    const result = generateBlankFill(chunkText, difficulty);
    chunks.push({
      chunkText: result.tokens.map(t => t.value).join(''),
      tokens: result.tokens,
      answers: result.answers,
      totalBlanks: result.totalBlanks,
    });
    allAnswers.push(...result.answers);
  }

  return { chunks, allAnswers, totalBlanks: allAnswers.length };
}

export function gradeAnswers(answers: string[], userAnswers: string[]): number[] {
  return answers.map((correct, i) => {
    const user = (userAnswers[i] ?? '').trim().toLowerCase().replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');
    const expected = correct.toLowerCase();
    return user === expected ? 1 : 0;
  });
}
