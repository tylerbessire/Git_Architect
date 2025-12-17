import React, { useState, useEffect } from 'react';
import { Github, Code2, Layers, Book, LogOut, Loader2, Search } from 'lucide-react';
import RepoSearch from './components/RepoSearch';
import AnalysisInput from './components/AnalysisInput';
import PlanDisplay from './components/PlanDisplay';
import DocsModal from './components/DocsModal';
import ApiKeySetup from './components/ApiKeySetup';
import { Repo, GeneratedPlan } from './types';
import { getRepoReadme, getRepoStructure, getRepoTree } from './services/github';
import { generatePlan, generatePlanEnhanced, performDeepResearch } from './services/gemini';
import { hasValidConfig, clearSettings } from './config';

enum AppState {
  SETUP_REQUIRED,
  SEARCH_REPO,
  INPUT_GOALS,
  VIEW_PLAN
}

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.SETUP_REQUIRED);
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingStage, setLoadingStage] = useState<string>('');
  const [showDocs, setShowDocs] = useState(false);

  // Check for valid config (API Key or Local Setup) on mount
  useEffect(() => {
    if (hasValidConfig()) {
      setState(AppState.SEARCH_REPO);
    } else {
      setState(AppState.SETUP_REQUIRED);
    }
  }, []);

  const handleKeySetupComplete = () => {
    setState(AppState.SEARCH_REPO);
  };

  const handleClearSettings = () => {
    if (window.confirm("Are you sure you want to reset your AI settings?")) {
      clearSettings();
      window.location.reload();
    }
  };

  const handleRepoSelect = (repo: Repo) => {
    setSelectedRepo(repo);
    setState(AppState.INPUT_GOALS);
  };

  const handleAnalyze = async (goal: string, problems: string) => {
    if (!selectedRepo) return;
    setIsAnalyzing(true);

    try {
      // Use enhanced two-stage analysis with security scanning
      const USE_ENHANCED_ANALYSIS = true;

      if (USE_ENHANCED_ANALYSIS) {
        // Enhanced workflow with full tree analysis and security

        // 1. Fetch repository tree
        setLoadingStage('Scanning Repository Structure...');
        const repoTree = await getRepoTree(selectedRepo.full_name, selectedRepo.default_branch);

        // 2. Perform Deep Research
        setLoadingStage('Performing Research & Safety Analysis...');
        const researchNotes = await performDeepResearch(selectedRepo.full_name, goal, problems);

        // 3. Generate Plan with Two-Stage Analysis
        setLoadingStage('Analyzing Codebase & Planning...');
        const generatedPlan = await generatePlanEnhanced(
          selectedRepo.full_name,
          repoTree.tree,
          goal,
          problems,
          researchNotes,
          selectedRepo.default_branch
        );

        setPlan(generatedPlan);
        setState(AppState.VIEW_PLAN);
      } else {
        // Legacy workflow (kept for fallback)
        setLoadingStage('Scanning Repository...');
        const [readme, structure] = await Promise.all([
          getRepoReadme(selectedRepo.full_name, selectedRepo.default_branch),
          getRepoStructure(selectedRepo.full_name)
        ]);

        setLoadingStage('Performing Research & Safety Analysis...');
        const researchNotes = await performDeepResearch(selectedRepo.full_name, goal, problems);

        setLoadingStage('Architecting Solution...');
        const generatedPlan = await generatePlan(
          { name: selectedRepo.full_name, readme, structure },
          goal,
          problems,
          researchNotes
        );

        setPlan(generatedPlan);
        setState(AppState.VIEW_PLAN);
      }
    } catch (error: any) {
      console.error(error);
      alert(`Failed to generate plan: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
      setLoadingStage('');
    }
  };

  const handlePlanUpdate = (newPlan: GeneratedPlan) => {
      setPlan(newPlan);
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
                  <span className="hidden sm:inline">Documentation</span>
                </button>
                
                {state !== AppState.SETUP_REQUIRED && (
                  <>
                    <div className="w-px h-4 bg-gray-700"></div>
                    <button 
                      onClick={handleClearSettings}
                      className="hover:text-red-400 transition-colors flex items-center gap-2"
                      title="Reset Settings"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </>
                )}
                
                <div className="w-px h-4 bg-gray-700 hidden sm:block"></div>
                <div className="hidden sm:flex items-center gap-2">
                    <Github className="w-4 h-4" />
                    <span>v1.1.0</span>
                </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {state === AppState.SETUP_REQUIRED && (
          <ApiKeySetup onComplete={handleKeySetupComplete} />
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
                    <Search className="w-8 h-8 text-indigo-400 mb-4" />
                    <h3 className="font-bold text-white mb-2">Deep Research</h3>
                    <p className="text-sm text-gray-400">Gemini 3.0 Pro scours the web for best practices. (Disabled in Local Mode)</p>
                </div>
                <div className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800">
                    <Code2 className="w-8 h-8 text-emerald-400 mb-4" />
                    <h3 className="font-bold text-white mb-2">Safety First</h3>
                    <p className="text-sm text-gray-400">Every plan prioritizes backward compatibility and includes rollback strategies.</p>
                </div>
                <div className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800">
                    <Layers className="w-8 h-8 text-purple-400 mb-4" />
                    <h3 className="font-bold text-white mb-2">Interactive Architect</h3>
                    <p className="text-sm text-gray-400">Refactor the plan on the fly. Works with both Cloud and Local LLMs.</p>
                </div>
            </div>
          </div>
        )}

        {/* Loading Overlay for Analysis */}
        {isAnalyzing && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-fade-in">
                <Loader2 className="w-16 h-16 text-emerald-500 animate-spin mb-6" />
                <h2 className="text-2xl font-bold text-white mb-2">{loadingStage}</h2>
                <p className="text-gray-400 text-sm">Generating intelligent architecture...</p>
            </div>
        )}

        {state === AppState.INPUT_GOALS && selectedRepo && !isAnalyzing && (
          <AnalysisInput
            repo={selectedRepo}
            onAnalyze={handleAnalyze}
            isAnalyzing={isAnalyzing}
            onBack={() => setState(AppState.SEARCH_REPO)}
          />
        )}

        {state === AppState.VIEW_PLAN && plan && selectedRepo && !isAnalyzing && (
          <div className="animate-fade-in">
             <PlanDisplay 
                plan={plan} 
                repo={selectedRepo} 
                onReset={handleReset} 
                onUpdatePlan={handlePlanUpdate}
             />
          </div>
        )}

      </main>
    </div>
  );
};

export default App;