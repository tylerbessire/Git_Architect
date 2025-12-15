import React from 'react';
import { ArrowRight, FileText, AlertTriangle } from 'lucide-react';
import { Repo } from '../types';

interface AnalysisInputProps {
  repo: Repo;
  onAnalyze: (goal: string, problems: string) => void;
  isAnalyzing: boolean;
  onBack: () => void;
}

const AnalysisInput: React.FC<AnalysisInputProps> = ({ repo, onAnalyze, isAnalyzing, onBack }) => {
  const [goal, setGoal] = React.useState('');
  const [problems, setProblems] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim() || !problems.trim()) return;
    onAnalyze(goal, problems);
  };

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="text-sm text-gray-500 hover:text-white transition-colors">
              &larr; Change Repo
          </button>
          <div className="flex items-center gap-2 text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full text-xs font-medium border border-emerald-400/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Selected: {repo.full_name}
          </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-xl">
        <h2 className="text-2xl font-bold text-white mb-2">Define Your Mission</h2>
        <p className="text-gray-400 mb-8 text-sm">Tell us what you want to achieve with this codebase and what's standing in your way.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-500" />
              What is your Goal?
            </label>
            <textarea
              required
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full h-32 bg-gray-950 border border-gray-700 rounded-xl p-4 text-gray-200 placeholder-gray-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:outline-none transition-all resize-none"
              placeholder="e.g., I want to add a real-time notification system using WebSockets..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Current Problems / Context
            </label>
            <textarea
              required
              value={problems}
              onChange={(e) => setProblems(e.target.value)}
              className="w-full h-32 bg-gray-950 border border-gray-700 rounded-xl p-4 text-gray-200 placeholder-gray-600 focus:ring-2 focus:ring-amber-500 focus:border-transparent focus:outline-none transition-all resize-none"
              placeholder="e.g., The current architecture is monolithic, and I'm not sure where to hook into the event loop. Also, we are using an old version of..."
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isAnalyzing || !goal || !problems}
              className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl text-white font-semibold transition-all ${
                isAnalyzing || !goal || !problems
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-900/20'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing Repository...
                </>
              ) : (
                <>
                  Generate Implementation Plan <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AnalysisInput;
