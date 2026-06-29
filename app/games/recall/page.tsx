'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Brain, BookOpen, DollarSign, FileText, Pencil, Upload, Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { gradeAnswers } from '@/lib/recall';
import type { RecallToken } from '@/lib/recall';

type Mode = 'training' | 'earning';
type BlankStatus = 'idle' | 'correct' | 'wrong';

interface ChunkData {
  chunkText: string;
  tokens: RecallToken[];
  answers: string[];
  totalBlanks: number;
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
      chunkIndex: number;
      totalChunks: number;
      chunks: ChunkData[];
      difficulty: string;
      multiplier: number;
      prevUserAnswers: string[][];
    }
  | {
      type: 'filling';
      mode: Mode;
      gameId?: string;
      title: string;
      chunkIndex: number;
      totalChunks: number;
      chunks: ChunkData[];
      difficulty: string;
      multiplier: number;
      prevUserAnswers: string[][];
      userAnswers: string[];
      blankStatuses: BlankStatus[];
    }
  | { type: 'submitting' }
  | {
      type: 'result';
      mode: Mode;
      won: boolean;
      payout?: number;
      balance?: number;
      correctCount: number;
      totalBlanks: number;
      correctAnswers: string[];
      userAnswers: string[];
      grades: number[];
    };

const DIFFICULTIES = ['Very Simple', 'Simple', 'Normal', 'Complex', 'Difficult'] as const;
const MULTIPLIERS: Record<string, number> = {
  'Very Simple': 1.2, Simple: 1.5, Normal: 2, Complex: 3, Difficult: 5,
};
const BLANK_RATIOS: Record<string, string> = {
  'Very Simple': '10%', Simple: '20%', Normal: '30%', Complex: '40%', Difficult: '50%',
};
const PRESET_BETS = [50, 100, 500, 1000, 5000];

export default function RecallPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ type: 'mode-select' });
  const [bet, setBet] = useState(100);
  const [balance, setBalance] = useState(0);
  const [trainingInput, setTrainingInput] = useState<'paste' | 'upload'>('paste');
  const [pastedText, setPastedText] = useState('');
  const [trainingDifficulty, setTrainingDifficulty] = useState<typeof DIFFICULTIES[number]>('Normal');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

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
      if (text.length < 50) { setError('Text too short — paste at least a paragraph'); return; }
      setPhase({ type: 'loading', label: 'Generating blanks...' });
    } else {
      if (!uploadFile) { setError('Please select a PDF or DOCX file'); return; }
      setPhase({ type: 'loading', label: 'Extracting text from file...' });
      const fd = new FormData();
      fd.append('file', uploadFile);
      const upRes = await fetch('/api/games/recall/upload', { method: 'POST', body: fd });
      const upData = await upRes.json();
      if (!upRes.ok) { setPhase({ type: 'training-setup' }); setError(upData.error ?? 'Failed to read file'); return; }
      text = upData.text;
      setPhase({ type: 'loading', label: 'Generating blanks...' });
    }

    const res = await fetch('/api/games/recall', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ training: true, text, difficulty: trainingDifficulty }),
    });
    const data = await res.json();
    if (!res.ok) { setPhase({ type: 'training-setup' }); setError(data.error ?? 'Failed to generate blanks'); return; }

    setPhase({
      type: 'reading',
      mode: 'training',
      title: uploadFile?.name.replace(/\.[^/.]+$/, '') ?? 'Training Session',
      chunkIndex: 0,
      totalChunks: data.totalChunks,
      chunks: data.chunks,
      difficulty: trainingDifficulty,
      multiplier: data.multiplier,
      prevUserAnswers: [],
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
    if (!res.ok) { setPhase({ type: 'earning-setup' }); setError(data.error ?? 'Failed to start game'); return; }

    setBalance(prev => prev - bet);
    setPhase({
      type: 'reading',
      mode: 'earning',
      gameId: data.gameId,
      title: data.textTitle,
      chunkIndex: 0,
      totalChunks: data.totalChunks,
      chunks: data.chunks,
      difficulty: data.difficulty,
      multiplier: data.multiplier,
      prevUserAnswers: [],
    });
  }

  function finishReading() {
    if (phase.type !== 'reading') return;
    const chunk = phase.chunks[phase.chunkIndex];
    inputRefs.current = [];

    // Skip filling if chunk has no blanks
    if (chunk.totalBlanks === 0) {
      if (phase.chunkIndex < phase.totalChunks - 1) {
        setPhase({ ...phase, chunkIndex: phase.chunkIndex + 1 });
      }
      return;
    }

    setPhase({
      type: 'filling',
      mode: phase.mode,
      gameId: phase.gameId,
      title: phase.title,
      chunkIndex: phase.chunkIndex,
      totalChunks: phase.totalChunks,
      chunks: phase.chunks,
      difficulty: phase.difficulty,
      multiplier: phase.multiplier,
      prevUserAnswers: phase.prevUserAnswers,
      userAnswers: Array(chunk.totalBlanks).fill(''),
      blankStatuses: Array(chunk.totalBlanks).fill('idle' as BlankStatus),
    });
  }

  const updateAnswer = useCallback((blankIdx: number, value: string) => {
    setPhase(prev => {
      if (prev.type !== 'filling') return prev;
      if (prev.blankStatuses[blankIdx] !== 'idle') return prev;
      const ua = [...prev.userAnswers];
      const statuses = [...prev.blankStatuses];
      ua[blankIdx] = value;
      const correct = prev.chunks[prev.chunkIndex].answers[blankIdx] ?? '';
      if (value.toLowerCase() === correct.toLowerCase()) {
        statuses[blankIdx] = 'correct';
      } else if (value.length > correct.length) {
        statuses[blankIdx] = 'wrong';
      }
      return { ...prev, userAnswers: ua, blankStatuses: statuses };
    });
  }, []);

  function focusNext(blankIdx: number) {
    const next = inputRefs.current[blankIdx + 1];
    if (next) next.focus();
  }

  async function goToNextChunk() {
    if (phase.type !== 'filling') return;
    const allPrevAnswers = [...phase.prevUserAnswers, phase.userAnswers];

    if (phase.chunkIndex === phase.totalChunks - 1) {
      // Last chunk — submit everything
      await handleFinalSubmit(allPrevAnswers, phase);
    } else {
      // Advance to reading next chunk
      inputRefs.current = [];
      setPhase({
        type: 'reading',
        mode: phase.mode,
        gameId: phase.gameId,
        title: phase.title,
        chunkIndex: phase.chunkIndex + 1,
        totalChunks: phase.totalChunks,
        chunks: phase.chunks,
        difficulty: phase.difficulty,
        multiplier: phase.multiplier,
        prevUserAnswers: allPrevAnswers,
      });
    }
  }

  async function handleFinalSubmit(
    allPrevAnswers: string[][],
    fillingPhase: Extract<Phase, { type: 'filling' }>,
  ) {
    const { mode, gameId, chunks } = fillingPhase;
    const allUserAnswers = allPrevAnswers.flat();
    const allAnswers = chunks.flatMap(c => c.answers);

    if (mode === 'training') {
      const grades = gradeAnswers(allAnswers, allUserAnswers);
      const correctCount = grades.reduce((s, g) => s + g, 0);
      setPhase({
        type: 'result', mode: 'training',
        won: correctCount === allAnswers.length,
        correctCount, totalBlanks: allAnswers.length,
        correctAnswers: allAnswers,
        userAnswers: allUserAnswers, grades,
      });
    } else {
      setPhase({ type: 'submitting' });
      const res = await fetch('/api/games/recall', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, answers: allUserAnswers }),
      });
      const data = await res.json();
      if (!res.ok) { setPhase({ type: 'earning-setup' }); setError(data.error ?? 'Submission failed'); return; }
      setBalance(data.balance);
      setPhase({
        type: 'result', mode: 'earning',
        won: data.won, payout: data.payout, balance: data.balance,
        correctCount: data.correctCount, totalBlanks: data.totalBlanks,
        correctAnswers: data.correctAnswers,
        userAnswers: allUserAnswers, grades: data.grades,
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

  // Chunk progress pill
  const ChunkBadge = ({ idx, total }: { idx: number; total: number }) => (
    <span className="bg-white/10 text-white/60 text-[10px] font-bold px-3 py-1 rounded-full">
      Chunk {idx + 1} of {total}
    </span>
  );

  return (
    <div className="min-h-screen bg-black pb-28 md:pb-10 md:pt-14">
      <div className="w-full max-w-2xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="flex items-center justify-between pt-10 md:pt-8 pb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={phase.type === 'mode-select' ? () => router.back() : reset}
              className="w-9 h-9 rounded-full bg-[#111111] flex items-center justify-center shrink-0"
            >
              <ChevronLeft size={16} className="text-white" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Brain size={18} className="text-purple-400" />
                <h1 className="text-white font-bold text-lg">Text Recall</h1>
              </div>
              <p className="text-white/30 text-xs">Read · Fill blanks · Win</p>
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
              className="w-full bg-[#111111] rounded-2xl p-6 text-left hover:bg-[#161616] transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/15 flex items-center justify-center">
                  <BookOpen size={22} className="text-purple-400" />
                </div>
                <span className="text-xs text-white/40 border border-white/10 px-3 py-1 rounded-full">FREE</span>
              </div>
              <p className="text-white font-black text-xl mb-1">Training Mode</p>
              <p className="text-white/40 text-sm leading-relaxed mb-4">
                Paste any text or upload a PDF / DOCX. 15-word chunks — read each, fill the blanks.
              </p>
              <div className="flex items-center gap-4 text-white/25 text-xs">
                <span className="flex items-center gap-1"><FileText size={12} /> PDF</span>
                <span className="flex items-center gap-1"><FileText size={12} /> DOCX</span>
                <span className="flex items-center gap-1"><Pencil size={12} /> Paste text</span>
              </div>
            </button>

            <button
              onClick={() => setPhase({ type: 'earning-setup' })}
              className="w-full bg-[#111111] rounded-2xl p-6 text-left hover:bg-[#161616] transition-colors border border-yellow-400/25"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-2xl bg-yellow-400/10 flex items-center justify-center">
                  <DollarSign size={22} className="text-yellow-400" />
                </div>
                <span className="text-yellow-400 text-xs border border-yellow-400/30 px-3 py-1 rounded-full font-bold">WIN MONEY</span>
              </div>
              <p className="text-white font-black text-xl mb-1">Earning Mode</p>
              <p className="text-white/40 text-sm leading-relaxed mb-4">
                Bet on your memory. Read 15-word chunks, fill the blanks. Payout based on % correct across all chunks.
              </p>
              <div className="grid grid-cols-5 gap-1">
                {Object.entries(MULTIPLIERS).map(([d, m]) => (
                  <div key={d} className="bg-[#1a1a1a] rounded-xl p-2 text-center">
                    <p className="text-yellow-400 font-black text-sm">{m}x</p>
                    <p className="text-white/30 text-[9px] mt-0.5 leading-tight">{BLANK_RATIOS[d]} blank</p>
                  </div>
                ))}
              </div>
            </button>
          </div>
        )}

        {/* ── TRAINING SETUP ── */}
        {phase.type === 'training-setup' && (
          <div className="space-y-4">
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
                      {BLANK_RATIOS[d]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#111111] rounded-2xl p-5 space-y-4">
              <div className="flex gap-2">
                {(['paste', 'upload'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setTrainingInput(m)}
                    className={`flex-1 py-2.5 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      trainingInput === m
                        ? 'bg-white text-black'
                        : 'bg-[#1c1c1c] text-white/50 border border-white/[0.08] hover:text-white'
                    }`}
                  >
                    {m === 'paste' ? <><Pencil size={12} /> Paste Text</> : <><Upload size={12} /> Upload File</>}
                  </button>
                ))}
              </div>

              {trainingInput === 'paste' ? (
                <textarea
                  value={pastedText}
                  onChange={e => setPastedText(e.target.value)}
                  rows={8}
                  placeholder="Paste any text here — article, notes, study material..."
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
                    <Upload size={28} className={`mx-auto mb-3 ${uploadFile ? 'text-green-400' : 'text-white/30'}`} />
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
                        bet === v ? 'bg-white text-black font-bold' : 'bg-[#1c1c1c] text-white/60 hover:text-white border border-white/[0.08]'
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
                <p className="text-white/30 text-[10px] tracking-wider mb-3 uppercase">Payout = Bet × Multiplier × % Correct</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {Object.entries(MULTIPLIERS).map(([d, m]) => (
                    <div key={d} className="text-center">
                      <p className="text-yellow-400 font-bold text-sm font-mono">{m}x</p>
                      <p className="text-white/30 text-[9px] mt-0.5">{d}</p>
                    </div>
                  ))}
                </div>
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
              <span className="bg-yellow-400/15 text-yellow-400 text-xs font-bold px-3 py-1 rounded-full">{phase.difficulty}</span>
              {phase.mode === 'earning' ? (
                <span className="bg-green-500/15 text-green-400 text-xs font-bold px-3 py-1 rounded-full">{phase.multiplier}× payout</span>
              ) : (
                <span className="bg-purple-500/15 text-purple-400 text-xs font-bold px-3 py-1 rounded-full">Training</span>
              )}
              <ChunkBadge idx={phase.chunkIndex} total={phase.totalChunks} />
            </div>

            <div className="bg-[#111111] rounded-2xl p-6">
              <p className="text-white font-bold text-sm mb-4">{phase.title}</p>
              <p className="text-white/80 text-sm leading-relaxed">
                {phase.chunks[phase.chunkIndex].chunkText}
              </p>
            </div>

            <div className="bg-[#1a1a1a] rounded-xl px-4 py-3">
              <p className="text-white/50 text-xs">
                Read carefully. After clicking <span className="text-white font-bold">Finished Reading</span>,{' '}
                {phase.chunks[phase.chunkIndex].totalBlanks} word{phase.chunks[phase.chunkIndex].totalBlanks !== 1 ? 's' : ''} will become blank inputs.
              </p>
            </div>

            <button
              onClick={finishReading}
              className="w-full bg-white text-black font-bold py-4 rounded-full text-sm hover:bg-white/90 transition-all"
            >
              Finished Reading →
            </button>
          </div>
        )}

        {/* ── FILLING ── */}
        {phase.type === 'filling' && (() => {
          const chunk = phase.chunks[phase.chunkIndex];
          const { tokens, answers } = chunk;
          const { userAnswers, blankStatuses, totalChunks, chunkIndex, multiplier, mode } = phase;
          const filledCount = userAnswers.filter(a => a.trim() !== '').length;
          const isLastChunk = chunkIndex === totalChunks - 1;

          return (
            <div className="space-y-4">
              {/* Stats bar */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                    mode === 'earning' ? 'bg-yellow-400/15 text-yellow-400' : 'bg-purple-500/15 text-purple-400'
                  }`}>
                    {mode === 'earning' ? `${multiplier}×` : 'Training'}
                  </span>
                  <ChunkBadge idx={chunkIndex} total={totalChunks} />
                </div>
                <p className="text-white/40 text-xs">{filledCount} / {chunk.totalBlanks} filled</p>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-white/[0.08] rounded-full">
                <div
                  className="h-full bg-yellow-400 rounded-full transition-all"
                  style={{ width: `${chunk.totalBlanks > 0 ? (filledCount / chunk.totalBlanks) * 100 : 0}%` }}
                />
              </div>

              {/* Chunk text with inline blanks */}
              <div className="bg-[#111111] rounded-2xl p-5">
                <p className="text-white font-bold text-sm mb-4">
                  {phase.title} — Chunk {chunkIndex + 1}
                </p>
                <div className="text-white/75 text-sm leading-[2.8rem]">
                  {tokens.map((tok, i) => {
                    if (tok.type === 'space') return <span key={i}>{tok.value}</span>;
                    if (tok.blank) {
                      const status = blankStatuses[tok.blankIndex];
                      const correct = answers[tok.blankIndex] ?? '';
                      const isLocked = status === 'correct' || status === 'wrong';
                      const width = Math.max(4, tok.charCount + 2);
                      return (
                        <span
                          key={i}
                          className="inline-flex flex-col items-center mx-0.5"
                          style={{ verticalAlign: 'bottom' }}
                        >
                          <span className={`text-[10px] font-bold leading-none mb-0.5 ${status === 'wrong' ? 'text-green-400' : 'invisible'}`}>
                            {correct}
                          </span>
                          <input
                            ref={el => { inputRefs.current[tok.blankIndex] = el; }}
                            type="text"
                            value={userAnswers[tok.blankIndex] ?? ''}
                            onChange={e => !isLocked && updateAnswer(tok.blankIndex, e.target.value)}
                            onKeyDown={e => {
                              if ((e.key === 'Enter' || e.key === 'Tab') && !isLocked) {
                                e.preventDefault();
                                focusNext(tok.blankIndex);
                              }
                            }}
                            readOnly={isLocked}
                            className={`border-b-2 bg-transparent text-center font-mono text-sm focus:outline-none transition-colors px-0.5 ${
                              status === 'correct' ? 'border-green-500 bg-green-500/10 text-green-400' :
                              status === 'wrong'   ? 'border-red-500 bg-red-500/10 text-red-400' :
                              'border-white/40 text-yellow-400 focus:border-yellow-400'
                            }`}
                            style={{ width: `${width}ch` }}
                            autoComplete="off"
                            spellCheck={false}
                          />
                        </span>
                      );
                    }
                    return <span key={i}>{tok.value}</span>;
                  })}
                </div>
              </div>

              <p className="text-white/20 text-xs text-center">Tab or Enter to jump to next blank</p>

              <button
                onClick={goToNextChunk}
                disabled={filledCount < chunk.totalBlanks}
                className="w-full bg-white text-black font-bold py-4 rounded-full text-sm hover:bg-white/90 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
              >
                {isLastChunk ? (
                  <><Check size={16} /> Submit Answers</>
                ) : (
                  <>Next Chunk <ChevronRight size={16} /></>
                )}
              </button>
            </div>
          );
        })()}

        {/* ── SUBMITTING ── */}
        {phase.type === 'submitting' && (
          <div className="flex flex-col items-center justify-center py-28 gap-4">
            <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-white/40 text-sm">Grading your answers...</p>
          </div>
        )}

        {/* ── RESULT ── */}
        {phase.type === 'result' && (
          <div className="space-y-4">
            <div className={`rounded-2xl p-8 text-center ${
              phase.won
                ? 'bg-green-500/10 border border-green-500/20'
                : phase.correctCount > 0
                ? 'bg-yellow-400/10 border border-yellow-400/20'
                : 'bg-white/5 border border-white/10'
            }`}>
              <div className="flex justify-center mb-4">
                {phase.won
                  ? <Check size={48} className="text-green-400" />
                  : phase.correctCount > 0
                  ? <Brain size={48} className="text-yellow-400" />
                  : <X size={48} className="text-white/40" />}
              </div>
              <p className={`font-black text-2xl mb-2 ${
                phase.won ? 'text-green-400' : phase.correctCount > 0 ? 'text-yellow-400' : 'text-white'
              }`}>
                {phase.won ? 'Perfect!' : phase.correctCount > 0 ? 'Good Effort' : 'Keep Practicing'}
              </p>
              <p className="text-white/50 text-sm mb-1">{phase.correctCount} of {phase.totalBlanks} correct</p>
              {phase.mode === 'earning' && (
                phase.payout && phase.payout > 0
                  ? <p className="text-yellow-400 font-black text-3xl font-mono mt-3">+${phase.payout.toLocaleString()}</p>
                  : <p className="text-red-400/70 text-sm mt-2">No payout — try again</p>
              )}
            </div>

            <div className="bg-[#111111] rounded-2xl p-5">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-4">Answer Review</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {phase.correctAnswers.map((correct, i) => {
                  const userAns = phase.userAnswers[i] ?? '';
                  const isRight = phase.grades[i] === 1;
                  return (
                    <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-xl ${isRight ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      {isRight ? <Check size={14} className="text-green-400 shrink-0" /> : <X size={14} className="text-red-400 shrink-0" />}
                      <span className="text-white/30 text-[10px] w-5 shrink-0">{i + 1}</span>
                      <span className={`font-mono text-sm font-bold ${isRight ? 'text-green-400' : 'text-red-400'}`}>
                        {userAns || '—'}
                      </span>
                      {!isRight && (
                        <span className="text-white/40 text-xs ml-auto shrink-0">→ <span className="text-white font-mono">{correct}</span></span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {phase.mode === 'earning' && phase.balance !== undefined && (
              <p className="text-white/30 text-xs text-center">
                Balance: <span className="text-white font-mono">${phase.balance.toLocaleString()}</span>
              </p>
            )}

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
