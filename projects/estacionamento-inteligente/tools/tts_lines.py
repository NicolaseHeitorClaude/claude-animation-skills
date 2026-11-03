# Generate one wav per narration sentence with Kokoro (pt-br). Writes audio/line_XX.wav + audio/lines_raw.json
import json, sys, os, numpy as np, soundfile as sf, espeakng_loader
from kokoro_onnx import Kokoro, EspeakConfig
KIT = os.path.realpath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "kit"))
voice = sys.argv[1] if len(sys.argv) > 1 else "pm_alex"
speed = float(sys.argv[2]) if len(sys.argv) > 2 else 1.0
k = Kokoro(f"{KIT}/models/kokoro-v1.0.onnx", f"{KIT}/models/voices-v1.0.bin",
           espeak_config=EspeakConfig(lib_path=espeakng_loader.get_library_path(), data_path=espeakng_loader.get_data_path()))
lines = json.load(open("script.json")); meta = []
for i, L in enumerate(lines):
    s, sr = k.create(L["text"], voice=voice, speed=speed, lang="pt-br")
    a = np.abs(s); idx = np.where(a > 0.01)[0]
    s = s[max(0, idx[0] - int(.02 * sr)): idx[-1] + int(.08 * sr)]
    sf.write(f"audio/line_{i:02d}.wav", s, sr)
    meta.append({"i": i, "scene": L["scene"], "dur": round(len(s) / sr, 3), "sr": sr})
    print(i, L["scene"], meta[-1]["dur"])
json.dump({"voice": voice, "speed": speed, "lines": meta}, open("audio/lines_raw.json", "w"), indent=1)
