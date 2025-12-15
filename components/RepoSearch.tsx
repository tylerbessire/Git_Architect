import React, { useState, useEffect } from 'react';
import { Search, Github, Loader2, ArrowRight } from 'lucide-react';
import { Repo } from '../types';
import { searchRepos } from '../services/github';

interface RepoSearchProps {
  onSelect: (repo: Repo) => void;
}

const RepoSearch: React.FC<RepoSearchProps> = ({ onSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 600);
    return () => clearTimeout(timer);
  }, [query]);

  // Search effect
  useEffect(() => {
    let active = true;

    const fetchRepos = async () => {
      if (debouncedQuery.length < 3) {
        if (active) {
            setResults([]);
            setError(null);
        }
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const data = await searchRepos(debouncedQuery);
        if (active) {
            setResults(data);
        }
      } catch (err: any) {
        if (active) {
            setError(err.message || 'Failed to search repositories');
            setResults([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchRepos();
    
    return () => { active = false; };
  }, [debouncedQuery]);

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Trigger update immediately if user clicks button
    setDebouncedQuery(query);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <form onSubmit={handleManualSearch} className="relative flex gap-2">
        <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
            type="text"
            className="block w-full pl-10 pr-3 py-3 border border-gray-700 rounded-xl leading-5 bg-gray-900 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-all"
            placeholder="Search GitHub repositories (e.g., 'facebook/react')"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            />
            {loading && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Loader2 className="h-5 w-5 text-emerald-500 animate-spin" />
            </div>
            )}
        </div>
        <button 
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2 shadow-lg shadow-emerald-900/20"
        >
            Search
        </button>
      </form>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-4 rounded-xl text-center animate-fade-in">
            {error}
        </div>
      )}

      {results.length > 0 && !error && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-2xl max-h-96 overflow-y-auto animate-fade-in">
          {results.map((repo) => (
            <button
              key={repo.id}
              onClick={() => onSelect(repo)}
              className="w-full text-left px-4 py-4 hover:bg-gray-800 transition-colors border-b border-gray-800 last:border-0 flex items-start gap-4 group"
            >
              <img src={repo.owner.avatar_url} alt={repo.owner.login} className="w-12 h-12 rounded-full border border-gray-700" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                    <p className="text-base font-semibold text-emerald-400 truncate group-hover:text-emerald-300">
                        {repo.full_name}
                    </p>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 flex items-center gap-1 bg-gray-950 px-2 py-1 rounded-full border border-gray-800">
                            ★ {(repo.stargazers_count / 1000).toFixed(1)}k
                        </span>
                        <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                            Import
                        </span>
                    </div>
                </div>
                <p className="text-sm text-gray-400 line-clamp-2">
                  {repo.description || "No description provided."}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
      
      {results.length === 0 && query.length > 2 && !loading && !error && (
        <div className="text-center text-gray-500 text-sm py-4 bg-gray-900/50 rounded-xl border border-gray-800/50">
            No repositories found matching "{query}".
        </div>
      )}
    </div>
  );
};

export default RepoSearch;