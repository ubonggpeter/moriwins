'use client';
import { useEffect, useState } from 'react';

const PATTERNS = [
  [1, 0, 1, 0, 1, 0, 1, 0, 1],
  [0, 1, 0, 1, 0, 1, 0, 1, 0],
  [1, 1, 0, 0, 1, 0, 0, 1, 1],
  [0, 0, 1, 1, 0, 1, 1, 0, 0],
  [1, 1, 1, 0, 0, 0, 1, 1, 1],
  [0, 1, 0, 1, 1, 1, 0, 1, 0],
];

export default function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const [patternIdx, setPatternIdx] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 120);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (tick % 8 === 0) {
      setPatternIdx(p => (p + 1) % PATTERNS.length);
    }
  }, [tick]);

  const current = PATTERNS[patternIdx];
  const dim = size === 'sm' ? 12 : size === 'lg' ? 28 : 20;
  const gap = size === 'sm' ? 2 : size === 'lg' ? 4 : 3;

  return (
    <div
      className="grid grid-cols-3"
      style={{ gap, width: dim * 3 + gap * 2, height: dim * 3 + gap * 2 }}
    >
      {current.map((active, i) => (
        <div
          key={i}
          style={{
            width: dim,
            height: dim,
            background: active ? '#ffffff' : '#1a1a1a',
            boxShadow: active ? '0 0 10px #fff, 0 0 20px #fff' : 'none',
            borderRadius: 2,
            transition: 'all 0.15s ease',
          }}
        />
      ))}
    </div>
  );
}
