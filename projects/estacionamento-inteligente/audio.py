# Music + SFX, all synthesised, placed on the same timeline as the picture. Writes audio/mix.wav
import json, subprocess, numpy as np, soundfile as sf
from scipy import signal
SR = 44100
T_ = json.load(open('timing.json')); DUR = T_['total']; N = int(DUR * SR)
EV = json.loads(subprocess.check_output(['node', 'tools/dump_ev.js']))
rng = np.random.default_rng(7)
def T(n): return np.arange(n) / SR
def place(buf, x, at, g=1.0):
    i = int(at * SR); j = min(len(buf), i + len(x))
    if 0 <= i < len(buf): buf[i:j] += x[:j - i] * g
def bp(x, lo, hi, o=2): b, a = signal.butter(o, [lo / (SR / 2), min(hi / (SR / 2), .99)], 'band'); return signal.lfilter(b, a, x)
def lp(x, f, o=2): b, a = signal.butter(o, f / (SR / 2), 'low'); return signal.lfilter(b, a, x)
def hp(x, f, o=2): b, a = signal.butter(o, f / (SR / 2), 'high'); return signal.lfilter(b, a, x)
def fade(x, a=.05, b=.1):
    n = len(x); e = np.ones(n); na, nb = int(a * SR), int(b * SR)
    if na: e[:na] = np.linspace(0, 1, na)
    if nb: e[-nb:] = np.minimum(e[-nb:], np.linspace(1, 0, nb))
    return x * e
def midi(m): return 440 * 2 ** ((m - 69) / 12)

# ---------------- SFX ----------------
def engine(dur, f0=46, rev=0.0):
    n = int(dur * SR); t = T(n); f = f0 * (1 + .06 * np.sin(2 * np.pi * 1.3 * t) + rev * np.minimum(1, t / max(.1, dur * .5)) * .4)
    ph = np.cumsum(f) / SR; x = np.sign(np.sin(2 * np.pi * ph)) * .5 + np.sin(2 * np.pi * ph * 2) * .4
    x = lp(x, 260) + lp(rng.standard_normal(n), 180) * .25
    return fade(x, .25, .35) * .5
def tick(f=2600):
    n = int(.035 * SR); t = T(n); return (hp(rng.standard_normal(n), 3000) * np.exp(-t * 220) * .6 + np.sin(2 * np.pi * f * t) * np.exp(-t * 160) * .5)
def servo(dur, up=True):
    n = int(dur * SR); t = T(n); k = t / dur
    f = 210 + (90 * k if up else 90 * (1 - k)); ph = np.cumsum(f) / SR
    x = (2 * (ph % 1) - 1) * .5 + np.sin(2 * np.pi * ph * 3) * .2
    x = bp(x, 150, 2200) * (1 + .3 * np.sin(2 * np.pi * 38 * t))
    x = fade(x, .03, .05) * .55
    c = np.zeros(int(.1 * SR)); c[:len(tick(900))] = tick(900); return np.concatenate([x, c * .8])
def blip(f=1320, d=.09):
    n = int(d * SR); t = T(n); return np.sin(2 * np.pi * f * t) * np.exp(-t * 25) * np.minimum(1, t / .003) * .6
def chime2(f1=880, f2=1320):
    out = np.zeros(int(.7 * SR))
    for i, f in enumerate([f1, f2]):
        n = int(.5 * SR); t = T(n); place(out, (np.sin(2 * np.pi * f * t) + .3 * np.sin(2 * np.pi * f * 2 * t)) * np.exp(-t * 7) * .45, i * .11)
    return out
def ping(f=3200):
    n = int(.07 * SR); t = T(n); return np.sin(2 * np.pi * f * t) * np.exp(-t * 45) * .35
def pop(f=520):
    n = int(.12 * SR); t = T(n); fr = f * (1 + 2 * t * 10); return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 40) * .6
def whoosh(dur=.6):
    n = int(dur * SR); x = rng.standard_normal(n); t = T(n); k = np.linspace(0, 1, n)
    return (bp(x, 300, 1200) * (1 - k) + bp(x, 1500, 5000) * k) * np.sin(np.pi * t / dur) ** 1.5 * .9
def thud(f0=70, dur=.3):
    n = int(dur * SR); t = T(n); f = f0 * (1 + 1.5 * np.exp(-t * 30))
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14) + lp(rng.standard_normal(n), 900) * np.exp(-t * 40) * .5) * .8
def honk():
    out = np.zeros(int(.5 * SR))
    for i in range(2):
        n = int(.13 * SR); t = T(n); x = np.sign(np.sin(2 * np.pi * 420 * t)) * .4 + np.sign(np.sin(2 * np.pi * 530 * t)) * .3
        place(out, fade(lp(x, 1800), .01, .03), i * .2)
    return out * .5
def sparkle():
    out = np.zeros(int(.8 * SR))
    for i, f in enumerate([1568, 2093, 2637, 3136]):
        n = int(.5 * SR); t = T(n); place(out, np.sin(2 * np.pi * f * t) * np.exp(-t * 7) * .3, i * .06)
    return out

sfx = np.zeros(N)
# engines (Lucas and the other cars, only when on screen and moving)
for a, b, g in [(0, 4.6, .9), (4.6, 6.4, .8), (8.4, 12.2, .7), (12.2, 17.0, .45), (17.0, 24.0, .3), (44.0, 46.8, .8), (49.7, 51.1, .6), (57.2, 62.8, .9),
                (64.4, 73.0, .55), (73.0, 74.6, .7), (82.7, 91.0, .4), (92.6, 94.5, .8), (96.6, 97.7, .5), (100.3, 111.0, .55)]:
    place(sfx, engine(b - a, 44 + 6 * rng.random(), .2), a, g * .4)
# clock ticking while Lucas waits
for k in range(int((16.4 - 12.9) / .5)): place(sfx, tick(), 12.9 + k * .5, .5)
for k in range(10): place(sfx, tick(2200), 18.4 + k * .5, .22)
place(sfx, honk(), 20.6, .35)
place(sfx, pop(700), 6.4, .4); place(sfx, pop(800), 9.4, .35); place(sfx, pop(380), 10.6, .3)
place(sfx, sparkle(), 26.9, .5)
place(sfx, whoosh(1.2), 29.2, .35); place(sfx, whoosh(.8), 82.7, .3)
# scene 3: parts appearing
for at in [35.5, 38.9, 39.3, 39.7] + [40.8 + i * .17 for i in range(7)]: place(sfx, pop(600 + 40 * (at % 5)), at, .22)
for i in range(7): place(sfx, blip(990 + i * 60, .06), 37.0 + i * .2, .25)
# the system
for a, b, g in EV['gate']: place(sfx, servo(b - a, g == 1), a, .55)
for at in EV['ir1'] + EV['ir2']: place(sfx, blip(1320), at, .5)
for at, v in EV['disp']:
    if at > 1: place(sfx, chime2(880, 1320) if v != 'L' else chime2(660, 520), at, .45)
for i, L in enumerate(EV['led']):
    for at, v in L:
        if at > 1: place(sfx, pop(900 if v == 'G' else 600), at, .4)
for s_, a, b in EV['us']:
    k = a
    while k < b: place(sfx, ping(), k, .45); k += .22
a, b = EV['usScan']
for i in range(7): place(sfx, ping(3000 + i * 80), a + i * .22, .35)
for at, k in EV['pulse']: place(sfx, blip(1760, .05), at + .85, .25)
# doors
place(sfx, thud(90), 77.45, .4); place(sfx, thud(80), 80.0, .3); place(sfx, thud(90), 99.3, .35); place(sfx, thud(80), 100.05, .4)
# time-lapse ticks
for k in range(16): place(sfx, tick(3000), 83.1 + k * .5, .18)

# ---------------- music: light, positive plucked underscore ----------------
music = np.zeros(N)
BEAT = 60 / 98
cache = {}
def pluck(f, dur=.5):
    k = (round(f, 2), round(dur, 2))
    if k in cache: return cache[k]
    n = int(dur * SR); p = int(SR / f); buf = rng.uniform(-1, 1, p); out = np.zeros(n)
    for i in range(n): out[i] = buf[i % p]; buf[i % p] = .5 * (buf[i % p] + buf[(i + 1) % p]) * .996
    x = bp(out, 120, 4000); x = x / (np.max(np.abs(x)) + 1e-9) * np.exp(-T(n) * 4); cache[k] = x; return x
def glock(m, dur=1.0):
    n = int(dur * SR); t = T(n); f = midi(m)
    return (np.sin(2 * np.pi * f * t) + .3 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 6)) * np.exp(-t * 3.5) * np.minimum(1, t / .002) * .45
def pad(ms, dur):
    n = int(dur * SR); t = T(n); x = np.zeros(n)
    for m in ms:
        for d in (-.003, 0, .004):
            ph = np.cumsum(np.full(n, midi(m) * (1 + d))) / SR; x += 2 * (ph % 1) - 1
    x = lp(x / (len(ms) * 3), 900); return x * np.minimum(1, t / .6) * np.minimum(1, (dur - t) / .6)
BRIGHT = [(36, (60, 64, 67)), (43, (59, 62, 67)), (45, (60, 64, 69)), (41, (57, 60, 65))]    # C G Am F
WORRY = [(45, (57, 60, 64)), (41, (57, 60, 65)), (43, (55, 59, 62)), (40, (55, 59, 64))]     # Am F G Em
MEL = [(0, 76), (1, 79), (1.5, 77), (2, 76), (3, 72)]
def section(t0, t1, prog, g=1.0, mel=True, padg=.18):
    t = t0; bar = 0
    while t < t1 - .1:
        root, ch = prog[bar % 4]; bl = min(4 * BEAT, t1 - t)
        place(music, pluck(midi(root), .9) * .8, t, g)
        for bt in (1, 2, 3):
            if t + bt * BEAT < t1: place(music, pluck(midi(ch[bt % 3]), .5) * .35, t + bt * BEAT, g)
        place(music, pad(ch, bl + .3), t, g * padg)
        if mel and bar % 2 == 0:
            for (bt, m) in MEL:
                mm = m if prog is BRIGHT else m - 3
                if t + bt * BEAT < t1: place(music, glock(mm, 1.0), t + bt * BEAT, g * .45)
        t += 4 * BEAT; bar += 1
section(0, 4.6, BRIGHT, .9)
section(4.6, 30.0, WORRY, .7, mel=False)
section(30.0, 44.0, BRIGHT, .85)
section(44.0, 83.0, BRIGHT, .7, mel=False)
section(83.0, 98.0, BRIGHT, .75, mel=True)
section(98.0, DUR, BRIGHT, .85, mel=True)
for k, m in enumerate([72, 76, 79, 84, 88]): place(music, glock(m, 1.2), 31.2 + k * .2, .4)   # the reveal
music = lp(music, 7000)
# end: hold, then fade the music over the last ~3 s
fe = np.ones(N); i0 = int((DUR - 3.2) * SR); fe[i0:] = np.linspace(1, 0, N - i0) ** 1.5; music *= fe

# ---------------- voice + mix ----------------
vo, vsr = sf.read('audio/vo.wav')
if vo.ndim > 1: vo = vo.mean(1)
import os
if vsr != SR: vo = signal.resample_poly(vo, SR, vsr)
if os.environ.get('VO_RAW') != '1':   # synthetic take: light clean-up; a delivered recording (VO_RAW=1) is used as is, only its level is set
    vo = hp(vo, 80); envv = lp(np.abs(signal.hilbert(vo)), 20); gain = np.where(envv > .12, (.12 / np.maximum(envv, 1e-6)) ** .35, 1.0); vo = vo * gain
vo = vo / np.max(np.abs(vo)) * .9
VO = np.zeros(N); VO[:min(N, len(vo))] = vo[:N]
venv = lp(np.abs(VO), 5); duck = 1 - .6 * np.clip(venv / .04, 0, 1)
mono = VO + music * .2 * duck + sfx * .55 * (1 - .35 * np.clip(venv / .04, 0, 1))
out = np.stack([mono, mono], 1)
tail = np.ones(N); fl = int(.4 * SR); tail[-fl:] = np.linspace(1, 0, fl); out *= tail[:, None]
out = out / np.max(np.abs(out)) * .89
sf.write('audio/mix.wav', out, SR)
print('mix', out.shape[0] / SR, 's')
