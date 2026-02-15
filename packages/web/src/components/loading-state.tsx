'use client';

import { useState, useEffect } from 'react';

const STATUS_MESSAGES = [
  'Extracting transcript...',
  'Analyzing frameworks...',
  'Distilling techniques...',
  'Formatting skill file...',
];

export default function LoadingState() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto text-center py-16">
      {/* Spinner */}
      <div className="relative w-16 h-16 mx-auto mb-8">
        <div className="absolute inset-0 rounded-full border-2 border-border-subtle" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin" />
        <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-accent-secondary animate-spin [animation-direction:reverse] [animation-duration:1.5s]" />
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs mx-auto h-1 bg-surface rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-gradient-to-r from-accent-secondary via-accent to-accent-secondary rounded-full animate-shimmer"
          style={{
            backgroundSize: '200% 100%',
            width: '100%',
          }}
        />
      </div>

      {/* Status text */}
      <p className="text-accent font-body text-lg animate-gold-pulse">
        {STATUS_MESSAGES[messageIndex]}
      </p>
    </div>
  );
}
