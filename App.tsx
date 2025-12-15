import React, { useState, useEffect } from 'react';
import { Github, Code2, Layers, Book } from 'lucide-react';
import RepoSearch from './components/RepoSearch';
import AnalysisInput from './components/AnalysisInput';
import PlanDisplay from './components/PlanDisplay';
import DocsModal from './components/DocsModal';
import { Repo, GeneratedPlan } from './types';
import { getRepoReadme, getRepoStructure } from './services/github';
import { generatePlan } from './services/gemini';
import { validateConfig } from './config';

enum AppState {
  SEARCH_REPO,
  INPUT_GOALS,
  VIEW_PLAN,
  CONFIG_ERROR
}

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.SEARCH_REPO);
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [configErrors, setConfigErrors] = useState<string[]>([]);

  useEffect(() => {
    const { valid, missing } = validateConfig();
    if (!valid) {
      setConfigErrors(missing);
      setState(AppState.CONFIG_ERROR);
    }
  }, []);

  const handleRepoSelect = (repo: Repo) => {
    setSelectedRepo(repo);
    setState(AppState.INPUT_GOALS);
  };

  const handleAnalyze = async (goal: string, problems: string) => {
    if (!selectedRepo) return;
    setIsAnalyzing(true);
    
    try {
      // 1. Fetch context
      const [readme, structure] = await Promise.all([
        getRepoReadme(selectedRepo.full_name, selectedRepo.default_branch),
        getRepoStructure(selectedRepo.full_name)
      ]);

      // 2. Generate Plan
      const generatedPlan = await generatePlan(
        { name: selectedRepo.full_name, readme, structure },
        goal,
        problems
      );

      setPlan(generatedPlan);
      setState(AppState.VIEW_PLAN);
    } catch (error: any) {
      console.error(error);
      alert(`Failed to generate plan: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setPlan(null);
    setSelectedRepo(null);
    setState(AppState.SEARCH_REPO);
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-100 font-sans selection:bg-emerald-500/30">
      
      {/* Docs Modal */}
      <DocsModal isOpen={showDocs} onClose={() => setShowDocs(false)} />

      {/* Navbar */}
      <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                <Code2 className="h-6 w-6 text-emerald-500" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-300">
                GitArchitect
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-400">
                <button 
                  onClick={() => setShowDocs(true)}
                  className="hover:text-emerald-400 transition-colors flex items-center gap-2"
                >
                  <Book className="w-4 h-4" />
                  Documentation
                </button>
                <div className="w-px h-4 bg-gray-700"></div>
                <div className="flex items-center gap-2">
                    <Github className="w-4 h-4" />
                    <span>v1.0.0</span>
                </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {state === AppState.CONFIG_ERROR && (
          <div className="flex flex-col items-center justify-center pt-20 animate-fade-in">
             <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl max-w-lg w-full text-center shadow-2xl">
                <div className="bg-red-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                    <Layers className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Configuration Required</h2>
                <p className="text-gray-400 mb-6">
                    The application is missing required environment variables.
                </p>
                <div className="bg-gray-950 p-4 rounded-lg border border-gray-800 text-left mb-6">
                    <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-2">Missing Variables</p>
                    <ul className="space-y-1">
                        {configErrors.map(err => (
                            <li key={err} className="text-red-400 font-mono text-sm flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                {err}
                            </li>
                        ))}
                    </ul>
                </div>
                <p className="text-xs text-gray-500">
                    Please set these variables in your environment or <code>.env</code> file and reload.
                </p>
             </div>
          </div>
        )}

        {state === AppState.SEARCH_REPO && (
          <div className="animate-fade-in text-center space-y-8 mt-10">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
                Turn Chaos into <span className="text-emerald-400">Code</span>
              </h1>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
                Import any GitHub repository. Describe your mission. <br className="hidden md:block"/>
                Get a step-by-step architectural battle plan.
              </p>
            </div>
            
            <div className="pt-8">
               <RepoSearch onSelect={handleRepoSelect} />
            </div>

            {/* Feature Grid */}
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto pt-16 text-left">
                <div className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800">
                    <Layers className="w-8 h-8 text-indigo-400 mb-4" />
                    <h3 className="font-bold text-white mb-2">Context Aware</h3>
                    <p className="text-sm text-gray-400">Reads file structures and documentation to understand your specific tech stack.</p>
                </div>
                <div className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800">
                    <Code2 className="w-8 h-8 text-emerald-400 mb-4" />
                    <h3 className="font-bold text-white mb-2">Actionable Steps</h3>
                    <p className="text-sm text-gray-400">Generates precise TODO.md files with file paths and complexity estimates.</p>
                </div>
                <div className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800">
                    <Github className="w-8 h-8 text-purple-400 mb-4" />
                    <h3 className="font-bold text-white mb-2">Interactive</h3>
                    <p className="text-sm text-gray-400">Chat with the planner about specific steps to get code snippets and advice.</p>
                </div>
            </div>
          </div>
        )}

        {state === AppState.INPUT_GOALS && selectedRepo && (
          <AnalysisInput
            repo={selectedRepo}
            onAnalyze={handleAnalyze}
            isAnalyzing={isAnalyzing}
            onBack={() => setState(AppState.SEARCH_REPO)}
          />
        )}

        {state === AppState.VIEW_PLAN && plan && selectedRepo && (
          <div className="animate-fade-in">
             <PlanDisplay plan={plan} repo={selectedRepo} onReset={handleReset} />
          </div>
        )}

      </main>
    </div>
  );
};

export default App;