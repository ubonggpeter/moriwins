'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';

interface ClientQuestion { question: string; options: string[]; }

type Phase =
  | { type: 'betting' }
  | { type: 'loading' }
  | { type: 'reading';   gameId: string; title: string; content: string; disappears: boolean; difficulty: string; multiplier: number; questionCount: number; questions: ClientQuestion[] }
  | { type: 'answering'; gameId: string; questions: ClientQuestion[]; currentQ: number; selected: (number | null)[]; textGone: boolean }
  | { type: 'submitting' }
  | { type: 'result';    won: boolean; payout: number; balance: number; correctCount: number; totalCount: number; correctAnswers: number[]; userAnswers: number[] };

const MULTIPLIERS: Record<string, number> = {
  'Very Simple': 1.2, Simple: 1.5, Normal: 2, Complex: 3, Difficult: 5,
};

export default function RecallPage() {
  const router = useRouter();
  const [bet, setBet] = useState('');
  const [error, setError] = useState('');
  const [phase, setPhase] = useState<Phase>({ type: 'betting' });

  async function startGame() {
    const betVal = parseInt(bet, 10);
    if (!betVal || betVal <= 0) { setError('Enter a valid bet amount'); return; }
    setError('');
    setPhase({ type: 'loading' });

    const res = await fetch('/api/games/recall', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bet: betVal }),
    });
    const data = await res.json();

    if (!res.ok) {
      setPhase({ type: 'betting' });
      setError(data.error ?? 'Failed to start game');
      return;
    }

    setPhase({
      type: 'reading',
      gameId: data.gameId,
      title: data.textTitle,
      content: data.textContent,
      disappears: data.disappearsAfterReading,
      difficulty: data.difficulty,
      multiplier: data.multiplier,
      questionCount: data.questionCount,
      questions: data.questions,
    });
  }

  function finishReading() {
    if (phase.type !== 'reading') return;
    setPhase({
      type: 'answering',
      gameId: phase.gameId,
      questions: phase.questions,
      currentQ: 0,
      selected: Array(phase.questions.length).fill(null),
      textGone: phase.disappears,
    });
  }

  function selectAnswer(optionIdx: number) {
    if (phase.type !== 'answering') return;
    const newSelected = [...phase.selected];
    newSelected[phase.currentQ] = optionIdx;
    setPhase({ ...phase, selected: newSelected });
  }

  async function nextOrSubmit() {
    if (phase.type !== 'answering') return;
    const { currentQ, questions, selected, gameId } = phase;
    if (selected[currentQ] === null) return;

    if (currentQ < questions.length - 1) {
      setPhase({ ...phase, currentQ: currentQ + 1 });
      return;
    }

    // Submit
    setPhase({ type: 'submitting' });
    const res = await fetch('/api/games/recall', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, answers: selected }),
    });
    const data = await res.json();
    if (!res.ok) {
      setPhase({ type: 'betting' });
      setError(data.error ?? 'Submission failed');
      return;
    }
    setPhase({
      type: 'result',
      won: data.won,
      payout: data.payout,
      balance: data.balance,
      correctCount: data.correctCount,
      totalCount: data.totalCount,
      correctAnswers: data.correctAnswers,
      userAnswers: data.userAnswers,
    });
  }

  function playAgain() {
    setBet('');
    setError('');
    setPhase({ type: 'betting' });
  }

  return (
    <div className="min-h-screen bg-black pb-20 md:pb-10 md:pt-14">
      <div className="max-w-lg md:max-w-2xl mx-auto px-5 md:px-8">

        {/* Header */}
        <div className="flex items-center gap-3 pt-10 md:pt-8 pb-6">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-[#111111] flex items-center justify-center shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-white font-bold text-lg md:text-xl">Text Recall</h1>
            <p className="text-white/30 text-xs">Read, remember, win</p>
          </div>
        </div>

        {/* ── BETTING ── */}
        {phase.type === 'betting' && (
          <div className="space-y-5">
            <div className="bg-[#111111] rounded-2xl p-5">
              <p className="text-white font-bold mb-1">How it works</p>
              <p className="text-white/40 text-sm leading-relaxed mb-4">
                Read a text passage, then answer multiple-choice questions from memory. Answer all correctly to win!
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(MULTIPLIERS).map(([d, m]) => (
                  <div key={d} className="bg-[#1a1a1a] rounded-xl p-3 text-center">
                    <p className="text-yellow-400 font-black text-sm">{m}x</p>
                    <p className="text-white/40 text-[10px] mt-0.5">{d}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#111111] rounded-2xl p-5">
              <label className="text-white/40 text-xs uppercase tracking-wider block mb-2">Bet Amount</label>
              <input
                type="number"
                min="1"
                placeholder="Enter amount"
                value={bet}
                onChange={e => setBet(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-white/20"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={startGame}
              className="w-full bg-white text-black font-bold py-4 rounded-full text-sm hover:bg-white/90 transition-all"
            >
              Start Game
            </button>
          </div>
        )}

        {/* ── LOADING ── */}
        {phase.type === 'loading' && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-white/30 text-sm">Preparing your text...</p>
          </div>
        )}

        {/* ── READING ── */}
        {phase.type === 'reading' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="bg-yellow-400/15 text-yellow-400 text-xs font-bold px-3 py-1 rounded-full">{phase.difficulty}</span>
              <span className="bg-white/10 text-white text-xs font-bold px-3 py-1 rounded-full">{phase.multiplier}x multiplier</span>
              <span className="bg-white/10 text-white/60 text-xs px-3 py-1 rounded-full">{phase.questionCount} question{phase.questionCount !== 1 ? 's' : ''}</span>
            </div>

            <div className="bg-[#111111] rounded-2xl p-6">
              <p className="text-white font-bold text-base mb-4">{phase.title}</p>
              <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{phase.content}</p>
            </div>

            {phase.disappears && (
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-3">
                <p className="text-orange-400 text-xs font-bold">⚠ This text will disappear once you click Finished Reading</p>
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
          const { questions, currentQ, selected, textGone } = phase;
          const q = questions[currentQ];
          const answered = selected[currentQ];
          return (
            <div className="space-y-5">
              {/* Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white/40 text-xs">Question {currentQ + 1} of {questions.length}</p>
                  {textGone && <span className="text-orange-400 text-xs">Text hidden</span>}
                </div>
                <div className="w-full h-1 bg-white/10 rounded-full">
                  <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} />
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
                    className={`w-full text-left px-5 py-4 rounded-2xl border text-sm font-medium transition-all ${
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
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-white/30 text-sm">Checking your answers...</p>
          </div>
        )}

        {/* ── RESULT ── */}
        {phase.type === 'result' && (
          <div className="space-y-5">
            <div className={`rounded-2xl p-8 text-center ${phase.won ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
              <p className="text-5xl mb-4">{phase.won ? '🏆' : '💔'}</p>
              <p className={`font-black text-2xl mb-2 ${phase.won ? 'text-green-400' : 'text-red-400'}`}>
                {phase.won ? 'You Won!' : 'Not Quite'}
              </p>
              <p className="text-white/50 text-sm">
                {phase.correctCount} of {phase.totalCount} correct
              </p>
              {phase.won && (
                <p className="text-yellow-400 font-black text-3xl font-mono mt-4">
                  +${phase.payout.toLocaleString()}
                </p>
              )}
            </div>

            <div className="bg-[#111111] rounded-2xl p-5 space-y-3">
              <p className="text-white/40 text-xs uppercase tracking-wider">Answer Review</p>
              {phase.correctAnswers.map((correct, i) => {
                const userAns = phase.userAnswers[i];
                const isRight = userAns === correct;
                return (
                  <div key={i} className={`flex items-center gap-3 text-sm ${isRight ? 'text-green-400' : 'text-red-400'}`}>
                    <span className="text-base">{isRight ? '✓' : '✗'}</span>
                    <span>Question {i + 1}</span>
                  </div>
                );
              })}
            </div>

            <p className="text-white/40 text-xs text-center">
              Balance: <span className="text-white font-mono">${phase.balance.toLocaleString()}</span>
            </p>

            <div className="flex gap-3">
              <button onClick={playAgain} className="flex-1 bg-white text-black font-bold py-3.5 rounded-full text-sm">
                Play Again
              </button>
              <button onClick={() => router.push('/games')} className="flex-1 bg-[#111111] text-white font-bold py-3.5 rounded-full text-sm border border-white/10">
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
