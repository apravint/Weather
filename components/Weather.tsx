import React, { useState, useCallback, useEffect } from 'react';
import { getStructuredWeatherData, getWeatherSummary, askWeatherQuestion, generateSpeech } from '../services/geminiService';
import type { WeatherData, GroundingChunk } from '../types';
import { SunnyIcon, CloudyIcon, PartlyCloudyIcon, RainIcon, SnowIcon, StormIcon, FogIcon, LocationMarkerIcon, VolumeUpIcon, LoadingSpinner } from './icons';

const weatherIconMap = {
    'SUNNY': <SunnyIcon className="w-24 h-24 text-yellow-400" />,
    'CLOUDY': <CloudyIcon className="w-24 h-24 text-gray-400" />,
    'PARTLY_CLOUDY': <PartlyCloudyIcon className="w-24 h-24 text-blue-300" />,
    'RAIN': <RainIcon className="w-24 h-24 text-blue-500" />,
    'SNOW': <SnowIcon className="w-24 h-24 text-white" />,
    'STORM': <StormIcon className="w-24 h-24 text-yellow-500" />,
    'FOG': <FogIcon className="w-24 h-24 text-gray-500" />,
};

// Audio decoding utilities
export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


const Weather: React.FC = () => {
    const [location, setLocation] = useState<string>('');
    const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
    const [summary, setSummary] = useState<string>('');
    const [summarySources, setSummarySources] = useState<GroundingChunk[]>([]);
    const [question, setQuestion] = useState<string>('');
    const [answer, setAnswer] = useState<string>('');
    const [answerSources, setAnswerSources] = useState<GroundingChunk[]>([]);
    const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
    const [error, setError] = useState<string | null>(null);
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

    useEffect(() => {
        setAudioContext(new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 }));
    }, []);

    const handleFetch = useCallback(async (loc: string, lat?: number, lon?: number) => {
        setLoading({ weather: true, summary: true });
        setError(null);
        setWeatherData(null);
        setSummary('');
        setSummarySources([]);
        setAnswer('');
        setAnswerSources([]);

        try {
            const data = await getStructuredWeatherData(loc);
            setWeatherData(data);

            const summaryRes = await getWeatherSummary(data.locationName, lat, lon);
            setSummary(summaryRes.summary);
            setSummarySources(summaryRes.sources);
        } catch (err) {
            console.error(err);
            setError('Failed to fetch weather data. Please try another location.');
        } finally {
            setLoading({ weather: false, summary: false });
        }
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (location) {
            handleFetch(location);
        }
    };

    const handleGeolocation = () => {
        if (navigator.geolocation) {
            setLoading({ weather: true, summary: true });
            setError('Getting your location...');
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    handleFetch(`${latitude},${longitude}`, latitude, longitude);
                },
                () => {
                    setError('Unable to retrieve your location. Please enable location services or search for a city.');
                    setLoading({});
                }
            );
        } else {
            setError('Geolocation is not supported by your browser.');
        }
    };
    
    const handleAskQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!question || !weatherData) return;
        
        setLoading(prev => ({ ...prev, question: true }));
        setAnswer('');
        setAnswerSources([]);
        try {
            const fullQuestion = `Regarding the weather in ${weatherData.locationName}, ${question}`;
            const res = await askWeatherQuestion(fullQuestion);
            setAnswer(res.answer);
            setAnswerSources(res.sources);
        } catch (err) {
            console.error(err);
            setError('Failed to get an answer from Gemini.');
        } finally {
            setLoading(prev => ({ ...prev, question: false }));
        }
    };

    const handleTTS = async () => {
        if (!summary || !audioContext) return;
        setLoading(prev => ({...prev, tts: true}));
        try {
            const base64Audio = await generateSpeech(summary);
            const audioData = decode(base64Audio);
            const audioBuffer = await decodeAudioData(audioData, audioContext, 24000, 1);
            
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.start();

        } catch (err) {
            console.error(err);
            setError("Failed to generate audio.");
        } finally {
            setLoading(prev => ({...prev, tts: false}));
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-8">
            <h1 className="text-4xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-300">Weather Dashboard</h1>
            
            <div className="max-w-xl mx-auto space-y-4">
                <form onSubmit={handleSearch} className="flex gap-2">
                    <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="E.g., Paris, France"
                        className="flex-grow bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                    />
                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition disabled:opacity-50" disabled={loading.weather || !location}>
                        Search
                    </button>
                </form>
                 <button onClick={handleGeolocation} className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg transition disabled:opacity-50" disabled={loading.weather}>
                    <LocationMarkerIcon className="w-5 h-5"/>
                    Use My Location
                </button>
            </div>

            {error && !loading.weather && <p className="text-center text-yellow-400">{error}</p>}
            {(loading.weather || loading.summary) && <div className="flex justify-center items-center gap-2"><LoadingSpinner className="w-8 h-8"/> <p>Fetching weather data...</p></div>}
            
            {weatherData && (
                <div className="space-y-8">
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-lg text-center">
                        <h2 className="text-3xl font-semibold">{weatherData.locationName}</h2>
                        <div className="flex items-center justify-center my-4">
                            {weatherIconMap[weatherData.weatherIcon] || <CloudyIcon className="w-24 h-24 text-gray-400" />}
                            <p className="text-7xl font-bold ml-4">{Math.round(weatherData.currentTempCelsius)}°C</p>
                        </div>
                        <p className="text-xl capitalize text-gray-300">{weatherData.weatherDescription}</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {weatherData.dailyForecast.map(day => (
                            <div key={day.day} className="bg-white/10 backdrop-blur-md rounded-lg p-4 text-center">
                                <p className="font-bold">{day.day}</p>
                                <p className="text-lg">{Math.round(day.highTemp)}° / {Math.round(day.lowTemp)}°</p>
                                <p className="text-sm text-gray-400 capitalize">{day.description}</p>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-lg space-y-4">
                        <h3 className="text-2xl font-bold">AI Weather Summary</h3>
                        {loading.summary ? <div className="flex items-center gap-2"><LoadingSpinner className="w-5 h-5"/><span>Generating summary...</span></div> :
                        <>
                            <p className="text-gray-300 whitespace-pre-wrap">{summary}</p>
                            <button onClick={handleTTS} disabled={loading.tts || !summary} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition disabled:opacity-50">
                                {loading.tts ? <LoadingSpinner className="w-5 h-5"/> : <VolumeUpIcon className="w-5 h-5" />}
                                Read Aloud
                            </button>
                            {summarySources.length > 0 && (
                                <div className="pt-2">
                                    <p className="text-sm font-semibold">Sources:</p>
                                    <ul className="list-disc list-inside text-sm">
                                        {summarySources.map((source, i) => (
                                            <li key={i}>
                                                <a href={source.maps?.uri || source.web?.uri} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                                                    {source.maps?.title || source.web?.title || 'Source'}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </>
                        }
                    </div>

                     <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-lg space-y-4">
                        <h3 className="text-2xl font-bold">Ask a Follow-up Question</h3>
                        <form onSubmit={handleAskQuestion} className="flex flex-col sm:flex-row gap-2">
                            <input
                                type="text"
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                placeholder="e.g., Are there any weather warnings?"
                                className="flex-grow bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                            />
                            <button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg transition disabled:opacity-50" disabled={loading.question || !question}>
                                Ask Gemini
                            </button>
                        </form>
                        {loading.question && <div className="flex items-center gap-2"><LoadingSpinner className="w-5 h-5"/><span>Thinking...</span></div>}
                        {answer && (
                            <div className="pt-2">
                                <p className="text-gray-300 whitespace-pre-wrap">{answer}</p>
                                {answerSources.length > 0 && (
                                     <div className="pt-2 mt-2 border-t border-gray-700">
                                        <p className="text-sm font-semibold">Sources:</p>
                                        <ul className="list-disc list-inside text-sm">
                                            {answerSources.map((source, i) => (
                                                <li key={i}>
                                                    <a href={source.web?.uri} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                                                        {source.web?.title || 'Source'}
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Weather;
