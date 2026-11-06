import { beforeEach, describe, expect, it, vi } from 'vitest';

const { generateContent } = vi.hoisted(() => ({ generateContent: vi.fn() }));

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
  Type: { OBJECT: 'OBJECT', STRING: 'STRING', NUMBER: 'NUMBER', ARRAY: 'ARRAY' },
  Modality: { AUDIO: 'AUDIO', IMAGE: 'IMAGE' },
}));

import {
  askWeatherQuestion,
  editImage,
  generateSpeech,
  getStructuredWeatherData,
  getWeatherSummary,
} from '../services/geminiService';

beforeEach(() => generateContent.mockReset());

describe('getStructuredWeatherData', () => {
  it('parses the JSON text returned by the model and asks for Celsius', async () => {
    const payload = { locationName: 'Paris', currentTempCelsius: 12, dailyForecast: [] };
    generateContent.mockResolvedValue({ text: JSON.stringify(payload) });

    await expect(getStructuredWeatherData('Paris')).resolves.toEqual(payload);

    const call = generateContent.mock.calls[0][0];
    expect(call.contents).toContain('Paris');
    expect(call.contents).toContain('Celsius');
    expect(call.config.responseMimeType).toBe('application/json');
  });

  it('rejects when the model returns invalid JSON', async () => {
    generateContent.mockResolvedValue({ text: 'not json' });
    await expect(getStructuredWeatherData('Paris')).rejects.toThrow();
  });
});

describe('getWeatherSummary', () => {
  const response = {
    text: 'Sunny all day',
    candidates: [{ groundingMetadata: { groundingChunks: [{ maps: { uri: 'u', title: 't' } }] } }],
  };

  it('returns the summary and grounding sources', async () => {
    generateContent.mockResolvedValue(response);
    await expect(getWeatherSummary('Rome')).resolves.toEqual({
      summary: 'Sunny all day',
      sources: [{ maps: { uri: 'u', title: 't' } }],
    });
  });

  it('only sends a latLng retrieval config when coordinates are given', async () => {
    generateContent.mockResolvedValue(response);

    await getWeatherSummary('Rome');
    expect(generateContent.mock.calls[0][0].config.toolConfig).toBeUndefined();

    await getWeatherSummary('Rome', 41.9, 12.5);
    expect(generateContent.mock.calls[1][0].config.toolConfig).toEqual({
      retrievalConfig: { latLng: { latitude: 41.9, longitude: 12.5 } },
    });
  });

  it('falls back to an empty source list', async () => {
    generateContent.mockResolvedValue({ text: 'ok' });
    await expect(getWeatherSummary('Rome')).resolves.toEqual({ summary: 'ok', sources: [] });
  });
});

describe('askWeatherQuestion', () => {
  it('uses Google Search grounding and returns the answer', async () => {
    generateContent.mockResolvedValue({ text: 'Bring an umbrella' });
    const res = await askWeatherQuestion('Will it rain?');
    expect(res).toEqual({ answer: 'Bring an umbrella', sources: [] });
    expect(generateContent.mock.calls[0][0].config.tools).toEqual([{ googleSearch: {} }]);
  });
});

describe('generateSpeech', () => {
  it('returns the base64 audio payload', async () => {
    generateContent.mockResolvedValue({
      candidates: [{ content: { parts: [{ inlineData: { data: 'QUJD' } }] } }],
    });
    await expect(generateSpeech('hello')).resolves.toBe('QUJD');
  });

  it('throws when the API returns no audio', async () => {
    generateContent.mockResolvedValue({ candidates: [] });
    await expect(generateSpeech('hello')).rejects.toThrow('No audio data');
  });
});

describe('editImage', () => {
  it('sends the image and prompt and returns the edited image data', async () => {
    generateContent.mockResolvedValue({
      candidates: [{ content: { parts: [{ inlineData: { data: 'EDITED' } }] } }],
    });
    await expect(editImage('b64', 'image/png', 'make it blue')).resolves.toBe('EDITED');

    const parts = generateContent.mock.calls[0][0].contents.parts;
    expect(parts[0].inlineData).toEqual({ data: 'b64', mimeType: 'image/png' });
    expect(parts[1].text).toBe('make it blue');
  });

  it('throws when no image comes back', async () => {
    generateContent.mockResolvedValue({ candidates: [{ content: { parts: [{ text: 'sorry' }] } }] });
    await expect(editImage('b64', 'image/png', 'x')).rejects.toThrow('No edited image');
  });
});

describe('module initialisation', () => {
  it('throws a clear error when API_KEY is missing', async () => {
    vi.resetModules();
    vi.stubEnv('API_KEY', '');
    await expect(import('../services/geminiService')).rejects.toThrow('API_KEY');
    vi.unstubAllEnvs();
  });
});
