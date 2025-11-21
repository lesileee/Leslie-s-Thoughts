import React, { useState } from 'react';
import { Thought } from '../types';

interface ThoughtListProps {
  thoughts: Thought[];
  onDelete: (id: string) => void;
  onEdit: (id: string, newContent: string) => void;
  isAdmin: boolean;
}

export const ThoughtList: React.FC<ThoughtListProps> = ({ thoughts, onDelete, onEdit, isAdmin }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const startEdit = (thought: Thought) => {
    setEditingId(thought.id);
    setEditContent(thought.content);
  };

  const saveEdit = (id: string) => {
    if (editContent.trim()) {
      onEdit(id, editContent.trim());
    }
    setEditingId(null);
    setEditContent('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  if (thoughts.length === 0) {
    return (
      <div className="text-center py-20 opacity-50">
        <p className="text-lg font-medium">No thoughts recorded yet.</p>
        <p className="text-sm mt-2">
          {isAdmin ? "Start writing above to clear your mind." : "The author hasn't posted anything yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {thoughts.map((thought) => (
        <div
          key={thought.id}
          className="group relative p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 shadow-sm hover:shadow-md transition-all duration-300"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500">
                {new Date(thought.timestamp).toLocaleString(undefined, {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </span>
              {thought.aiEnhanced && (
                <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                   ✨ AI Polished
                </span>
              )}
            </div>
            
            {isAdmin && editingId !== thought.id && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => startEdit(thought)}
                  className="text-zinc-400 hover:text-teal-500 p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  aria-label="Edit thought"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                    <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                  </svg>
                </button>
                <button
                  onClick={() => onDelete(thought.id)}
                  className="text-zinc-400 hover:text-red-500 p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  aria-label="Delete thought"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {editingId === thought.id ? (
            <div className="mt-1 space-y-3 animate-in fade-in duration-200">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-teal-500/50 outline-none resize-none text-lg font-light"
                rows={Math.max(3, editContent.split('\n').length)}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button 
                  onClick={cancelEdit} 
                  className="px-3 py-1.5 rounded text-sm font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => saveEdit(thought.id)} 
                  className="px-3 py-1.5 rounded text-sm font-medium bg-teal-500 text-white hover:bg-teal-600 transition-colors shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            <p className="text-zinc-800 dark:text-zinc-200 text-lg leading-relaxed whitespace-pre-wrap font-light">
              {thought.content}
            </p>
          )}

          {thought.tags && thought.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {thought.tags.map(tag => (
                <span key={tag} className="text-xs px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};