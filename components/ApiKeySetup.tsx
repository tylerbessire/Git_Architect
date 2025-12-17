import React, { useState } from 'react';
import { Key, ShieldCheck, ArrowRight, ExternalLink, Server, Laptop } from 'lucide-react';
import { saveSettings, AiProvider } from '../config';

interface ApiKeySetupProps {
  onComplete: () => void;
}

const ApiKeySetup: React.FC<ApiKeySetupProps> = ({ onComplete }) => {
  const [provider, setProvider] = useState<AiProvider>('gemini');
  
  // Gemini State
  const [apiKey, setApiKey] = useState('');
  
  // Local State
  const [baseUrl, setBaseUrl] = useState('http://localhost:11434/v1');
  const [model, setModel] = useState('llama3');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (provider === 'gemini' && !apiKey.trim()) return;
    if (provider === 'local' && (!baseUrl.trim() || !model.trim())) return;

    saveSettings({
        provider,
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim(),
        model: model.trim()
    });
    
    onComplete();
  };

  return (
    <div className="flex flex-col items-center justify-center pt-20 animate-fade-in px-4">
      <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl max-w-lg w-full shadow-2xl">
        
        {/* Header Icon */}
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 border transition-colors ${provider === 'gemini' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500'}`}>
          {provider === 'gemini' ? <Key className="w-8 h-8" /> : <Server className="w-8 h-8" />}
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2 text-center">Setup Intelligence</h2>
        <p className="text-gray-400 mb-8 text-center leading-relaxed text-sm">
          Choose your AI provider. Use Google's powerful cloud models or run completely locally with Ollama.
        </p>

        {/* Tabs */}
        <div className="flex p-1 bg-gray-950 rounded-xl border border-gray-800 mb-6">
            <button
                onClick={() => setProvider('gemini')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${provider === 'gemini' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
            >
                <Key className="w-4 h-4" /> Google Gemini
            </button>
            <button
                onClick={() => setProvider('local')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${provider === 'local' ? 'bg-indigo-900/50 text-indigo-100 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
            >
                <Laptop className="w-4 h-4" /> Local LLM
            </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          
          {provider === 'gemini' ? (
            <div className="animate-fade-in">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                Google GenAI API Key
                </label>
                <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                required
                />
                 <div className="mt-4 text-center">
                    <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center justify-center gap-1 transition-colors"
                    >
                    Get a free API Key <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Base URL (OpenAI Compatible)
                    </label>
                    <input
                        type="text"
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        placeholder="http://localhost:11434/v1"
                        className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                        required
                    />
                    <p className="text-xs text-gray-500 mt-1">Default for Ollama is <code>http://localhost:11434/v1</code></p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Model Name
                    </label>
                    <input
                        type="text"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder="llama3"
                        className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                        required
                    />
                </div>
            </div>
          )}

          <button
            type="submit"
            className={`w-full font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                provider === 'gemini' 
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/20'
            }`}
          >
            Start Architecting <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-800">
           <div className="flex items-start gap-3">
             <ShieldCheck className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
             <p className="text-xs text-gray-500">
               {provider === 'gemini' 
                 ? "Your API key is stored locally in your browser and sent directly to Google." 
                 : "Requests are sent directly to your local endpoint. No data leaves your machine."}
             </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeySetup;