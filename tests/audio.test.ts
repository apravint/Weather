import { describe, expect, it, vi } from 'vitest';
import { decode, decodeAudioData } from '../components/Weather';

describe('decode', () => {
  it('turns base64 into the matching bytes', () => {
    expect(Array.from(decode(btoa('ABC')))).toEqual([65, 66, 67]);
  });

  it('returns an empty array for an empty string', () => {
    expect(decode('').length).toBe(0);
  });
});

describe('decodeAudioData', () => {
  const makeCtx = (channels: Float32Array[]) => {
    const createBuffer = vi.fn((_n: number, _len: number, _rate: number) => ({
      getChannelData: (c: number) => channels[c],
    }));
    return { ctx: { createBuffer } as unknown as AudioContext, createBuffer };
  };

  it('normalises 16-bit PCM samples into the [-1, 1) range', async () => {
    const pcm = new Int16Array([0, 16384, -32768]);
    const out = new Float32Array(3);
    const { ctx, createBuffer } = makeCtx([out]);

    await decodeAudioData(new Uint8Array(pcm.buffer), ctx, 24000, 1);

    expect(createBuffer).toHaveBeenCalledWith(1, 3, 24000);
    expect(Array.from(out)).toEqual([0, 0.5, -1]);
  });

  it('de-interleaves multi-channel audio', async () => {
    const pcm = new Int16Array([16384, -16384, 8192, -8192]); // L R L R
    const left = new Float32Array(2);
    const right = new Float32Array(2);
    const { ctx } = makeCtx([left, right]);

    await decodeAudioData(new Uint8Array(pcm.buffer), ctx, 24000, 2);

    expect(Array.from(left)).toEqual([0.5, 0.25]);
    expect(Array.from(right)).toEqual([-0.5, -0.25]);
  });
});
