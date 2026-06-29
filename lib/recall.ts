export interface RecallQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export const DIFFICULTY_CONFIG = {
  'Very Simple': { questions: 1, multiplier: 1.2 },
  'Simple':      { questions: 2, multiplier: 1.5 },
  'Normal':      { questions: 3, multiplier: 2.0 },
  'Complex':     { questions: 4, multiplier: 3.0 },
  'Difficult':   { questions: 5, multiplier: 5.0 },
} as const;

export type Difficulty = keyof typeof DIFFICULTY_CONFIG;

export const DIFFICULTIES = Object.keys(DIFFICULTY_CONFIG) as Difficulty[];

// Fisher-Yates shuffle (in-place)
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateRecallQuestions(text: string, difficulty: Difficulty): RecallQuestion[] {
  const count = DIFFICULTY_CONFIG[difficulty].questions;

  // Split into sentences of at least 4 words
  const sentences = text
    .split(/(?<=[.!?])\s+|[.!?]\s*$/)
    .map(s => s.trim())
    .filter(s => s.split(/\s+/).length >= 4);

  interface Candidate { sentence: string; raw: string; clean: string; }
  const allCandidates: Candidate[] = [];

  for (const sentence of sentences) {
    const words = sentence.split(/\s+/);
    // Skip first word (too obvious); look for a keyword in the rest
    for (let i = 1; i < words.length; i++) {
      const raw = words[i];
      const clean = raw.replace(/[^a-zA-Z0-9]/g, '');
      if (clean.length < 3) continue;
      const isProper = /^[A-Z]/.test(clean) && i > 0;
      const isNumber = /^\d+$/.test(clean);
      const isLong   = clean.length >= 6;
      if (isProper || isNumber || isLong) {
        allCandidates.push({ sentence, raw, clean });
        break; // one keyword per sentence
      }
    }
  }

  // Shuffle and pick unique-word candidates
  const shuffled = shuffle([...allCandidates]);
  const usedCleans = new Set<string>();
  const selected: Candidate[] = [];

  for (const c of shuffled) {
    if (selected.length >= count) break;
    if (!usedCleans.has(c.clean.toLowerCase())) {
      selected.push(c);
      usedCleans.add(c.clean.toLowerCase());
    }
  }

  // Distractor pool: all candidate words not chosen as answers
  const distractorPool = allCandidates
    .map(c => c.clean)
    .filter(w => !usedCleans.has(w.toLowerCase()));

  const fallbacks = ['something', 'nothing', 'another', 'several', 'always', 'never', 'certain'];

  return selected.map(({ sentence, raw, clean }) => {
    // Blank the FIRST occurrence of the raw word in the sentence
    const blanked = sentence.replace(raw, '___');

    // Build distractor list
    const seen = new Set([clean.toLowerCase()]);
    const distractors: string[] = [];
    for (const d of shuffle([...distractorPool])) {
      if (distractors.length >= 3) break;
      if (!seen.has(d.toLowerCase())) { seen.add(d.toLowerCase()); distractors.push(d); }
    }
    for (const f of fallbacks) {
      if (distractors.length >= 3) break;
      if (!seen.has(f.toLowerCase())) { seen.add(f.toLowerCase()); distractors.push(f); }
    }

    const options = shuffle([...distractors.slice(0, 3), clean]);
    return {
      question: `Fill in the blank:\n"${blanked}"`,
      options,
      correctIndex: options.indexOf(clean),
    };
  });
}
