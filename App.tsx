
import React, { useState, useEffect, useRef } from 'react';
import { Theme, Thought } from './types';
import { ThemeToggle } from './components/ThemeToggle';
import { ThoughtList } from './components/ThoughtList';
import { enhanceThought } from './services/geminiService';
import { storage } from './services/storageService';

// --- Helpers ---
const compressImage = (base64: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const maxDim = 1024; 
      let width = img.width;
      let height = img.height;

      if (width > height && width > maxDim) {
        height *= maxDim / width;
        width = maxDim;
      } else if (height > maxDim) {
        width *= maxDim / height;
        height = maxDim;
      }

      canvas.width = width;
      canvas.height = height;
      if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Compress to JPEG 70% quality to save space
          resolve(canvas.toDataURL('image/jpeg', 0.7)); 
      } else {
          resolve(base64);
      }
    };
    img.onerror = () => resolve(base64);
  });
};

// --- Auth Form Component ---
interface AuthFormProps {
  mode: 'LOGIN' | 'REGISTER';
  onSubmit: (name: string) => void;
  onToggleMode: () => void;
  registeredUsers: string[];
  onCancel?: () => void;
}

const AuthForm: React.FC<AuthFormProps> = ({ mode, onSubmit, onToggleMode, registeredUsers, onCancel }) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const name = input.trim();
    
    if (!name) {
      setError('Please enter a name.');
      return;
    }

    if (mode === 'REGISTER') {
      if (registeredUsers.some(u => u.toLowerCase() === name.toLowerCase())) {
        setError('Username already taken.');
        return;
      }
      onSubmit(name);
    } else {
      const isRegistered = registeredUsers.some(u => u.toLowerCase() === name.toLowerCase());
      const isAdminName = name === 'Leslie Lyu';
      
      if (!isRegistered && !isAdminName) {
        setError('User not registered.');
        return;
      }
      onSubmit(name);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="flex items-center justify-center gap-4 mb-6">
        <button 
            type="button"
            onClick={() => { if(mode !== 'LOGIN') { setError(''); onToggleMode(); }}}
            className={`text-lg font-semibold transition-colors ${mode === 'LOGIN' ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
        >
            Login
        </button>
        <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700"></div>
        <button 
            type="button"
            onClick={() => { if(mode !== 'REGISTER') { setError(''); onToggleMode(); }}}
            className={`text-lg font-semibold transition-colors ${mode === 'REGISTER' ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
        >
            Register
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={mode === 'REGISTER' ? "Choose a username" : "Enter your username"}
          className="w-full px-4 py-3 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-teal-500 outline-none mb-2 transition-all"
        />
        
        {error && (
            <p className="text-xs text-red-500 mb-4 animate-in slide-in-from-top-1">{error}</p>
        )}
        {!error && <div className="h-4 mb-4"></div>}

        <div className="flex justify-end gap-2">
          {onCancel && (
             <button
               type="button"
               onClick={onCancel}
               className="px-4 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
             >
               Cancel
             </button>
          )}
          <button
            type="submit"
            className="w-full px-4 py-2 text-sm font-bold bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 rounded-lg hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-transform active:scale-95"
          >
            {mode === 'REGISTER' ? 'Create Account' : 'Continue'}
          </button>
        </div>
      </form>
    </div>
  );
};

// --- Main App Component ---
const App: React.FC = () => {
  // --- App State ---
  const [theme, setTheme] = useState<Theme>(Theme.DARK);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useAI, setUseAI] = useState(false);
  
  // --- Auth State ---
  const [user, setUser] = useState<string>('Visitor');
  const [registeredUsers, setRegisteredUsers] = useState<string[]>([]);
  
  // --- View State ---
  const [showLanding, setShowLanding] = useState(true);
  const [landingAuthMode, setLandingAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  
  // Modal (for in-app login)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = user === 'Leslie Lyu';

  // --- Initialization Effects ---
  useEffect(() => {
    // Theme (Small data, LocalStorage is fine)
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    setTheme(savedTheme || Theme.DARK);

    // User Session
    const savedUser = localStorage.getItem('user');
    if (savedUser && savedUser !== 'Visitor') {
      setUser(savedUser);
      setShowLanding(false);
    }

    // Load Large Data from IndexedDB
    const loadData = async () => {
        try {
            const [savedThoughts, savedUsers] = await Promise.all([
                storage.get<Thought[]>('thoughts'),
                storage.get<string[]>('registered_users')
            ]);
            
            if (savedThoughts) setThoughts(savedThoughts);
            if (savedUsers) setRegisteredUsers(savedUsers);
        } catch (e) {
            console.error("Failed to load data", e);
        } finally {
            setIsDataLoaded(true);
        }
    };
    loadData();
  }, []);

  // --- Persist Effects ---
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (isDataLoaded) {
        storage.set('thoughts', thoughts).catch(console.error);
    }
  }, [thoughts, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded) {
        storage.set('registered_users', registeredUsers).catch(console.error);
    }
  }, [registeredUsers, isDataLoaded]);

  // --- Handlers ---
  const toggleTheme = () => setTheme(p => p === Theme.DARK ? Theme.LIGHT : Theme.DARK);

  const handleAuthSuccess = (name: string) => {
    const isRegistering = (showLanding && landingAuthMode === 'REGISTER') || (isModalOpen && modalMode === 'REGISTER');
    
    if (isRegistering) {
        const newUsers = [...registeredUsers, name];
        setRegisteredUsers(newUsers);
        // Effect will trigger save
    }

    setUser(name);
    localStorage.setItem('user', name);
    
    setShowLanding(false);
    setLandingAuthMode('LOGIN');
    setIsModalOpen(false);
  };

  const handleLogout = () => {
    setUser('Visitor');
    localStorage.setItem('user', 'Visitor');
    setShowLanding(true);
    setLandingAuthMode('LOGIN');
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = async () => {
            const rawBase64 = reader.result as string;
            try {
                const compressed = await compressImage(rawBase64);
                setSelectedImage(compressed);
            } catch (e) {
                console.warn("Compression failed, using raw", e);
                setSelectedImage(rawBase64);
            }
        };
        reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddThought = async () => {
    if (!inputText.trim() && !selectedImage) return;

    setIsSubmitting(true);
    const id = crypto.randomUUID();
    const timestamp = Date.now();
    let content = inputText.trim();
    let tags: string[] = [];
    let aiEnhanced = false;

    if (useAI && content) {
      try {
        const result = await enhanceThought(content);
        content = result.polished;
        tags = result.tags;
        aiEnhanced = true;
      } catch (error) {
        console.error("AI Enhancement failed silently", error);
      }
    }

    const newThought: Thought = { 
        id, 
        content, 
        timestamp, 
        tags, 
        aiEnhanced,
        image: selectedImage || undefined
    };
    setThoughts(prev => [newThought, ...prev]);
    setInputText('');
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsSubmitting(false);
    setUseAI(false);
    
    setTimeout(() => { textareaRef.current?.focus(); }, 100);
  };

  const handleDeleteThought = (id: string) => setThoughts(prev => prev.filter(t => t.id !== id));
  const handleEditThought = (id: string, newContent: string) => setThoughts(prev => prev.map(t => t.id === id ? { ...t, content: newContent } : t));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) handleAddThought();
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  // --- Render: Landing View ---
  if (showLanding) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-300 relative">
        <div className="absolute top-6 right-6">
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        </div>

        <div className="w-full max-w-md flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
            <h1 className="text-5xl font-bold text-zinc-900 dark:text-zinc-100 mb-2 tracking-tight">MindStream</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mb-10">Document your journey.</p>

            <div className="w-full bg-white dark:bg-zinc-900/50 p-6 rounded-2xl shadow-xl border border-zinc-100 dark:border-zinc-800/50">
                 <AuthForm 
                    mode={landingAuthMode} 
                    onSubmit={handleAuthSuccess}
                    registeredUsers={registeredUsers}
                    onToggleMode={() => setLandingAuthMode(prev => prev === 'LOGIN' ? 'REGISTER' : 'LOGIN')}
                 />
                 <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-center">
                    <button 
                        onClick={() => setShowLanding(false)}
                        className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                    >
                        Continue as Visitor
                    </button>
                 </div>
            </div>
        </div>
      </div>
    );
  }

  // --- Render: Main App ---
  return (
    <div className="min-h-screen transition-colors duration-300 relative">
      <div className="max-w-2xl mx-auto px-6 py-12">
        
        {/* Header */}
        <header className="flex justify-between items-start mb-12">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              MindStream
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
              Document your journey.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                if (user !== 'Visitor') {
                    handleLogout();
                } else {
                    setIsModalOpen(true);
                    setModalMode('LOGIN');
                }
              }}
              className="text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
            >
              {user === 'Visitor' ? 'Login' : `Hi, ${user.split(' ')[0]} (Logout)`}
            </button>
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          </div>
        </header>

        {/* Input Section - Admin Only */}
        {isAdmin && (
          <section className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="relative group">
              <div className={`absolute -inset-0.5 rounded-2xl blur opacity-20 transition duration-500 group-hover:opacity-40 ${theme === Theme.DARK ? 'bg-teal-600' : 'bg-teal-400'}`}></div>
              <div className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-xl dark:shadow-none border border-zinc-100 dark:border-zinc-800 p-4">
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  placeholder="What's on your mind?"
                  className="w-full bg-transparent resize-none outline-none text-zinc-800 dark:text-zinc-200 text-lg placeholder-zinc-400 dark:placeholder-zinc-600 min-h-[80px]"
                  rows={1}
                  disabled={isSubmitting}
                />

                {/* Image Preview */}
                {selectedImage && (
                  <div className="mt-3 relative w-24 h-24 group/preview">
                    <img src={selectedImage} alt="Selected" className="w-full h-full object-cover rounded-lg border border-zinc-200 dark:border-zinc-700" />
                    <button 
                      onClick={clearImage}
                      className="absolute -top-2 -right-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full p-0.5 hover:scale-110 transition-transform"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                      </svg>
                    </button>
                  </div>
                )}
                
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/50">
                  <div className="flex items-center gap-2">
                     <button
                        onClick={() => setUseAI(!useAI)}
                        disabled={isSubmitting}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
                          useAI 
                            ? 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800' 
                            : 'bg-transparent text-zinc-500 hover:bg-zinc-100 dark:text-zinc-500 dark:hover:bg-zinc-800 border-transparent'
                        }`}
                        title="Uses Gemini to polish grammar and auto-tag"
                     >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                          <path fillRule="evenodd" d="M9.661 2.237a.531.531 0 01.678 0 11.947 11.947 0 007.078 2.749.53.53 0 01.479.425c.069.352.16.7.272 1.043a.53.53 0 01-.043.492 12.05 12.05 0 00-3.91 6.938 12.05 12.05 0 005.461 5.96.53.53 0 01.117.695c-.283.42-.593.82-.926 1.197a.53.53 0 01-.728.07 11.95 11.95 0 00-5.22-1.85 11.95 11.95 0 00-5.22 1.85.53.53 0 01-.728-.07c-.333-.377-.643-.777-.926-1.197a.53.53 0 01.117-.695 12.05 12.05 0 005.461-5.96 12.05 12.05 0 00-3.91-6.938.53.53 0 01-.043-.492c.112-.343.203-.69.272-1.043a.53.53 0 01.479-.425 11.947 11.947 0 007.078-2.749z" clipRule="evenodd" />
                        </svg>
                        {useAI ? 'AI Enhanced' : 'Enhance'}
                     </button>

                     {/* Image Upload Button */}
                     <input 
                       type="file" 
                       accept="image/*" 
                       ref={fileInputRef} 
                       className="hidden" 
                       onChange={handleImageSelect}
                     />
                     <button
                       onClick={() => fileInputRef.current?.click()}
                       disabled={isSubmitting}
                       className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-transparent text-zinc-500 hover:bg-zinc-100 dark:text-zinc-500 dark:hover:bg-zinc-800 transition-all duration-200"
                       title="Upload image"
                     >
                       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                         <path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-2.69l-2.22-2.219a.75.75 0 00-1.06 0l-1.91 1.909.47.47a.75.75 0 11-1.06 1.06L6.53 8.091a.75.75 0 00-1.06 0l-2.97 2.97zM12 7a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
                       </svg>
                       Image
                     </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleAddThought}
                      disabled={(!inputText.trim() && !selectedImage) || isSubmitting}
                      className={`
                        rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200
                        ${(!inputText.trim() && !selectedImage) || isSubmitting
                          ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                          : 'bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 active:scale-95 shadow-md'
                        }
                      `}
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing
                        </span>
                      ) : 'Log Thought'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* List Section */}
        <main>
          {!isDataLoaded ? (
              <div className="text-center py-20 opacity-50">Loading...</div>
          ) : (
              <ThoughtList 
                thoughts={thoughts} 
                onDelete={handleDeleteThought} 
                onEdit={handleEditThought}
                isAdmin={isAdmin} 
              />
          )}
        </main>
      </div>

      {/* Modal for in-app login */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl p-6 w-full max-w-sm border border-zinc-200 dark:border-zinc-800 scale-100 animate-in zoom-in-95 duration-200">
             <AuthForm 
                mode={modalMode} 
                onSubmit={handleAuthSuccess} 
                registeredUsers={registeredUsers}
                onToggleMode={() => setModalMode(p => p === 'LOGIN' ? 'REGISTER' : 'LOGIN')}
                onCancel={() => setIsModalOpen(false)}
             />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
