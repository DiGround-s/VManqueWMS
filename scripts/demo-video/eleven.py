"""ElevenLabs text-to-speech for the demo narration.

The API key is read from scripts/demo-video/.elevenlabs-key (git-ignored) or ELEVENLABS_API_KEY.

  python eleven.py voices                 -> lists the account's voices
  python eleven.py samples                -> one Spanish sample per male voice in video/muestras-voz/elevenlabs/
"""
import json, os, sys, urllib.request, urllib.error
from pathlib import Path

HERE = Path(__file__).parent
API = "https://api.elevenlabs.io/v1"
MODEL = "eleven_multilingual_v2"
SETTINGS = {"stability": 0.45, "similarity_boost": 0.8, "style": 0.15, "use_speaker_boost": True}


def key():
    f = HERE / ".elevenlabs-key"
    k = os.environ.get("ELEVENLABS_API_KEY") or (f.read_text(encoding="utf-8").strip() if f.exists() else "")
    if not k:
        sys.exit("Falta la API key: pégala en scripts/demo-video/.elevenlabs-key")
    return k


def _req(path, body=None):
    req = urllib.request.Request(API + path, data=json.dumps(body).encode() if body else None, headers={"xi-api-key": key(), "Content-Type": "application/json", "Accept": "*/*"}, method="POST" if body else "GET")
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        sys.exit(f"ElevenLabs respondió {e.code}: {e.read().decode(errors='replace')[:400]}")


def voices():
    return json.loads(_req("/voices"))["voices"]


def synth(text, out, voice_id, previous_text=None, next_text=None):
    body = {"text": text, "model_id": MODEL, "voice_settings": SETTINGS, "language_code": "es"}
    if previous_text:
        body["previous_text"] = previous_text
    if next_text:
        body["next_text"] = next_text
    Path(out).write_bytes(_req(f"/text-to-speech/{voice_id}?output_format=mp3_44100_128", body))


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "voices"
    vs = voices()
    if cmd == "voices":
        for v in vs:
            l = v.get("labels", {})
            print(f'{v["voice_id"]}  {v["name"]:24s} {l.get("gender", "?"):7s} {l.get("age", ""):12s} {l.get("accent", ""):14s} {l.get("description", l.get("descriptive", ""))}')
    elif cmd == "samples":
        out = HERE.parent.parent / "video" / "muestras-voz" / "elevenlabs"
        out.mkdir(parents=True, exist_ok=True)
        text = "Hola. Este es VManque, un sistema que reúne los pedidos de Mercado Libre, Falabella y Paris, y guía la bodega desde el teléfono, con luces LED que muestran dónde está cada producto."
        males = [v for v in vs if v.get("labels", {}).get("gender") == "male"][:6]
        for v in males:
            f = out / f'{v["name"]}.mp3'
            synth(text, f, v["voice_id"])
            print("muestra:", f)
