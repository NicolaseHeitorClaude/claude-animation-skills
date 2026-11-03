# Place each narration sentence at its scheduled time -> audio/vo.wav, web/timeline.js (sentences + subtitle cues), legendas.srt
import json, re, numpy as np, soundfile as sf
T = json.load(open("timing.json")); lines = json.load(open("script.json")); raw = json.load(open("audio/lines_raw.json"))["lines"]
SR = raw[0]["sr"]; N = int(T["total"] * SR); vo = np.zeros(N, dtype=np.float32)
MAXC = 78  # max chars per cue (two lines of ~39)
FUNC = set("e o a os as de da do das dos um uma que com em no na nos nas para por se ao".split())
def split_cues(text):
    if len(text) <= MAXC: return [text]
    w = text.split(); best = None
    for k in range(1, len(w)):
        a, b = " ".join(w[:k]), " ".join(w[k:])
        cost = abs(len(a) - len(b)) * 0.5 + (0 if re.search(r"[,:;.]$", w[k-1]) else 22) + (30 if w[k-1].lower().strip(",") in FUNC else 0)
        if len(a) > MAXC: cost += 40
        if len(b) > MAXC: cost += 40
        if best is None or cost < best[0]: best = (cost, a, b)
    return split_cues(best[1]) + split_cues(best[2])
def weight(s): return len(s) + 6 * len(re.findall(r",", s)) + 9 * len(re.findall(r"[:;.?!]", s))
LINES, CUES = [], []
for i, (L, st) in enumerate(zip(lines, T["starts"])):
    a, sr = sf.read(f"audio/line_{i:02d}.wav", dtype="float32"); assert sr == SR
    j = int(st * SR); vo[j:j + len(a)] += a[:N - j]
    en = st + len(a) / SR
    if i + 1 < len(T["starts"]): assert en < T["starts"][i + 1] - 0.15, f"line {i} overlaps next ({en:.2f})"
    LINES.append({"i": i, "scene": L["scene"], "s": round(st, 3), "e": round(en, 3), "text": L["text"]})
    parts = split_cues(L["text"]); tw = sum(weight(p) for p in parts); t = st
    for p in parts:
        d = (en - st) * weight(p) / tw; CUES.append({"s": round(t, 3), "e": round(t + d, 3), "text": p}); t += d
# hold each cue a little after speech, but never into the next one
for k, c in enumerate(CUES):
    nxt = CUES[k + 1]["s"] if k + 1 < len(CUES) else T["total"]
    c["e"] = round(min(c["e"] + 0.35, nxt - 0.05), 3)
sf.write("audio/vo.wav", vo, SR)
open("web/timeline.js", "w").write("const LINES=" + json.dumps(LINES, ensure_ascii=False) + ";\nconst CUES=" + json.dumps(CUES, ensure_ascii=False) + ";\nconst TOTAL=" + str(T["total"]) + ";\n")
def ts(x): h = int(x // 3600); m = int(x % 3600 // 60); s = x % 60; return f"{h:02d}:{m:02d}:{int(s):02d},{int(round((s - int(s)) * 1000)):03d}"
with open("legendas.srt", "w", encoding="utf-8") as f:
    for k, c in enumerate(CUES): f.write(f"{k+1}\n{ts(c['s'])} --> {ts(c['e'])}\n{c['text']}\n\n")
with open("narracao.txt", "w", encoding="utf-8") as f:
    for L in LINES: f.write(f"[{L['s']:6.1f}s - cena {L['scene']}] {L['text']}\n")
print(len(CUES), "cues"); [print(c) for c in CUES]
