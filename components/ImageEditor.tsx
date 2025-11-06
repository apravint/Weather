import React, { useState, useCallback } from 'react';
import { editImage } from '../services/geminiService';
import { LoadingSpinner } from './icons';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};

const ImageEditor: React.FC = () => {
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [originalImageType, setOriginalImageType] = useState<string | null>(null);
    const [editedImage, setEditedImage] = useState<string | null>(null);
    const [prompt, setPrompt] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setOriginalImage(URL.createObjectURL(file));
            setOriginalImageType(file.type);
            setEditedImage(null); // Clear previous edit
            setError(null);
        }
    };

    const handleGenerate = useCallback(async () => {
        if (!originalImage || !prompt || !originalImageType) {
            setError('Please upload an image and enter a prompt.');
            return;
        }

        setLoading(true);
        setError(null);
        setEditedImage(null);

        try {
            // We need the original file blob to convert to base64
            const response = await fetch(originalImage);
            const blob = await response.blob();
            const file = new File([blob], "image", { type: originalImageType });
            const base64Image = await fileToBase64(file);

            const editedBase64 = await editImage(base64Image, originalImageType, prompt);
            setEditedImage(`data:${originalImageType};base64,${editedBase64}`);

        } catch (err) {
            console.error(err);
            setError('Failed to edit image. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [originalImage, originalImageType, prompt]);

    return (
        <div className="p-4 md:p-8 space-y-8">
            <h1 className="text-4xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">Vision Studio</h1>
            
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 space-y-4">
                    <label htmlFor="image-upload" className="block text-lg font-medium text-gray-300">1. Upload an Image</label>
                    <input
                        id="image-upload"
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                    />
                </div>

                {originalImage && (
                    <>
                        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 space-y-4">
                             <label htmlFor="prompt-input" className="block text-lg font-medium text-gray-300">2. Describe Your Edit</label>
                            <input
                                id="prompt-input"
                                type="text"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="e.g., Add a retro filter, make it black and white"
                                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-pink-500 focus:outline-none transition"
                            />
                        </div>

                        <div className="flex justify-center">
                            <button 
                                onClick={handleGenerate} 
                                disabled={loading || !prompt}
                                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 px-8 rounded-lg transition text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loading && <LoadingSpinner className="w-6 h-6"/>}
                                {loading ? 'Generating...' : 'Generate Edit'}
                            </button>
                        </div>
                    </>
                )}

                {error && <p className="text-center text-red-400">{error}</p>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    {originalImage && (
                        <div className="space-y-2">
                            <h3 className="text-xl font-semibold text-center text-gray-400">Original</h3>
                            <img src={originalImage} alt="Original" className="rounded-lg shadow-lg w-full" />
                        </div>
                    )}
                    
                    {loading && (
                        <div className="space-y-2 flex flex-col items-center justify-center h-full">
                            <LoadingSpinner className="w-16 h-16 text-pink-500"/>
                            <p className="mt-4 text-gray-400">Gemini is thinking...</p>
                        </div>
                    )}
                    
                    {editedImage && !loading && (
                         <div className="space-y-2">
                            <h3 className="text-xl font-semibold text-center text-gray-400">Edited</h3>
                            <img src={editedImage} alt="Edited" className="rounded-lg shadow-lg w-full" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImageEditor;
