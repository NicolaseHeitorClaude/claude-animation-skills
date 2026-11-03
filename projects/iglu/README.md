# Como um iglu é construído — projeto editável

Short 3D vertical (1080×1920, 30 fps, ~61 s) feito com o motor three.js da skill `/zach-d-films`.

| Arquivo | O quê |
|---|---|
| `src/shots.js` | A edição: cronograma de construção (`SCH`), 19 planos (`SHOTS`) e a observação final (`NOTES`). |
| `src/igloo.js` | Geometria do iglu: blocos em espiral contínua sobre a rampa da 1ª fileira, peça de fecho, ventilação, porta, túnel, chão com buracos, materiais de neve. |
| `src/kit2.js` | Serra de neve, estaca e cordão, linhas-guia, setas, neve caindo, lupa das bolsas de ar, peles/saco de dormir, ciclo de caminhada e IK das mãos. |
| `src/human.js` | Personagem (`makeHuman('parka')`: casaco laranja, luvas, botas, gorro). |
| `captions.txt` → `make_captions.py` | Legendas (texto exato da narração, `*x*`/`^x^` = destaque) → `src/captions.js` + `iglu.srt`. |
| `audio/vo.wav`, `audio/vo.words.json` | Narração original (ElevenLabs) e tempos por palavra (Parakeet TDT v3). |
| `sfx.py` | Efeitos sintetizados (serra, passos, encaixes, vento baixo) → `audio/sfx.wav`. |

Refazer:
```bash
ln -s ../../kit/node_modules node_modules        # se faltar
python3 make_captions.py                          # legendas + SRT
../../kit/.venv/bin/python sfx.py                 # efeitos
./stills.sh 5,12,20,30 stills/sheet.jpg           # conferir quadros
./render_par.sh 2 && ./finish.sh                  # vídeo final -> iglu.mp4
```
Sem GPU: `GL=swiftshader` (padrão nos scripts), ~2,5 s por quadro. Pré-visualização: `python3 -m http.server` e abrir `index.html?t=14.5`.
