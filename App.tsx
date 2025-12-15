import React, { useState } from 'react';
import { Github, Code2, Layers } from 'lucide-react';
import RepoSearch from './components/RepoSearch';
import AnalysisInput from './components/AnalysisInput';
import PlanDisplay from './components/PlanDisplay';
import { Repo, GeneratedPlan } from './types';
import { getRepoReadme, getRepoStructure } from './services/github';
import { generatePlan } from './services/gemini';

enum AppState {
  SEARCH_REPO,
  INPUT_GOALS,
  VIEW_PLAN
}

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.SEARCH_REPO);
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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
    } catch (error) {
      alert("Failed to generate plan. Please check the console or try again.");
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
                <a href="#" className="hover:text-emerald-400 transition-colors">Documentation</a>
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
