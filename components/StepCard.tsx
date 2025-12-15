import React, { useState, useRef, useEffect } from 'react';
import { Step, ChatMessage } from '../types';
import { MessageSquare, ChevronDown, ChevronUp, Send, Code, FileCode } from 'lucide-react';
import { askStepQuestion } from '../services/gemini';

interface StepCardProps {
  step: Step;
  repoName: string;
}

const StepCard: React.FC<StepCardProps> = ({ step, repoName }) => {
  const [expanded, setExpanded] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showChat && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, showChat]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loadingChat) return;

    const userMsg: ChatMessage = { role: 'user', content: input, timestamp: Date.now() };
    const newHistory = [...chatHistory, userMsg];
    setChatHistory(newHistory);
    setInput('');
    setLoadingChat(true);

    const responseText = await askStepQuestion(step, newHistory, repoName);
    
    setChatHistory(prev => [...prev, { role: 'model', content: responseText, timestamp: Date.now() }]);
    setLoadingChat(false);
  };

  const getComplexityColor = (c: string) => {
    switch (c) {
      case 'Low': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Medium': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'High': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default: return 'bg-gray-700 text-gray-300';
    }
  };

  return (
    <div className={`border transition-all duration-300 rounded-xl overflow-hidden ${expanded ? 'border-emerald-500/50 bg-gray-900 shadow-lg shadow-emerald-900/10' : 'border-gray-800 bg-gray-900/50 hover:border-gray-700'}`}>
      
      {/* Header */}
      <div 
        className="p-5 flex items-start gap-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${expanded ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-400'}`}>
          {step.id}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4">
             <h3 className={`text-lg font-semibold ${expanded ? 'text-white' : 'text-gray-300'}`}>{step.title}</h3>
             <span className={`px-2 py-0.5 rounded text-xs border ${getComplexityColor(step.complexity)}`}>
               {step.complexity}
             </span>
          </div>
          <p className="text-gray-400 text-sm mt-1 line-clamp-2">{step.description}</p>
        </div>

        <button className="text-gray-500 hover:text-white transition-colors">
          {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-800/50 bg-gray-950/30">
          <div className="pt-4 space-y-4">
            
            {/* Rationale */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Rationale</h4>
              <p className="text-gray-300 text-sm leading-relaxed">{step.rationale}</p>
            </div>

            {/* Technical Details */}
            <div className="bg-gray-950 rounded-lg p-4 border border-gray-800">
              <h4 className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Code className="w-3 h-3" /> Technical Implementation
              </h4>
              <p className="text-gray-300 text-sm leading-relaxed font-mono whitespace-pre-wrap">{step.technicalDetails}</p>
            </div>

            {/* Files */}
            {step.affectedFiles.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                   <FileCode className="w-3 h-3" /> Affected Files
                </h4>
                <div className="flex flex-wrap gap-2">
                  {step.affectedFiles.map((file, idx) => (
                    <span key={idx} className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded border border-gray-700 font-mono">
                      {file}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-4 flex items-center gap-3">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowChat(!showChat); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showChat ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              >
                <MessageSquare className="w-4 h-4" />
                {showChat ? 'Close Discussion' : 'Ask about this step'}
              </button>
            </div>

            {/* Chat Section */}
            {showChat && (
              <div className="mt-4 bg-gray-950 border border-gray-800 rounded-xl overflow-hidden animate-fade-in">
                <div className="h-64 overflow-y-auto p-4 space-y-4">
                  {chatHistory.length === 0 && (
                    <p className="text-center text-gray-600 text-sm py-8">Ask me anything about how to implement this step!</p>
                  )}
                  {chatHistory.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-gray-800 text-gray-200 rounded-bl-none'}`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {loadingChat && (
                    <div className="flex justify-start">
                      <div className="bg-gray-800 rounded-2xl rounded-bl-none px-4 py-3">
                        <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <form onSubmit={handleSendMessage} className="p-3 bg-gray-900 border-t border-gray-800 flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask a question..."
                    className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button 
                    type="submit" 
                    disabled={!input.trim() || loadingChat}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

// Helper for chat loader
const Loader2 = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

export default StepCard;
