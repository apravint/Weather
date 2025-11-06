import React, { useState } from 'react';
import Weather from './components/Weather';
import ImageEditor from './components/ImageEditor';

type AppView = 'weather' | 'imageEditor';

const App: React.FC = () => {
    const [view, setView] = useState<AppView>('weather');

    const TabButton: React.FC<{
        targetView: AppView;
        label: string;
        currentView: AppView;
        onClick: (view: AppView) => void;
    }> = ({ targetView, label, currentView, onClick }) => {
        const isActive = targetView === currentView;
        return (
            <button
                onClick={() => onClick(targetView)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                }`}
            >
                {label}
            </button>
        );
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans">
            <div className="container mx-auto max-w-7xl">
                <header className="p-4 flex justify-center">
                    <nav className="bg-gray-800 p-1.5 rounded-lg shadow-md">
                        <TabButton targetView="weather" label="Weather" currentView={view} onClick={setView} />
                        <TabButton targetView="imageEditor" label="Vision Studio" currentView={view} onClick={setView} />
                    </nav>
                </header>
                <main>
                    {view === 'weather' && <Weather />}
                    {view === 'imageEditor' && <ImageEditor />}
                </main>
            </div>
        </div>
    );
};

export default App;
