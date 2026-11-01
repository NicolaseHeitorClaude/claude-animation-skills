import json, sys, os, numpy as np, soundfile as sf
ROOT = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
KIT = os.path.realpath(os.path.join(ROOT, "..", "..", "..", "kit"))  # the voice models live in kit/models
from kokoro_onnx import Kokoro

voice = sys.argv[1] if len(sys.argv) > 1 else "am_michael"
speed = float(sys.argv[2]) if len(sys.argv) > 2 else 1.12
k = Kokoro(os.path.join(KIT, "models/kokoro-v1.0.onnx"), os.path.join(KIT, "models/voices-v1.0.bin"))
os.makedirs("audio", exist_ok=True)
lines = json.load(open("script.json"))
GAP = 0.12  # seconds of air between lines (playbook: near-gapless VO)
out, t, meta = [], 0.0, []
for i, line in enumerate(lines):
    samples, sr = k.create(line, voice=voice, speed=speed, lang="en-us")
    # trim leading/trailing silence
    a = np.abs(samples); thr = 0.01
    idx = np.where(a > thr)[0]
    samples = samples[max(0, idx[0] - int(0.02 * sr)): idx[-1] + int(0.05 * sr)]
    sf.write(f"audio/line_{i:02d}.wav", samples, sr)
    meta.append({"i": i, "text": line, "start": round(t, 3), "dur": round(len(samples) / sr, 3)})
    out.append(samples)
    gap = GAP + (0.12 if i in (0, 1, 3, 6, 7) else 0)
    out.append(np.zeros(int(gap * sr), dtype=samples.dtype))
    t += len(samples) / sr + gap
vo = np.concatenate(out)
sf.write("audio/vo_kokoro.wav", vo, sr)
json.dump(meta, open("audio/lines.json", "w"), indent=1)
print(f"{voice} total {len(vo)/sr:.2f}s")
for m in meta: print(m)
