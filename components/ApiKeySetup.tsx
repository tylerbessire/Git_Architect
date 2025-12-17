import React, { useState } from 'react';
import { Key, ShieldCheck, ArrowRight, ExternalLink } from 'lucide-react';
import { storeApiKey } from '../config';

interface ApiKeySetupProps {
  onComplete: () => void;
}

const ApiKeySetup: React.FC<ApiKeySetupProps> = ({ onComplete }) => {
  const [inputKey, setInputKey] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) return;
    storeApiKey(inputKey.trim());
    onComplete();
  };

  return (
    <div className="flex flex-col items-center justify-center pt-20 animate-fade-in px-4">
      <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl max-w-lg w-full shadow-2xl">
        <div className="bg-emerald-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
          <Key className="w-8 h-8 text-emerald-500" />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2 text-center">Setup AI Access</h2>
        <p className="text-gray-400 mb-8 text-center leading-relaxed">
          GitArchitect uses Google's Gemini models to analyze your code. 
          To get started, please provide your own API Key.
        </p>

        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Google GenAI API Key
            </label>
            <input
              type="password"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-mono text-sm"
              required
            />
          </div>

          <button
            type="submit"
            disabled={!inputKey.trim()}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Architecting <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-800">
           <div className="flex items-start gap-3">
             <ShieldCheck className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
             <p className="text-xs text-gray-500">
               Your API key is stored locally in your browser's storage and is sent directly to Google's servers. It never passes through our backend.
             </p>
           </div>
           
           <div className="mt-4 text-center">
             <a 
               href="https://aistudio.google.com/app/apikey" 
               target="_blank" 
               rel="noopener noreferrer"
               className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center justify-center gap-1 transition-colors"
             >
               Get a free API Key <ExternalLink className="w-3 h-3" />
             </a>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeySetup;