import { GoogleGenAI, Type, Modality } from "@google/genai";

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getStructuredWeatherData = async (location: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Get the current weather and a 5-day forecast for ${location}. Use Celsius.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          locationName: { type: Type.STRING },
          currentTempCelsius: { type: Type.NUMBER },
          weatherDescription: { type: Type.STRING },
          weatherIcon: {
            type: Type.STRING,
            enum: ['SUNNY', 'CLOUDY', 'PARTLY_CLOUDY', 'RAIN', 'SNOW', 'STORM', 'FOG'],
          },
          dailyForecast: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                day: { type: Type.STRING },
                highTemp: { type: Type.NUMBER },
                lowTemp: { type: Type.NUMBER },
                description: { type: Type.STRING },
              },
              required: ['day', 'highTemp', 'lowTemp', 'description'],
            },
          },
        },
        required: ['locationName', 'currentTempCelsius', 'weatherDescription', 'weatherIcon', 'dailyForecast'],
      },
    },
  });

  return JSON.parse(response.text);
};

export const getWeatherSummary = async (location: string, lat?: number, lon?: number) => {
  const config = {
      tools: [{ googleMaps: {} }],
      ...(lat && lon && { toolConfig: { retrievalConfig: { latLng: { latitude: lat, longitude: lon } } } })
  };

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Provide a friendly and informative weather summary for ${location}. Suggest some weather-appropriate activities nearby.`,
    config: config,
  });

  return {
    summary: response.text,
    sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [],
  };
};

export const askWeatherQuestion = async (question: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: question,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  return {
    answer: response.text,
    sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [],
  };
};

export const generateSpeech = async (text: string) => {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say this in a friendly, clear voice: ${text}` }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Kore' },
                },
            },
        },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        throw new Error("No audio data received from API.");
    }
    return base64Audio;
};


export const editImage = async (base64Image: string, mimeType: string, prompt: string) => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                {
                    inlineData: {
                        data: base64Image,
                        mimeType: mimeType,
                    },
                },
                {
                    text: prompt,
                },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part && part.inlineData) {
        return part.inlineData.data;
    }
    throw new Error("No edited image was generated.");
};
