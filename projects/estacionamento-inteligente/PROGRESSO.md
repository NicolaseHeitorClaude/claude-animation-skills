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
- [x] Motor 16:9 (web/): lib, chars (Lucas, atendente), env (carros, LCD 16x2, Arduino, sensores), sim (linha do tempo única do sistema: painel, cancela, LEDs, IR, ultrassom, carros), world (maquete vista de cima + vistas laterais), shots (14 planos, cenas 1–7), main (legendas 2 linhas)
- [x] Trilha e efeitos sintetizados (audio.py)
- [x] Trecho de teste 44–65 s conferido (`T0=44 T1=65 bash build.sh`)
- [x] Render completo (`bash build.sh`, ~2 min com 4 workers) e conferência final de quadros

## Entregas
- `estacionamento-inteligente.mp4` — 1920×1080, 30 fps, H.264 + AAC 48 kHz, 115,5 s, legendas incorporadas
- `legendas.srt` — legendas separadas
- `narracao.txt` — texto da narração com tempos

## Lógica do painel (fiel ao CÓDIGO FINAL 2)
Vagas = 7 − (estacionados + em manobra). 3 → 2 quando a cancela abre para Lucas; não muda quando ele estaciona.
Carros D e E: 2 → 1 → LOTADO. Carro C chega: sensor detecta, cancela fica fechada.
Lucas sai da vaga: LED verde, painel continua LOTADO; após concluir a saída: "Vagas: 1"; C entra: LOTADO.

## Versão com voz ElevenLabs (gravação enviada pelo usuário)
- Fonte: `audio_el/narracao_elevenlabs.mp3` (83,5 s, voz "Elvis", eleven_v4), usada sem regeneração nem mudança de velocidade.
- `tools/split_el.py` corta a gravação nas próprias pausas (19 frases; as 19 conferidas amostra a amostra) e cada frase vai para o seu horário de cena.
- Ajuste fino da cena 4: pulso ao Arduino 51,85 s, cancela 53,6–54,9 s, painel 3→2 em 55,9 s.
- Legendas com quebras nas pausas reais: `legendas_elevenlabs.srt`; texto: `narracao_elevenlabs.txt`.
- Saída: `estacionamento-inteligente_voz-elevenlabs.mp4`. Original preservado: `estacionamento-inteligente.mp4`; voz antiga em `audio_kokoro/`.
- Refazer: `VO_RAW=1 SRT=legendas_elevenlabs.srt TXT=narracao_elevenlabs.txt OUT=estacionamento-inteligente_voz-elevenlabs bash build.sh`
