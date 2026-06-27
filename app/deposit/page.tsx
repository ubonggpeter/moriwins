'use client';
import { useState } from 'react';
import Navbar from '@/components/Navbar';

const AMOUNTS = [50, 100, 250, 500, 1000];
const METHODS = [
  { id: 'card', label: 'Credit / Debit Card', icon: '💳' },
  { id: 'crypto', label: 'Cryptocurrency', icon: '₿' },
  { id: 'bank', label: 'Bank Transfer', icon: '🏦' },
];

export default function DepositPage() {
  const [amount, setAmount] = useState(100);
  const [method, setMethod] = useState('card');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <main className="max-w-lg mx-auto px-4 pt-24 pb-16">
        <div className="flex items-center gap-3 mb-8">
          <span className="text-3xl">💰</span>
          <div>
            <h1 className="text-2xl font-black tracking-widest">DEPOSIT</h1>
            <p className="text-white/30 text-xs tracking-wider">ADD CREDITS TO YOUR ACCOUNT</p>
          </div>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Amount */}
            <div className="border border-white/8 rounded-lg p-6 space-y-4">
              <h2 className="text-sm font-bold tracking-widest text-white/60 uppercase">
                Select Amount
              </h2>
              <div className="grid grid-cols-5 gap-2">
                {AMOUNTS.map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAmount(v)}
                    className={`py-2.5 rounded text-sm font-mono border transition-all ${
                      amount === v
                        ? 'bg-white text-black border-white'
                        : 'bg-white/5 text-white/60 border-white/10 hover:border-white/30 hover:text-white'
                    }`}
                  >
                    ${v}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white/30 text-sm">Custom:</span>
                <input
                  type="number"
                  value={amount}
                  min={5}
                  max={10000}
                  onChange={e => setAmount(Number(e.target.value))}
                  className="flex-1 px-3 py-2 rounded text-sm font-mono border border-white/10 bg-white/5 text-white focus:outline-none focus:border-white/40"
                />
              </div>
            </div>

            {/* Payment method */}
            <div className="border border-white/8 rounded-lg p-6 space-y-4">
              <h2 className="text-sm font-bold tracking-widest text-white/60 uppercase">
                Payment Method
              </h2>
              <div className="space-y-2">
                {METHODS.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded border transition-all text-left ${
                      method === m.id
                        ? 'border-white/40 bg-white/8'
                        : 'border-white/8 bg-white/2 hover:border-white/20 hover:bg-white/5'
                    }`}
                  >
                    <span className="text-xl">{m.icon}</span>
                    <span className="text-sm text-white/80">{m.label}</span>
                    {method === m.id && (
                      <span className="ml-auto text-white text-xs">●</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="border border-white/8 rounded-lg p-5 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Deposit Amount</span>
                <span className="text-white font-mono">${amount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Processing Fee</span>
                <span className="text-white font-mono">$0.00</span>
              </div>
              <div className="border-t border-white/10 pt-2 flex justify-between text-sm font-bold">
                <span className="text-white/60">Total Credits</span>
                <span className="text-yellow-400 font-mono">+${amount}</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-white text-black font-bold py-3 rounded tracking-wider text-sm hover:bg-white/90 transition-all"
            >
              DEPOSIT ${amount}
            </button>
          </form>
        ) : (
          <div className="border border-white/8 rounded-xl p-10 text-center space-y-4">
            <div className="text-5xl mb-6">🔧</div>
            <h2 className="text-xl font-black tracking-widest">COMING SOON</h2>
            <p className="text-white/40 text-sm leading-relaxed">
              Payment processing is not yet connected. This is a demo platform —
              you start with $1,000 in free credits.
            </p>
            <div className="border border-yellow-400/20 bg-yellow-400/5 rounded-lg p-4 mt-4">
              <p className="text-yellow-400 text-xs font-mono">
                Requested deposit: <span className="font-bold">${amount}</span>
              </p>
              <p className="text-yellow-400/50 text-xs mt-1">
                This feature will be live soon!
              </p>
            </div>
            <button
              onClick={() => setSubmitted(false)}
              className="mt-4 px-6 py-2.5 border border-white/20 text-white text-sm rounded hover:border-white/40 transition-all"
            >
              Go Back
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
