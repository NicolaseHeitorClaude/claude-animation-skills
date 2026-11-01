---
name: zach-d-films
description: Makes a 3D cartoon "what if" explainer short (9:16) in the style of Zack D. Films-type videos, entirely in code with three.js. Procedural cartoon people, props and effects, a blue studio sky, slow-motion impacts, a red force-ripple overlay, quick whip cuts and 1 to 3 word captions timed to the voiceover. Use when the user runs /zach-d-films or asks for a 3D cartoon explainer, a "could X stop Y" or "what if" short with characters and props.
---

# /zach-d-films

```
┌──────────────────────┐
│      blue sky        │  procedural 3D people and props, soft shadows
│    ◕‿◕   ⛨           │  depth of field, bloom, light grain
│   /▓▓▓\  ⟶  •        │  slow-motion impacts, sparks, a red force ripple
│     ▓▓               │
│     arrows           │  1-3 word captions, white bold, lower third
└──────────────────────┘
```

A worked example comes with it: `engine/` is a finished 29.5 s short, "Could ancient armour stop a bullet?" (9 shots: a gun shot, a slow-motion bullet flattening on a vest, a sword on chain mail, a mace on plate with a red ripple, an archer, an arrow and a scream, a bullet through two stands). It ships without its voiceover, so you bring a voice. Not affiliated with Zack D. Films; "the style" means the format: a question, a misconception, a "But" twist, building examples and a payoff.

## First use
This skill's folder is the "Base directory" Claude Code shows when it loads it.
```bash
SKILL_DIR="<base directory of this skill>"
KIT=$(python3 -c 'import os,sys;print(os.path.realpath(os.path.join(sys.argv[1],"..","..","kit")))' "$SKILL_DIR")
[ -d "$KIT/node_modules/playwright" ] || bash "$KIT/setup.sh"
[ -x "$KIT/.venv/bin/python" ] && [ -d "$KIT/models" ] || bash "$KIT/setup.sh" --voice   # word timings + free voice, ~1 GB once
PY="$KIT/.venv/bin/python"
```
Needs ffmpeg, Node and Python 3.9+. It renders with WebGL in headless Chrome: about 0.5 s a frame on a Mac, a few minutes for a short. On a machine without a usable GPU, set `GL=swiftshader` (much slower).

## The engine
| File | What |
|---|---|
| `src/shots.js` | **The edit.** `CAPTIONS` (`[start, text, end?]`), `FADES` (dips to black), `DURATION`, one function per shot and the `SHOTS` list (`{start, end, build}`). A shot's `build({makeStage})` returns `{scene, camera, update(t)}`; `update` gets time inside the shot and may return `{dof, bloom, exposure}`. |
| `src/human.js` | `makeHuman(outfit)`: a poseable cartoon person (`'vest'`, `'chainmail'`, `'plate'`, `'knight'`, `'archer'`). `setPose({joint: [x, y, z]})` for `pelvis spine chest neck head lSh lEl lWr rSh rEl rWr lHip lKn lAn rHip rKn rAn` (+ `drop`), `setMouth(0..1)`, `lerpPose(a, b, t)`, `standArmor(kind)`. |
| `src/props.js` | `pistol`, `gunArm`, `bullet` (with a flatten morph), `sword`, `shield`, `mace`, `arrow`, `bow`, `stand`, `glowSprite`, `sparks`, `streak`, `rippleOverlay` (the red force ripple). |
| `src/anim.js` | `kf` keyframes, easings, `range`, `cam(fov)`, `place(camera, pos, look)`, `shake`, `ikArm` (2-bone arm IK so hands can grab things). |
| `src/textures.js`, `src/materials.js` | Canvas-made steel scratches, chain-mail rings, wood, fabric, skin, and the materials built on them. |
| `src/main.js` | Renderer, sky, lighting, depth of field, bloom, grade, and `window.renderAt(t)`. |

## Steps
1. **Script.** Use the user's script, or draft one in the format: "If you…" hook, "some people think…", a "But" twist, examples that build, the mechanism, a payoff that answers the hook. 70 to 90 words for about 30 seconds. Check the facts.
2. **Project.** Copy the engine and link the shared packages:
   ```bash
   cp -R "$SKILL_DIR/engine" <project> && ln -s "$KIT/node_modules" <project>/node_modules
   ```
3. **Voice.** Best is the user's own recording. Otherwise the free Kokoro voice: put the script in `<project>/script.json` (a list of sentences) and run `"$PY" "$SKILL_DIR/../stick-figure/engine/tools/tts_kokoro.py"` from the project (writes `audio/vo_kokoro.wav`). Save the take as `<project>/audio.m4a` (or any name).
4. **Captions.** `"$PY" "$KIT/words.py" <voiceover> script.txt` writes `<voiceover>.words.json`; then `python3 captions.py <voiceover>.words.json` prints `CAPTIONS` and `DURATION` to paste into `src/shots.js`.
5. **Shots.** Plan 8 to 10 shots, cutting on the caption beats, each 2 to 4 s, the mechanism shot longest. Write one function per shot by copying the closest example and changing props, poses and camera, and list them in `SHOTS` with their start and end times. New props go in `props.js` as small functions that return a `THREE.Group`. Keep faces and key props out of the caption band (y about 950 to 1030 of 1280) and away from the frame edges.
6. **Stills.** From the project: `node render.mjs stills 1.5,6.8,14 stills` and look at every shot before a full render.
7. **Render.** `node render.mjs video silent.mp4 30`, then add the voice and scale to 1080x1920:
   ```bash
   ffmpeg -i silent.mp4 -i <voiceover> -map 0:v -map 1:a -vf scale=1080:1920:flags=lanczos -c:v libx264 -crf 17 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest <name>.mp4
   ```
8. **Hand over** the mp4 path.

For a live preview, serve the project (`python3 -m http.server 8000`) and open `index.html` (click to play with `audio.m4a`), or `index.html?t=14.5` for one frame.

## Style
- Bright blue studio sky, soft daylight, metal that reads as metal. Cartoon people are simple shapes with big expressive faces; keep them in proportion with the props.
- Slow motion on the impact, a short camera shake, sparks, bloom on hot things. The red ripple shows force spreading.
- Quick cuts on caption beats; one dip to black on the "But" turn. Captions are white, bold, 1 to 3 words.
