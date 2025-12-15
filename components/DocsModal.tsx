import React from 'react';
import { X, Book, Search, Edit3, Cpu, Download } from 'lucide-react';

interface DocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DocsModal: React.FC<DocsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose}
      />
      <div className="bg-gray-900 border border-gray-800 w-full max-w-2xl rounded-2xl shadow-2xl relative flex flex-col max-h-[80vh] animate-fade-in-up">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                    <Book className="w-5 h-5 text-emerald-500" />
                </div>
                <h2 className="text-xl font-bold text-white">Documentation</h2>
            </div>
            <button 
                onClick={onClose}
                className="text-gray-500 hover:text-white transition-colors"
            >
                <X className="w-6 h-6" />
            </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-8">
            <section>
                <h3 className="text-lg font-semibold text-white mb-4">How to use GitArchitect</h3>
                <div className="space-y-6">
                    
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-emerald-400 font-bold text-sm">1</div>
                        <div>
                            <h4 className="font-medium text-gray-200 flex items-center gap-2">
                                <Search className="w-4 h-4 text-gray-500" /> Find a Repository
                            </h4>
                            <p className="text-sm text-gray-400 mt-1">
                                Search for any public GitHub repository. You can use the full name format (e.g., <code>facebook/react</code>).
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-emerald-400 font-bold text-sm">2</div>
                        <div>
                            <h4 className="font-medium text-gray-200 flex items-center gap-2">
                                <Edit3 className="w-4 h-4 text-gray-500" /> Define Objectives
                            </h4>
                            <p className="text-sm text-gray-400 mt-1">
                                Be specific about what you want to achieve. Are you refactoring? Adding a feature? Debugging? Also list any known problems.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-emerald-400 font-bold text-sm">3</div>
                        <div>
                            <h4 className="font-medium text-gray-200 flex items-center gap-2">
                                <Cpu className="w-4 h-4 text-gray-500" /> Analyze & Plan
                            </h4>
                            <p className="text-sm text-gray-400 mt-1">
                                The AI reads the file structure and README to understand the context. It generates a step-by-step implementation plan.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-emerald-400 font-bold text-sm">4</div>
                        <div>
                            <h4 className="font-medium text-gray-200 flex items-center gap-2">
                                <Download className="w-4 h-4 text-gray-500" /> Execute
                            </h4>
                            <p className="text-sm text-gray-400 mt-1">
                                You can download the plan as a <code>TODO.md</code> file. You can also chat with the AI about specific steps to get code snippets.
                            </p>
                        </div>
                    </div>

                </div>
            </section>

            <section className="bg-amber-500/5 rounded-xl p-4 border border-amber-500/10">
                <h4 className="text-sm font-bold text-amber-500 mb-2">Troubleshooting</h4>
                <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
                    <li>If search fails, the GitHub API rate limit might be exceeded. Wait a few minutes.</li>
                    <li>If analysis fails, ensure your API Key is valid and has sufficient quota.</li>
                </ul>
            </section>
        </div>

      </div>
    </div>
  );
};

export default DocsModal;