'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, ChevronLeft, CheckCircle, Award, Loader2 } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  video_url: string;
  thumbnail_url: string;
}

interface Purchase {
  completed: boolean;
  testPassed: boolean;
}

interface Question {
  id: string;
  question_text: string;
  options: string[];
}

interface TestResult {
  score: number;
  passed: boolean;
  total: number;
  correct: number;
  certificateId?: string;
}

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      return u.pathname.slice(1);
    }
    if (u.hostname.includes('youtube.com')) {
      return u.searchParams.get('v');
    }
  } catch {}
  return null;
}

function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube') || url.includes('youtu.be');
}

export default function CourseDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const courseId = params.id;

  const [course, setCourse] = useState<Course | null>(null);
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [loading, setLoading] = useState(true);

  const [purchasing, setPurchasing] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [testAnswers, setTestAnswers] = useState<Record<string, number>>({});
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const [balance, setBalance] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [courseRes, userRes] = await Promise.all([
        fetch(`/api/courses/${courseId}`),
        fetch('/api/user'),
      ]);
      const userData = await userRes.json();
      if (userData.balance !== undefined) setBalance(userData.balance);

      if (!courseRes.ok) {
        if (courseRes.status === 401) {
          router.replace('/auth/login');
          return;
        }
        router.replace('/learn');
        return;
      }
      const data = await courseRes.json();
      setCourse(data.course);
      setPurchase(data.purchase);
      setQuestions(data.questions);
    } catch {
      router.replace('/learn');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [courseId]);

  async function handlePurchase() {
    if (!course) return;
    setPurchasing(true);
    const res = await fetch('/api/courses/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId: course.id }),
    });
    setPurchasing(false);
    if (res.ok) {
      const data = await res.json();
      setBalance(data.balance);
      await load();
    } else {
      const data = await res.json();
      alert(data.error ?? 'Purchase failed');
    }
  }

  async function handleComplete() {
    if (!course) return;
    setCompleting(true);
    const res = await fetch('/api/courses/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId: course.id }),
    });
    setCompleting(false);
    if (res.ok) {
      setPurchase(p => p ? { ...p, completed: true } : p);
    } else {
      const data = await res.json();
      alert(data.error ?? 'Failed to mark as completed');
    }
  }

  async function handleSubmitTest() {
    if (!course) return;
    setSubmitting(true);
    const res = await fetch('/api/courses/test-submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId: course.id, answers: testAnswers }),
    });
    setSubmitting(false);
    if (res.ok) {
      const data = await res.json();
      setTestResult(data);
      if (data.passed) {
        setPurchase(p => p ? { ...p, testPassed: true } : p);
      }
    } else {
      const data = await res.json();
      alert(data.error ?? 'Test submission failed');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 size={24} className="text-white/30 animate-spin" />
      </div>
    );
  }

  if (!course) return null;

  const videoId = course.video_url ? extractYouTubeId(course.video_url) : null;
  const isYT = course.video_url ? isYouTubeUrl(course.video_url) : false;

  return (
    <div className="min-h-screen bg-black pb-28 md:pb-10 md:pt-14">
      <div className="w-full max-w-2xl mx-auto px-4 sm:px-6">
        {/* Back */}
        <div className="pt-8 md:pt-6 pb-4">
          <Link
            href="/learn"
            className="flex items-center gap-1.5 text-white/40 hover:text-white text-sm transition-colors w-fit"
          >
            <ChevronLeft size={16} />
            Learn Hub
          </Link>
        </div>

        {/* Balance */}
        {balance !== null && (
          <div className="flex justify-end mb-4">
            <span className="text-yellow-400 font-mono font-bold text-sm">
              Balance: ${balance.toLocaleString()}
            </span>
          </div>
        )}

        {/* Not purchased */}
        {!purchase && (
          <div className="space-y-4">
            {course.thumbnail_url && (
              <div className="rounded-2xl overflow-hidden h-48">
                <img
                  src={course.thumbnail_url}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            {!course.thumbnail_url && (
              <div className="rounded-2xl h-48 bg-gradient-to-br from-yellow-400/20 to-yellow-600/5 flex items-center justify-center">
                <BookOpen size={48} className="text-yellow-400/40" />
              </div>
            )}
            <div className="bg-[#111111] rounded-2xl p-6">
              <h1 className="text-white font-black text-2xl mb-2">{course.title}</h1>
              <p className="text-white/50 text-sm mb-6 leading-relaxed">{course.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-yellow-400 font-mono font-black text-2xl">
                  {course.price === 0 ? 'Free' : `$${course.price.toLocaleString()}`}
                </span>
                <button
                  onClick={handlePurchase}
                  disabled={purchasing}
                  className="bg-yellow-400 text-black font-bold px-6 py-3 rounded-full hover:bg-yellow-300 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {purchasing && <Loader2 size={14} className="animate-spin" />}
                  {purchasing ? 'Purchasing...' : `Purchase for $${course.price.toLocaleString()}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Purchased */}
        {purchase && (
          <div className="space-y-6">
            <div>
              <h1 className="text-white font-black text-2xl mb-1">{course.title}</h1>
              <p className="text-white/40 text-sm">{course.description}</p>
            </div>

            {/* Video */}
            {course.video_url && (
              <div className="bg-[#111111] rounded-2xl overflow-hidden">
                {isYT && videoId ? (
                  <div className="aspect-video">
                    <iframe
                      src={`https://www.youtube.com/embed/${videoId}`}
                      title={course.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <video
                    controls
                    src={course.video_url}
                    className="w-full"
                  />
                )}
              </div>
            )}

            {/* Mark complete */}
            {!purchase.completed && (
              <button
                onClick={handleComplete}
                disabled={completing}
                className="w-full bg-white text-black font-bold py-4 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {completing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                {completing ? 'Marking...' : 'Mark as Completed'}
              </button>
            )}

            {/* Completed state */}
            {purchase.completed && !purchase.testPassed && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle size={16} />
                  <span className="text-sm font-bold">Course Completed!</span>
                </div>

                {/* Test */}
                {questions && questions.length > 0 && !testResult && (
                  <div className="bg-[#111111] rounded-2xl p-6 space-y-6">
                    <div>
                      <h2 className="text-white font-bold text-lg mb-1">Knowledge Test</h2>
                      <p className="text-white/40 text-xs">Answer all questions to earn your certificate.</p>
                    </div>
                    {questions.map((q, qi) => {
                      const opts = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
                      return (
                        <div key={q.id} className="space-y-3">
                          <p className="text-white text-sm font-bold">
                            {qi + 1}. {q.question_text}
                          </p>
                          <div className="space-y-2">
                            {(opts as string[]).map((opt, oi) => {
                              const selected = testAnswers[q.id] === oi;
                              return (
                                <button
                                  key={oi}
                                  onClick={() => setTestAnswers(p => ({ ...p, [q.id]: oi }))}
                                  className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all border ${
                                    selected
                                      ? 'border-yellow-400 bg-yellow-400/10 text-white'
                                      : 'border-white/[0.08] bg-[#1a1a1a] text-white/60 hover:border-white/20 hover:text-white'
                                  }`}
                                >
                                  <span className="font-bold mr-2 text-white/40">
                                    {['A', 'B', 'C', 'D'][oi]}.
                                  </span>
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    <button
                      onClick={handleSubmitTest}
                      disabled={submitting || Object.keys(testAnswers).length < (questions?.length ?? 0)}
                      className="w-full bg-yellow-400 text-black font-bold py-4 rounded-full hover:bg-yellow-300 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {submitting && <Loader2 size={16} className="animate-spin" />}
                      {submitting ? 'Submitting...' : 'Submit Test'}
                    </button>
                  </div>
                )}

                {questions && questions.length === 0 && (
                  <div className="bg-[#111111] rounded-2xl p-6 text-center">
                    <p className="text-white/40 text-sm">No test questions added yet.</p>
                  </div>
                )}

                {/* Test result */}
                {testResult && (
                  <div className={`bg-[#111111] rounded-2xl p-6 text-center space-y-3 border ${testResult.passed ? 'border-green-500/30' : 'border-red-500/20'}`}>
                    <p className={`font-black text-4xl font-mono ${testResult.passed ? 'text-green-400' : 'text-red-400'}`}>
                      {testResult.score}%
                    </p>
                    <p className="text-white/60 text-sm">
                      {testResult.correct} / {testResult.total} correct
                    </p>
                    <p className={`font-bold text-sm ${testResult.passed ? 'text-green-400' : 'text-red-400'}`}>
                      {testResult.passed ? 'You passed! Certificate earned.' : 'You did not pass. Please review and try again.'}
                    </p>
                    {testResult.passed && testResult.certificateId && (
                      <Link
                        href={`/certificates/${testResult.certificateId}`}
                        className="inline-flex items-center gap-2 bg-yellow-400 text-black font-bold px-6 py-3 rounded-full hover:bg-yellow-300 transition-colors"
                      >
                        <Award size={16} />
                        View Certificate
                      </Link>
                    )}
                    {!testResult.passed && (
                      <button
                        onClick={() => { setTestResult(null); setTestAnswers({}); }}
                        className="w-full bg-white text-black font-bold py-3 rounded-full hover:bg-gray-100 transition-colors"
                      >
                        Try Again
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Test passed */}
            {purchase.testPassed && (
              <div className="bg-[#111111] rounded-2xl p-6 text-center space-y-4 border border-yellow-400/20">
                <Award size={48} className="text-yellow-400 mx-auto" />
                <div>
                  <h2 className="text-white font-black text-xl">Certificate Earned!</h2>
                  <p className="text-white/40 text-sm mt-1">
                    You successfully completed this course and passed the test.
                  </p>
                </div>
                <Link
                  href="/certificates"
                  className="inline-flex items-center gap-2 bg-yellow-400 text-black font-bold px-6 py-3 rounded-full hover:bg-yellow-300 transition-colors"
                >
                  <Award size={16} />
                  View My Certificates
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
