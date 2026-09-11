import React, { useState, useEffect } from 'react';
import {
  Search,
  Users,
  FolderGit2,
  AlertTriangle,
  FileSpreadsheet,
  X,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { api } from '../../services/api';
import { UserProfile, Project, Alert, DataImportRecord } from '../../types/index';

interface AdminGlobalSearchProps {
  onSelectEntity: (type: 'user' | 'project' | 'alert' | 'dataset', item: any) => void;
}

export const AdminGlobalSearch: React.FC<AdminGlobalSearchProps> = ({ onSelectEntity }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    users: UserProfile[];
    projects: Project[];
    alerts: Alert[];
    datasets: DataImportRecord[];
  } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const data = await api.adminGlobalSearch(query.trim());
        setResults(data);
        setIsOpen(true);
      } catch (err) {
        console.error('Global search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const totalResults =
    (results?.users?.length || 0) +
    (results?.projects?.length || 0) +
    (results?.alerts?.length || 0) +
    (results?.datasets?.length || 0);

  return (
    <div className="relative w-full max-w-xl">
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          id="input-global-admin-search"
          type="text"
          placeholder="Global Admin Search: users, project codes, alerts, datasets..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (results) setIsOpen(true);
          }}
          className="w-full pl-10 pr-9 py-2 text-xs bg-slate-100 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs transition-all"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults(null);
              setIsOpen(false);
            }}
            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Results Dropdown Overlay */}
      {isOpen && query.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 max-h-[480px] overflow-y-auto">
          <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">
              {isSearching ? 'Searching database...' : `${totalResults} matches for "${query}"`}
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 text-[11px]"
            >
              Close
            </button>
          </div>

          <div className="p-3 space-y-4 divide-y divide-slate-100">
            {/* Projects */}
            {results?.projects && results.projects.length > 0 && (
              <div className="pt-2 first:pt-0">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <FolderGit2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Projects ({results.projects.length})</span>
                </div>
                <div className="space-y-1">
                  {results.projects.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        onSelectEntity('project', p);
                        setIsOpen(false);
                      }}
                      className="p-2 rounded-lg hover:bg-indigo-50 cursor-pointer flex items-center justify-between transition-colors group"
                    >
                      <div>
                        <div className="text-xs font-semibold text-slate-800 group-hover:text-indigo-600">
                          {p.project_name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {p.project_code} • {p.sector} • ₹{p.original_cost} Cr
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Users */}
            {results?.users && results.users.length > 0 && (
              <div className="pt-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Users ({results.users.length})</span>
                </div>
                <div className="space-y-1">
                  {results.users.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => {
                        onSelectEntity('user', u);
                        setIsOpen(false);
                      }}
                      className="p-2 rounded-lg hover:bg-indigo-50 cursor-pointer flex items-center justify-between transition-colors group"
                    >
                      <div>
                        <div className="text-xs font-semibold text-slate-800 group-hover:text-indigo-600">
                          {u.full_name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {u.email} • <span className="font-medium text-slate-700">{u.role}</span>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alerts */}
            {results?.alerts && results.alerts.length > 0 && (
              <div className="pt-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Alerts ({results.alerts.length})</span>
                </div>
                <div className="space-y-1">
                  {results.alerts.map((a) => (
                    <div
                      key={a.id}
                      onClick={() => {
                        onSelectEntity('alert', a);
                        setIsOpen(false);
                      }}
                      className="p-2 rounded-lg hover:bg-indigo-50 cursor-pointer flex items-center justify-between transition-colors group"
                    >
                      <div>
                        <div className="text-xs font-semibold text-slate-800 group-hover:text-indigo-600">
                          [{a.severity}] {a.alert_type}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">{a.message}</div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Datasets */}
            {results?.datasets && results.datasets.length > 0 && (
              <div className="pt-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600" />
                  <span>Datasets ({results.datasets.length})</span>
                </div>
                <div className="space-y-1">
                  {results.datasets.map((d) => (
                    <div
                      key={d.id}
                      onClick={() => {
                        onSelectEntity('dataset', d);
                        setIsOpen(false);
                      }}
                      className="p-2 rounded-lg hover:bg-indigo-50 cursor-pointer flex items-center justify-between transition-colors group"
                    >
                      <div>
                        <div className="text-xs font-semibold text-slate-800 group-hover:text-indigo-600">
                          {d.file_name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {d.records_count} records • {d.data_source}
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isSearching && totalResults === 0 && (
              <div className="p-6 text-center text-slate-400 text-xs">
                No matching records found across users, projects, alerts, or datasets.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
