'use client';

import { useState, useEffect, useRef } from 'react';

const WORDS = [
  { text: 'education', isGold: true },
  { text: 'into',      isGold: false },
  { text: 'execution', isGold: true },
];
const HOLD_TIMES = [1800, 900, 2200];
const TRANSITION_MS = 600;

type Phase = 'hold' | 'exiting' | 'entering-instant';

export default function Hero() {
  const [wordIdx, setWordIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('hold');
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const longestRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (longestRef.current) {
      setContainerWidth(longestRef.current.getBoundingClientRect().width);
    }
  }, []);

  useEffect(() => {
    const holdTimer = setTimeout(() => {
      setPhase('exiting');

      const exitTimer = setTimeout(() => {
        const nextIdx = (wordIdx + 1) % WORDS.length;
        setPhase('entering-instant');

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setWordIdx(nextIdx);
            setPhase('hold');
          });
        });
      }, TRANSITION_MS);

      return () => clearTimeout(exitTimer);
    }, HOLD_TIMES[wordIdx]);

    return () => clearTimeout(holdTimer);
  }, [wordIdx, phase === 'hold' ? phase : null]);

  const wordStyle: React.CSSProperties =
    phase === 'hold'
      ? {
          display: 'inline-block',
          transform: 'translateY(0) scale(1)',
          opacity: 1,
          filter: 'blur(0px)',
          transition: `all ${TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        }
      : phase === 'exiting'
      ? {
          display: 'inline-block',
          transform: 'translateY(100%) scale(0.9)',
          opacity: 0,
          filter: 'blur(5px)',
          transition: `all ${TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        }
      : {
          display: 'inline-block',
          transform: 'translateY(-100%) scale(0.9)',
          opacity: 0,
          filter: 'blur(5px)',
          transition: 'none',
        };

  const wordClasses = WORDS[wordIdx].isGold
    ? 'text-accent font-medium'
    : 'text-text-primary';

  return (
    <div className="text-center mb-12">
      {/* Hidden measurement span for longest word */}
      <span
        ref={longestRef}
        aria-hidden
        style={{ position: 'absolute', visibility: 'hidden', whiteSpace: 'nowrap' }}
        className="text-text-secondary text-lg md:text-xl leading-relaxed font-medium"
      >
        execution
      </span>

      <h1 className="font-heading text-5xl md:text-7xl font-800 tracking-tight mb-6">
        Stop watching.{' '}
        <span className="text-accent gold-text-glow">Start doing.</span>
      </h1>

      <p className="text-text-secondary text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
        Bridging knowledge gaps &amp; turning{' '}
        <span
          style={{
            display: 'inline-block',
            overflow: 'hidden',
            width: containerWidth ? `${containerWidth}px` : 'auto',
            verticalAlign: 'bottom',
          }}
        >
          <span style={wordStyle} className={wordClasses}>
            {WORDS[wordIdx].text}
          </span>
        </span>
      </p>
    </div>
  );
}
