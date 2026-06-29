'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';

const AMOUNTS = [50, 100, 250, 500, 1000];
const METHODS = [
  { id: 'card', label: 'Credit / Debit Card', icon: '💳' },
  { id: 'crypto', label: 'Cryptocurrency', icon: '₿' },
  { id: 'bank', label: 'Bank Transfer', icon: '🏦' },
];

export default function DepositPage() {
  const router = useRouter();
  const [amount, setAmount] = useState(100);
  const [method, setMethod] = useState('card');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-black pb-24 md:pb-10 md:pt-14">
      <div className="max-w-lg md:max-w-2xl mx-auto px-5 md:px-8">

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
          <div>
            <h1 className="text-white font-bold text-lg">Deposit</h1>
            <p className="text-white/30 text-xs">Add credits to your account</p>
          </div>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount */}
            <div className="bg-[#111111] rounded-2xl p-5 space-y-4">
              <h2 className="text-xs font-bold tracking-widest text-white/40 uppercase">Select Amount</h2>
              <div className="grid grid-cols-5 gap-2">
                {AMOUNTS.map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAmount(v)}
                    className={`py-2.5 rounded-full text-xs font-mono transition-all ${
                      amount === v
                        ? 'bg-white text-black font-bold'
                        : 'bg-[#1c1c1c] text-white/60 hover:text-white border border-white/8'
                    }`}
                  >
                    ${v}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white/30 text-xs">Custom</span>
                <input
                  type="number"
                  value={amount}
                  min={5}
                  max={10000}
                  onChange={e => setAmount(Number(e.target.value))}
                  className="flex-1 px-4 py-2.5 rounded-full text-sm font-mono border border-white/8 bg-[#1c1c1c] text-white focus:outline-none focus:border-white/30"
                />
              </div>
            </div>

            {/* Payment method */}
            <div className="bg-[#111111] rounded-2xl p-5 space-y-3">
              <h2 className="text-xs font-bold tracking-widest text-white/40 uppercase">Payment Method</h2>
              <div className="space-y-2">
                {METHODS.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                      method === m.id
                        ? 'bg-white/8 border border-white/20'
                        : 'bg-[#1c1c1c] border border-white/5 hover:border-white/15'
                    }`}
                  >
                    <span className="text-xl">{m.icon}</span>
                    <span className="text-sm text-white/80 flex-1">{m.label}</span>
                    {method === m.id && (
                      <span className="w-4 h-4 rounded-full bg-white flex items-center justify-center">
                        <span className="w-2 h-2 rounded-full bg-black" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-[#111111] rounded-2xl p-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Deposit Amount</span>
                <span className="text-white font-mono">${amount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Processing Fee</span>
                <span className="text-white font-mono">$0.00</span>
              </div>
              <div className="border-t border-white/8 pt-3 flex justify-between text-sm font-bold">
                <span className="text-white/60">Total Credits</span>
                <span className="text-yellow-400 font-mono">+${amount}</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-white text-black font-bold py-4 rounded-full tracking-wider text-sm hover:bg-white/90 transition-all"
            >
              DEPOSIT ${amount}
            </button>
          </form>
        ) : (
          <div className="bg-[#111111] rounded-2xl p-8 text-center space-y-4">
            <div className="text-5xl mb-4">🔧</div>
            <h2 className="text-xl font-black tracking-widest text-white">COMING SOON</h2>
            <p className="text-white/40 text-sm leading-relaxed">
              Payment processing is not yet connected. This is a demo platform —
              you start with $1,000 in free credits.
            </p>
            <div className="bg-yellow-400/10 border border-yellow-400/15 rounded-xl p-4 mt-2">
              <p className="text-yellow-400 text-xs font-mono">
                Requested: <span className="font-bold">${amount}</span>
              </p>
              <p className="text-yellow-400/50 text-xs mt-1">This feature will be live soon!</p>
            </div>
            <button
              onClick={() => setSubmitted(false)}
              className="mt-2 w-full py-3 border border-white/15 text-white text-sm rounded-full hover:border-white/30 transition-all"
            >
              Go Back
            </button>
          </div>
        )}

      </div>
      <BottomNav />
    </div>
  );
}
