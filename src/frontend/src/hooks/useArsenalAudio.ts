import { getMissileById } from "../constants/missiles";

const ELEVENLABS_KEY = "sk_268bdf24199cd0a8dbc818de353f3c07f6da3bf93501cd17";
const AUDIO_CACHE = new Map<string, AudioBuffer>();

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

async function generateAndCacheAudio(
  cacheKey: string,
  text: string,
  durationSeconds: number,
): Promise<AudioBuffer | null> {
  if (AUDIO_CACHE.has(cacheKey)) {
    return AUDIO_CACHE.get(cacheKey) ?? null;
  }

  try {
    const response = await fetch(
      "https://api.elevenlabs.io/v1/sound-generation",
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          duration_seconds: durationSeconds,
          prompt_influence: 0.7,
        }),
      },
    );

    if (!response.ok) return null;

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const ctx = getAudioContext();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    AUDIO_CACHE.set(cacheKey, audioBuffer);
    return audioBuffer;
  } catch {
    return null;
  }
}

async function playBuffer(buffer: AudioBuffer): Promise<void> {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
  } catch {
    // silent
  }
}

export function useArsenalAudio() {
  async function playMissileAudio(
    missileId: string,
    event: "launch" | "impact",
  ): Promise<void> {
    try {
      const missile = getMissileById(missileId);
      if (!missile) return;

      const text =
        event === "launch"
          ? missile.audioPrompt.launch
          : missile.audioPrompt.impact;
      const duration = event === "launch" ? 4 : 3;
      const cacheKey = `${missileId}:${event}`;

      const buffer = await generateAndCacheAudio(cacheKey, text, duration);
      if (buffer) {
        await playBuffer(buffer);
      }
    } catch {
      // silent — never crash the game
    }
  }

  return { playMissileAudio };
}
