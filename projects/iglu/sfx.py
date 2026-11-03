#!/usr/bin/env python3
"""Synthesised sound effects for the igloo short -> audio/sfx.wav (no music).
Times follow the build schedule in src/shots.js. Run with any Python that has numpy."""
import json, wave
import numpy as np

SR = 44100
DUR = 61.0
rng = np.random.default_rng(7)
out = np.zeros(int(SR * DUR))

def lp(x, a):  # one-pole low-pass, a in (0,1): larger = darker
    y = np.empty_like(x); s = 0.0
    for i, v in enumerate(x): s = s * a + v * (1 - a); y[i] = s
    return y
def hp(x, a): return x - lp(x, a)
def env(n, att, rel):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(att, 1e-4)) * np.exp(-np.maximum(0, t - att) / rel)
def add(t, sig, gain):
    i = int(t * SR)
    if i >= len(out): return
    j = min(len(out), i + len(sig)); out[i:j] += sig[:j - i] * gain

# precomputed noises
N1 = rng.standard_normal(SR * 2)
def saw_stroke(dur=0.26):
    n = int(dur * SR); x = N1[:n] * (0.6 + 0.4 * np.sin(np.arange(n) / SR * 2 * np.pi * 95) ** 2)
    x = hp(lp(x, 0.55), 0.97)
    return x * np.sin(np.linspace(0, np.pi, n)) ** 1.5
def crunch(dur=0.16, dark=0.7):
    n = int(dur * SR); x = rng.standard_normal(n) * (rng.random(n) < 0.35)
    x = lp(x, dark) * env(n, 0.004, dur / 3)
    return x
def thump(dur=0.28, f=85):
    n = int(dur * SR); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * f * t * (1 - 0.3 * t / dur)) * env(n, 0.003, 0.06)
    return body * 0.9 + crunch(dur, 0.8) * 0.6
def rustle(dur, rate=6):
    n = int(dur * SR); t = np.arange(n) / SR
    x = hp(lp(rng.standard_normal(n), 0.6), 0.95) * (0.5 + 0.5 * np.sin(2 * np.pi * rate * t) ** 2)
    return x * np.sin(np.linspace(0, np.pi, n))

# --- saw strokes: block cutting, ramp cut, key trimming (period = 2pi / stroke rate in shots.js)
for a, b, w, g in [(3.9, 6.35, 10, 0.32), (14.9, 17.85, 11, 0.26), (28.0, 29.6, 12, 0.2)]:
    t = a
    while t < b: add(t, saw_stroke(), g); t += np.pi / w * 2 * 0.5 + 0.0
# --- block out of the ground, onto the stack
add(6.85, crunch(0.5, 0.85), 0.5); add(9.65, thump(), 0.55)
# --- footsteps on snow
for a, b, step, g in [(8.35, 9.55, 0.36, 0.38), (10.0, 11.85, 0.4, 0.3), (12.3, 12.75, 0.3, 0.3), (14.9, 17.8, 0.45, 0.22), (38.5, 39.2, 0.35, 0.22)]:
    t = a
    while t < b: add(t, crunch(0.14, 0.72), g * (0.85 + 0.3 * rng.random())); t += step
# --- block placements (build schedule)
TAU = 2 * np.pi
add(13.05, thump(), 0.5)
for i in range(1, 18): add(13.3 + (i - 1) * 0.072, thump(0.18, 110), 0.16)
for j in range(10): add(18.8 + j * 0.215, thump(0.22, 95), 0.3)
add(23.45, thump(), 0.45)
for k in range(3): add(23.55 + k * 0.22, crunch(0.08, 0.6), 0.22)   # mitten taps
n = 45 - 21 - 1
for k in range(n): add(24.4 + k * (2.6 / (n - 1)), thump(0.18, 105), 0.14)
add(31.2, thump(0.4, 70), 0.42); add(31.22, crunch(0.35, 0.8), 0.25)  # key block settles (slow motion: soft)
# wedges sliding off during the ramp cut
for k in range(9): add(15.2 + k * 0.32, crunch(0.22, 0.82), 0.14)
# --- packing the joints
add(31.65, rustle(1.9, 2.75), 0.12)
# --- tunnel blocks, fur, sleeping bag
for k in range(15): add(36.65 + k * 0.105, thump(0.16, 100), 0.13)
add(38.75, rustle(0.6, 3), 0.15); add(39.95, thump(0.3, 60), 0.25)

# --- wind bed: band-limited noise with slow gusts; louder only in the storm shots, ducked under the voice
n = len(out); t = np.arange(n) / SR
w = lp(rng.standard_normal(n), 0.985); w = w / np.abs(w).max()
gust = 0.6 + 0.4 * np.sin(2 * np.pi * 0.13 * t) * np.sin(2 * np.pi * 0.07 * t + 1)
level = np.full(n, 0.05)
for a, b, l in [(0, 3.6, 0.16), (45.9, 55.0, 0.1), (55.0, 61, 0.07)]:
    m = (t >= a) & (t < b); level[m] = l
level = lp(level, 0.9995)
out += w * gust * level

# voice ducking: lower effects a little where the narration is speaking
words = json.load(open('audio/vo.words.json'))
speech = np.zeros(n)
for x in words: speech[int(x['s'] * SR):int(min(DUR, x['e']) * SR)] = 1
speech = lp(speech, 0.9995)
out *= 1 - 0.35 * speech
out = np.tanh(out * 1.2) / 1.2
pk = np.abs(out).max(); out = out / pk * 0.5
with wave.open('audio/sfx.wav', 'wb') as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR)
    f.writeframes((out * 32767).astype(np.int16).tobytes())
print('wrote audio/sfx.wav')
