'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';

type Mode = 'training' | 'earning';

interface ClientQuestion {
  question: string;
  options: string[];
  correctIndex?: number;
}

type Phase =
  | { type: 'mode-select' }
  | { type: 'training-setup' }
  | { type: 'earning-setup' }
  | { type: 'loading'; label: string }
  | {
      type: 'reading';
      mode: Mode;
      gameId?: string;
      title: string;
      content: string;
      disappears: boolean;
      difficulty: string;
      multiplier: number;
      questions: ClientQuestion[];
    }
  | {
      type: 'answering';
      mode: Mode;
      gameId?: string;
      questions: ClientQuestion[];
      currentQ: number;
      selected: (number | null)[];
      textGone: boolean;
    }
  | { type: 'submitting' }
  | {
      type: 'result';
      mode: Mode;
      won?: boolean;
      payout?: number;
      balance?: number;
      score: number;
      total: number;
      correctAnswers: number[];
      userAnswers: (number | null)[];
    };

const DIFFICULTIES = ['Very Simple', 'Simple', 'Normal', 'Complex', 'Difficult'] as const;
const MULTIPLIERS: Record<string, number> = {
  'Very Simple': 1.2, Simple: 1.5, Normal: 2, Complex: 3, Difficult: 5,
};
const QUESTION_COUNTS: Record<string, number> = {
  'Very Simple': 1, Simple: 2, Normal: 3, Complex: 4, Difficult: 5,
};

const PRESET_BETS = [50, 100, 500, 1000, 5000];

export default function RecallPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ type: 'mode-select' });
  const [bet, setBet] = useState(100);
  const [balance, setBalance] = useState(0);
  const [trainingInput, setTrainingInput] = useState<'paste' | 'upload'>('paste');
  const [pastedText, setPastedText] = useState('');
  const [trainingDifficulty, setTrainingDifficulty] = useState<'Very Simple' | 'Simple' | 'Normal' | 'Complex' | 'Difficult'>('Normal');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/user')
      .then(r => r.json())
      .then(d => { if (d.balance !== undefined) setBalance(d.balance); })
      .catch(() => {});
  }, []);

  async function startTraining() {
    setError('');
    let text = '';

    if (trainingInput === 'paste') {
      text = pastedText.trim();
      if (!text) { setError('Please paste some text to study'); return; }
      if (text.length < 100) { setError('Text is too short — paste at least a full paragraph'); return; }
      setPhase({ type: 'loading', label: 'Generating questions...' });
    } else {
      if (!uploadFile) { setError('Please select a PDF or DOCX file'); return; }
      setPhase({ type: 'loading', label: 'Extracting text from file...' });
      const fd = new FormData();
      fd.append('file', uploadFile);
      const upRes = await fetch('/api/games/recall/upload', { method: 'POST', body: fd });
      const upData = await upRes.json();
      if (!upRes.ok) {
        setPhase({ type: 'training-setup' });
        setError(upData.error ?? 'Failed to read file');
        return;
      }
      text = upData.text;
      setPhase({ type: 'loading', label: 'Generating questions...' });
    }

    const res = await fetch('/api/games/recall', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ training: true, text, difficulty: trainingDifficulty }),
    });
    const data = await res.json();
    if (!res.ok) {
      setPhase({ type: 'training-setup' });
      setError(data.error ?? 'Failed to generate questions');
      return;
    }

    setPhase({
      type: 'reading',
      mode: 'training',
      title: uploadFile?.name.replace(/\.[^/.]+$/, '') ?? 'Training Session',
      content: text,
      disappears: false,
      difficulty: trainingDifficulty,
      multiplier: MULTIPLIERS[trainingDifficulty] ?? 1,
      questions: data.questions,
    });
  }

  async function startEarning() {
    setError('');
    if (!bet || bet <= 0) { setError('Enter a valid bet amount'); return; }
    if (bet > balance) { setError('Insufficient balance'); return; }
    setPhase({ type: 'loading', label: 'Preparing your text...' });

    const res = await fetch('/api/games/recall', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bet }),
    });
    const data = await res.json();
    if (!res.ok) {
      setPhase({ type: 'earning-setup' });
      setError(data.error ?? 'Failed to start game');
      return;
    }

    setBalance(prev => prev - bet);
    setPhase({
      type: 'reading',
      mode: 'earning',
      gameId: data.gameId,
      title: data.textTitle,
      content: data.textContent,
      disappears: data.disappearsAfterReading,
      difficulty: data.difficulty,
      multiplier: data.multiplier,
      questions: data.questions,
    });
  }

  function finishReading() {
    if (phase.type !== 'reading') return;
    setPhase({
      type: 'answering',
      mode: phase.mode,
      gameId: phase.gameId,
      questions: phase.questions,
      currentQ: 0,
      selected: Array(phase.questions.length).fill(null),
      textGone: phase.disappears,
    });
  }

  function selectAnswer(idx: number) {
    if (phase.type !== 'answering') return;
    const sel = [...phase.selected];
    sel[phase.currentQ] = idx;
    setPhase({ ...phase, selected: sel });
  }

  async function nextOrSubmit() {
    if (phase.type !== 'answering') return;
    const { currentQ, questions, selected, gameId, mode } = phase;
    if (selected[currentQ] === null) return;

    if (currentQ < questions.length - 1) {
      setPhase({ ...phase, currentQ: currentQ + 1 });
      return;
    }

    if (mode === 'training') {
      const correctAnswers = questions.map(q => q.correctIndex ?? 0);
      const score = selected.filter((a, i) => a === correctAnswers[i]).length;
      setPhase({
        type: 'result', mode: 'training',
        score, total: questions.length,
        correctAnswers, userAnswers: selected,
      });
    } else {
      setPhase({ type: 'submitting' });
      const res = await fetch('/api/games/recall', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, answers: selected }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPhase({ type: 'earning-setup' });
        setError(data.error ?? 'Submission failed');
        return;
      }
      setBalance(data.balance);
      setPhase({
        type: 'result', mode: 'earning',
        won: data.won, payout: data.payout, balance: data.balance,
        score: data.correctCount, total: data.totalCount,
        correctAnswers: data.correctAnswers, userAnswers: data.userAnswers,
      });
    }
  }

  function reset() {
    setError('');
    setUploadFile(null);
    setPhase({ type: 'mode-select' });
  }

  function playAgain() {
    setError('');
    setUploadFile(null);
    if (phase.type === 'result') {
      setPhase(phase.mode === 'training' ? { type: 'training-setup' } : { type: 'earning-setup' });
    }
  }

  return (
    <div className="min-h-screen bg-black pb-24 md:pb-10 md:pt-14">
      <div className="max-w-lg md:max-w-2xl mx-auto px-5 md:px-8">

        {/* Header */}
        <div className="flex items-center justify-between pt-10 md:pt-8 pb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={phase.type === 'mode-select' ? () => router.back() : reset}
              className="w-9 h-9 rounded-full bg-[#111111] flex items-center justify-center shrink-0"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-white font-bold text-lg">🧠 Text Recall</h1>
              <p className="text-white/30 text-xs">Read · Remember · Win</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-white/30 text-[10px]">Balance</p>
            <p className="text-yellow-400 font-mono font-bold text-sm">${balance.toLocaleString()}</p>
          </div>
        </div>

        {/* ── MODE SELECT ── */}
        {phase.type === 'mode-select' && (
          <div className="space-y-4">
            <p className="text-white/40 text-xs uppercase tracking-wider text-center mb-2">Choose your mode</p>

            <button
              onClick={() => setPhase({ type: 'training-setup' })}
              className="w-full bg-[#111111] rounded-2xl p-6 text-left hover:bg-[#161616] transition-colors group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-4xl">🎓</span>
                <span className="text-xs text-white/40 border border-white/10 px-3 py-1 rounded-full">FREE</span>
              </div>
              <p className="text-white font-black text-xl mb-1">Training Mode</p>
              <p className="text-white/40 text-sm leading-relaxed mb-4">
                Paste any text or upload a PDF / DOCX file. We generate quiz questions so you can test your recall. No bet needed.
              </p>
              <div className="flex items-center gap-3 text-white/30 text-xs">
                <span className="flex items-center gap-1">📄 PDF</span>
                <span className="flex items-center gap-1">📝 DOCX</span>
                <span className="flex items-center gap-1">✏️ Paste text</span>
              </div>
            </button>

            <button
              onClick={() => setPhase({ type: 'earning-setup' })}
              className="w-full bg-[#111111] rounded-2xl p-6 text-left hover:bg-[#161616] transition-colors border border-yellow-400/25"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-4xl">💰</span>
                <span className="text-yellow-400 text-xs border border-yellow-400/30 px-3 py-1 rounded-full font-bold">WIN MONEY</span>
              </div>
              <p className="text-white font-black text-xl mb-1">Earning Mode</p>
              <p className="text-white/40 text-sm leading-relaxed mb-4">
                Place a bet, read a curated passage, answer all questions correctly and multiply your bet up to 5×.
              </p>
              <div className="grid grid-cols-5 gap-1">
                {Object.entries(MULTIPLIERS).map(([d, m]) => (
                  <div key={d} className="bg-[#1a1a1a] rounded-xl p-2 text-center">
                    <p className="text-yellow-400 font-black text-sm">{m}x</p>
                    <p className="text-white/30 text-[9px] mt-0.5 leading-tight">{d.split(' ')[0]}</p>
                  </div>
                ))}
              </div>
            </button>
          </div>
        )}

        {/* ── TRAINING SETUP ── */}
        {phase.type === 'training-setup' && (
          <div className="space-y-4">
            {/* Difficulty */}
            <div className="bg-[#111111] rounded-2xl p-5">
              <label className="text-white/40 text-xs uppercase tracking-wider block mb-3">Difficulty</label>
              <div className="flex flex-wrap gap-2">
                {DIFFICULTIES.map(d => (
                  <button
                    key={d}
                    onClick={() => setTrainingDifficulty(d)}
                    className={`px-3 py-2 rounded-full text-xs font-bold transition-all ${
                      trainingDifficulty === d
                        ? 'bg-white text-black'
                        : 'bg-[#1c1c1c] text-white/50 border border-white/[0.08] hover:text-white'
                    }`}
                  >
                    {d}
                    <span className={`ml-1.5 font-normal ${trainingDifficulty === d ? 'text-black/40' : 'text-white/20'}`}>
                      {MULTIPLIERS[d]}x · {QUESTION_COUNTS[d]}Q
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Input method */}
            <div className="bg-[#111111] rounded-2xl p-5 space-y-4">
              <div className="flex gap-2">
                {(['paste', 'upload'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setTrainingInput(m)}
                    className={`flex-1 py-2.5 rounded-full text-xs font-bold transition-all ${
                      trainingInput === m
                        ? 'bg-white text-black'
                        : 'bg-[#1c1c1c] text-white/50 border border-white/[0.08] hover:text-white'
                    }`}
                  >
                    {m === 'paste' ? '✏️ Paste Text' : '📄 Upload File'}
                  </button>
                ))}
              </div>

              {trainingInput === 'paste' ? (
                <textarea
                  value={pastedText}
                  onChange={e => setPastedText(e.target.value)}
                  rows={8}
                  placeholder="Paste any text here — article, notes, study material, wiki page..."
                  className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/20 resize-none placeholder:text-white/20"
                />
              ) : (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx"
                    className="hidden"
                    onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-white/15 rounded-xl p-10 text-center hover:border-white/30 transition-colors"
                  >
                    <p className="text-4xl mb-3">{uploadFile ? '✅' : '📄'}</p>
                    {uploadFile ? (
                      <>
                        <p className="text-white text-sm font-bold">{uploadFile.name}</p>
                        <p className="text-white/30 text-xs mt-1">{(uploadFile.size / 1024).toFixed(0)} KB — tap to change</p>
                      </>
                    ) : (
                      <>
                        <p className="text-white/50 text-sm font-bold">Tap to select file</p>
                        <p className="text-white/25 text-xs mt-1">PDF or DOCX supported</p>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={startTraining}
              className="w-full bg-white text-black font-bold py-4 rounded-full text-sm hover:bg-white/90 transition-all"
            >
              Start Training →
            </button>
          </div>
        )}

        {/* ── EARNING SETUP ── */}
        {phase.type === 'earning-setup' && (
          <div className="space-y-4">
            <div className="bg-[#111111] rounded-2xl p-5 space-y-5">
              <div>
                <label className="text-xs text-white/40 tracking-wider uppercase block mb-3">Bet Amount</label>
                <div className="flex gap-2 flex-wrap">
                  {PRESET_BETS.map(v => (
                    <button
                      key={v}
                      onClick={() => setBet(v)}
                      className={`px-4 py-2 rounded-full text-sm font-mono transition-all ${
                        bet === v
                          ? 'bg-white text-black font-bold'
                          : 'bg-[#1c1c1c] text-white/60 hover:text-white border border-white/[0.08]'
                      }`}
                    >
                      ${v.toLocaleString()}
                    </button>
                  ))}
                  <input
                    type="number"
                    value={bet}
                    min={1}
                    max={balance}
                    onChange={e => setBet(Number(e.target.value))}
                    className="px-3 py-2 rounded-full text-sm font-mono border border-white/[0.08] bg-[#1c1c1c] text-white w-24 focus:outline-none focus:border-white/30"
                  />
                </div>
              </div>

              <div className="bg-[#1a1a1a] rounded-xl p-4">
                <p className="text-white/30 text-[10px] tracking-wider mb-3 uppercase">Payout Table</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {Object.entries(MULTIPLIERS).map(([d, m]) => (
                    <div key={d} className="text-center">
                      <p className="text-yellow-400 font-bold text-sm font-mono">{m}x</p>
                      <p className="text-white/30 text-[9px] mt-0.5 leading-tight">{d}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#1a1a1a] rounded-xl px-4 py-3">
                <p className="text-white/30 text-xs">Difficulty chosen by the text. Answer <span className="text-white">all questions</span> correctly to win.</p>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={startEarning}
              disabled={!bet || bet <= 0 || bet > balance}
              className="w-full bg-white text-black font-bold py-4 rounded-full text-sm hover:bg-white/90 transition-all disabled:opacity-40"
            >
              BET ${bet?.toLocaleString()} AND PLAY
            </button>
          </div>
        )}

        {/* ── LOADING ── */}
        {phase.type === 'loading' && (
          <div className="flex flex-col items-center justify-center py-28 gap-4">
            <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-white/40 text-sm">{phase.label}</p>
          </div>
        )}

        {/* ── READING ── */}
        {phase.type === 'reading' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-yellow-400/15 text-yellow-400 text-xs font-bold px-3 py-1 rounded-full">
                {phase.difficulty}
              </span>
              {phase.mode === 'earning' ? (
                <span className="bg-green-500/15 text-green-400 text-xs font-bold px-3 py-1 rounded-full">
                  {phase.multiplier}× payout
                </span>
              ) : (
                <span className="bg-purple-500/15 text-purple-400 text-xs font-bold px-3 py-1 rounded-full">
                  Training
                </span>
              )}
              <span className="text-white/30 text-xs">
                {phase.questions.length} question{phase.questions.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="bg-[#111111] rounded-2xl p-6">
              <p className="text-white font-bold text-base mb-4">{phase.title}</p>
              <p className="text-white/75 text-sm leading-relaxed whitespace-pre-wrap">{phase.content}</p>
            </div>

            {phase.disappears && (
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-3">
                <p className="text-orange-400 text-xs font-bold">
                  ⚠ This text will disappear once you click Finished Reading
                </p>
              </div>
            )}

            <button
              onClick={finishReading}
              className="w-full bg-white text-black font-bold py-4 rounded-full text-sm hover:bg-white/90 transition-all"
            >
              Finished Reading →
            </button>
          </div>
        )}

        {/* ── ANSWERING ── */}
        {phase.type === 'answering' && (() => {
          const { questions, currentQ, selected, textGone, mode } = phase;
          const q = questions[currentQ];
          const answered = selected[currentQ];
          return (
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white/40 text-xs">
                    Question {currentQ + 1} of {questions.length}
                  </p>
                  <div className="flex items-center gap-2">
                    {textGone && <span className="text-orange-400 text-[10px] font-bold">TEXT HIDDEN</span>}
                    {mode === 'training' && (
                      <span className="bg-purple-500/15 text-purple-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        TRAINING
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-full h-1.5 bg-white/8 rounded-full">
                  <div
                    className="h-full bg-yellow-400 rounded-full transition-all"
                    style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
                  />
                </div>
              </div>

              <div className="bg-[#111111] rounded-2xl p-5">
                <p className="text-white text-sm font-medium leading-relaxed whitespace-pre-wrap">{q.question}</p>
              </div>

              <div className="space-y-3">
                {q.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => selectAnswer(i)}
                    className={`w-full text-left px-5 py-4 rounded-2xl border text-sm transition-all ${
                      answered === i
                        ? 'bg-yellow-400/15 border-yellow-400 text-white'
                        : 'bg-[#111111] border-white/[0.08] text-white/70 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    <span className={`font-black mr-3 ${answered === i ? 'text-yellow-400' : 'text-white/30'}`}>
                      {String.fromCharCode(65 + i)}.
                    </span>
                    {opt}
                  </button>
                ))}
              </div>

              <button
                onClick={nextOrSubmit}
                disabled={answered === null || answered === undefined}
                className="w-full bg-white text-black font-bold py-4 rounded-full text-sm hover:bg-white/90 transition-all disabled:opacity-30"
              >
                {currentQ < questions.length - 1 ? 'Next Question →' : 'Submit Answers'}
              </button>
            </div>
          );
        })()}

        {/* ── SUBMITTING ── */}
        {phase.type === 'submitting' && (
          <div className="flex flex-col items-center justify-center py-28 gap-4">
            <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-white/40 text-sm">Checking your answers...</p>
          </div>
        )}

        {/* ── RESULT ── */}
        {phase.type === 'result' && (
          <div className="space-y-4">
            {phase.mode === 'earning' ? (
              <div className={`rounded-2xl p-8 text-center ${
                phase.won
                  ? 'bg-green-500/10 border border-green-500/20'
                  : 'bg-red-500/10 border border-red-500/20'
              }`}>
                <p className="text-5xl mb-4">{phase.won ? '🏆' : '💔'}</p>
                <p className={`font-black text-2xl mb-2 ${phase.won ? 'text-green-400' : 'text-red-400'}`}>
                  {phase.won ? 'You Won!' : 'Not Quite'}
                </p>
                <p className="text-white/50 text-sm">{phase.score} of {phase.total} correct</p>
                {phase.won && phase.payout && (
                  <p className="text-yellow-400 font-black text-3xl font-mono mt-4">
                    +${phase.payout.toLocaleString()}
                  </p>
                )}
              </div>
            ) : (
              <div className={`rounded-2xl p-8 text-center ${
                phase.score === phase.total
                  ? 'bg-green-500/10 border border-green-500/20'
                  : phase.score > 0
                  ? 'bg-yellow-400/10 border border-yellow-400/20'
                  : 'bg-white/5 border border-white/10'
              }`}>
                <p className="text-5xl mb-4">
                  {phase.score === phase.total ? '🎓' : phase.score > 0 ? '📚' : '🔄'}
                </p>
                <p className={`font-black text-2xl mb-2 ${
                  phase.score === phase.total ? 'text-green-400' :
                  phase.score > 0 ? 'text-yellow-400' : 'text-white'
                }`}>
                  {phase.score === phase.total
                    ? 'Perfect Memory!'
                    : phase.score >= phase.total / 2
                    ? 'Good Job!'
                    : 'Keep Practicing'}
                </p>
                <p className="text-white/50 text-sm">{phase.score} of {phase.total} correct</p>
                {phase.total > 0 && (
                  <div className="flex justify-center gap-1.5 mt-4">
                    {Array(phase.total).fill(null).map((_, i) => (
                      <div
                        key={i}
                        className={`h-2 rounded-full ${
                          (phase.userAnswers[i] ?? -1) === phase.correctAnswers[i]
                            ? 'bg-green-400 w-8'
                            : 'bg-red-400 w-8'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Answer review */}
            <div className="bg-[#111111] rounded-2xl p-5 space-y-3">
              <p className="text-white/40 text-xs uppercase tracking-wider">Answer Review</p>
              {phase.correctAnswers.map((correct, i) => {
                const userAns = phase.userAnswers[i];
                const isRight = userAns === correct;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className={`text-base ${isRight ? 'text-green-400' : 'text-red-400'}`}>
                      {isRight ? '✓' : '✗'}
                    </span>
                    <span className="text-white/30 text-xs w-6">Q{i + 1}</span>
                    <span className="text-xs text-white/50">
                      Your answer:{' '}
                      <span className={isRight ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                        {String.fromCharCode(65 + (userAns ?? 0))}
                      </span>
                    </span>
                    {!isRight && (
                      <span className="text-xs text-white/30 ml-auto">
                        Correct: <span className="text-green-400 font-bold">{String.fromCharCode(65 + correct)}</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {phase.mode === 'earning' && phase.balance !== undefined && (
              <p className="text-white/30 text-xs text-center">
                Balance: <span className="text-white font-mono">${phase.balance.toLocaleString()}</span>
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={playAgain}
                className="flex-1 bg-white text-black font-bold py-3.5 rounded-full text-sm hover:bg-white/90 transition-all"
              >
                Play Again
              </button>
              <button
                onClick={() => router.push('/games')}
                className="flex-1 bg-[#111111] text-white font-bold py-3.5 rounded-full text-sm border border-white/10 hover:bg-[#161616]"
              >
                All Games
              </button>
            </div>
          </div>
        )}

      </div>
      <BottomNav />
    </div>
  );
}
