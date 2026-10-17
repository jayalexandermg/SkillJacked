"""Synthesized UI sound layer for the promo, placed on the same 120 BPM grid.

    python3 sound.py dist/sfx.wav

Every event time mirrors promo.html's timeline (bt(bar, beat, eighths)).
Tails that run past 32 s wrap to the start, so the audio loops as cleanly
as the picture.
"""
import sys
import wave

import numpy as np

SR = 48000
L = 32.0
rng = np.random.default_rng(7)


def bt(bar, beat=1, eighths=0):
    return (bar - 1) * 2 + (beat - 1) * 0.5 + eighths * 0.25


def env(n, attack=0.002, decay=0.08):
    t = np.arange(n) / SR
    a = np.clip(t / attack, 0, 1)
    return a * np.exp(-t / decay)


def tone(freqs, dur, decay, amp=1.0, attack=0.002):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * f * t) * w for f, w in freqs)
    return amp * s * env(n, attack, decay)


def noise(dur, decay, lp=0.5, amp=1.0, attack=0.001):
    n = int(dur * SR)
    x = rng.standard_normal(n)
    # One-pole low-pass: lp in (0, 1], lower = darker.
    y = np.empty(n)
    acc = 0.0
    for i in range(n):
        acc += lp * (x[i] - acc)
        y[i] = acc
    return amp * y / (np.abs(y).max() + 1e-9) * env(n, attack, decay)


def whoosh(dur, rise, amp):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = noise(dur, 10.0, lp=0.08, amp=1.0, attack=0.001)
    shape = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    shape *= np.where(t < rise, t / rise, 1.0)
    return amp * x * shape


CLICK = tone([(2600, 0.5), (1300, 0.5)], 0.05, 0.012, 0.35) + noise(0.05, 0.006, lp=0.9, amp=0.25)
KEY = tone([(3400, 1.0)], 0.03, 0.006, 0.12) + noise(0.03, 0.004, lp=0.9, amp=0.1)
TICK = tone([(1760, 1.0)], 0.12, 0.03, 0.10)
DOWNBEAT = tone([(110, 1.0), (220, 0.35)], 0.35, 0.09, 0.30, attack=0.004)
CHIME = tone([(1318.5, 0.6), (1975.5, 0.35), (2637, 0.2)], 1.2, 0.35, 0.22, attack=0.004)
SHIMMER = tone([(2093, 0.4), (3136, 0.3)], 0.6, 0.18, 0.12, attack=0.01)
SWOOSH = whoosh(0.55, 0.3, 0.16)
SWOOSH_BIG = whoosh(0.9, 0.35, 0.22)

CLICKS = [bt(1, 2), bt(3, 1), bt(7, 4), bt(9, 4), bt(10, 4), bt(11, 2), bt(12, 1), bt(12, 4), bt(13, 4), bt(15, 2)]
ACCENTS = [bt(3, 1), bt(6, 1), bt(9, 4), bt(12, 1)]
TYPING = [bt(1, 2, 1) + i * 0.0625 for i in range(28)]
events = (
    [(t, DOWNBEAT) for t in np.arange(0, L, 2.0)]
    + [(t, CLICK) for t in CLICKS]
    + [(t, KEY) for t in TYPING + [bt(15, 3)]]
    + [(t, CHIME) for t in ACCENTS]
    + [(t, TICK) for t in [bt(3, 3), bt(4, 1), bt(5, 1), bt(4, 1), bt(4, 2), bt(4, 3), bt(16, 2), bt(16, 3), bt(16, 4)]]
    + [(t, SHIMMER) for t in [bt(8, 2), bt(13, 1)]]
    + [(t - 0.25, SWOOSH) for t in [bt(3, 2), bt(8, 1), bt(14, 2)]]
    + [(t - 0.3, SWOOSH_BIG) for t in [bt(6, 1), bt(6, 4), bt(14, 1)]]
)

n = int(L * SR)
mix = np.zeros(n)
for t0, s in events:
    i0 = int(round(t0 * SR)) % n
    for k in range(len(s)):
        mix[(i0 + k) % n] += s[k]

mix /= np.abs(mix).max() / 0.89
stereo = np.stack([mix, mix], axis=1)
pcm = (stereo * 32767).astype('<i2')
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('wrote', sys.argv[1], f'{L:.0f}s', len(events), 'events')
