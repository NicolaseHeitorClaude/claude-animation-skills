# Progresso — Vídeo "Sistema Inteligente de Estacionamento com Arduino" (Mundo SENAI)

Motor: skill `stick-figure` (canvas 2D + Playwright + ffmpeg), adaptado para 16:9 1920×1080, pt-BR.
Voz: Kokoro `pm_alex` (pt-br), gerada por frase. Legendas: tempos exatos por frase, divisão proporcional dentro da frase.

## Como continuar
```
cd projects/estacionamento-inteligente
../../kit/.venv/bin/python tools/tts_lines.py pm_alex 1.0   # voz por frase (audio/line_XX.wav)
../../kit/.venv/bin/python tools/timeline.py                # vo.wav, web/timeline.js, legendas.srt
bash build.sh                                               # áudio + render + mux -> estacionamento-inteligente.mp4
```
(Modelos de voz: kit/models via `bash kit/setup.sh --voice`, ou só kokoro-onnx + os 2 arquivos do modelo.)

## Etapas
- [x] Roteiro de narração e tempos (script.json, timing.json)
- [x] Narração gerada + timeline + legendas.srt
