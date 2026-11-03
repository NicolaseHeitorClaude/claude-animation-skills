# Split one continuous narration take into the 19 script sentences at its own pauses (no time-stretch, no edits to the voice).
# Writes audio/line_XX.wav (exact slices of the recording) + audio/lines_raw.json, and prints the match for review.
import json, re, subprocess, sys, numpy as np, soundfile as sf
src = sys.argv[1]
wav = 'audio_el/narracao_elevenlabs.wav'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-ac', '1', '-ar', '44100', wav], check=True)
a, sr = sf.read(wav, dtype='float32')
out = subprocess.run(['ffmpeg', '-nostats', '-i', wav, '-af', 'silencedetect=noise=-40dB:d=0.18', '-f', 'null', '-'], capture_output=True, text=True).stderr
st = [float(x) for x in re.findall(r'silence_start: ([0-9.]+)', out)]; en = [float(x) for x in re.findall(r'silence_end: ([0-9.]+)', out)]
sil = list(zip(st, en))
lines = json.load(open('script.json')); n = len(lines)
# speech span
env = np.abs(a); idx = np.where(env > 10 ** (-40 / 20))[0]; t0, t1 = idx[0] / sr, idx[-1] / sr
cand = [(s, e) for s, e in sil if s > t0 + .3 and e < t1 - .3]
chars = [len(re.sub(r'\s', '', L['text'])) + 4 for L in lines]
rate = (t1 - t0) / sum(chars)
exp = np.cumsum(chars)[:-1] * rate + t0          # expected boundary times
# DP: pick n-1 pauses in order, cost = squared drift from expected boundary - bonus for long pauses
m = len(cand); INF = 1e18
D = np.full((n, m), INF); P = np.zeros((n, m), int)
mid = [(s + e) / 2 for s, e in cand]; ln = [e - s for s, e in cand]
for j in range(m): D[1][j] = (mid[j] - exp[0]) ** 2 - 2.0 * ln[j]
for k in range(2, n):
    for j in range(m):
        best = INF
        for i in range(j):
            v = D[k - 1][i] + (mid[j] - exp[k - 1]) ** 2 - 2.0 * ln[j]
            if v < best: best, P[k][j] = v, i
        D[k][j] = best
j = int(np.argmin(D[n - 1])); pick = [j]
for k in range(n - 1, 1, -1): j = P[k][j]; pick.append(j)
pick = pick[::-1]
bounds = [cand[j] for j in pick]
segs = []; s = t0
for (bs, be) in bounds: segs.append((s, bs)); s = be
segs.append((s, t1))
meta = []
for i, ((s, e), L) in enumerate(zip(segs, lines)):
    i0, i1 = max(0, int((s - .03) * sr)), min(len(a), int((e + .06) * sr))
    sf.write(f'audio/line_{i:02d}.wav', a[i0:i1], sr)
    meta.append({'i': i, 'scene': L['scene'], 'dur': round((i1 - i0) / sr, 3), 'sr': sr, 'src_s': round(s, 3), 'src_e': round(e, 3),
                 'pause_after': round(bounds[i][1] - bounds[i][0], 3) if i < len(bounds) else None,
                 'inner_pauses': [round((x + y) / 2 - s + .03, 3) for x, y in cand if x > s and y < e]})
    print(f"{i:2d} {s:6.2f}-{e:6.2f} dur {e-s:5.2f} ({(e-s)/chars[i]*1000:4.0f} ms/char) | {L['text'][:70]}")
unused = [c for k, c in enumerate(cand) if k not in pick]
print('pauses inside sentences:', [(round(x, 2), round(y - x, 2)) for x, y in unused])
json.dump({'voice': 'ElevenLabs (gravação enviada)', 'source': src, 'lines': meta}, open('audio/lines_raw.json', 'w'), indent=1)
