import React, { useState, useEffect } from 'react';
import RegistrationForm from './components/RegistrationForm';
import Dashboard from './components/Dashboard';
import { ViewMode } from './types';
import { storageService } from './services/storage';

// Simple Login Component
const AdminLogin = ({ onLogin, onCancel }: { onLogin: () => void, onCancel: () => void }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'sophie0902') { // Password updated
      onLogin();
    } else {
      setError(true);
      setPassword('');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-xl shadow-lg border border-sage-100 max-w-sm mx-auto mt-12 animate-fade-in-up">
      <div className="w-12 h-12 bg-sage-100 rounded-full flex items-center justify-center mb-4 text-sage-600">
         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
      </div>
      <h3 className="text-xl font-serif text-sage-800 mb-2">管理者登入</h3>
      <p className="text-sm text-sage-500 mb-6 text-center">請輸入密碼以進入老師後台</p>
      
      <form onSubmit={handleSubmit} className="w-full space-y-4">
        <div>
           <input 
             type="password" 
             value={password}
             onChange={(e) => { setPassword(e.target.value); setError(false); }}
             className="w-full px-4 py-2 border border-sage-200 rounded-lg focus:ring-2 focus:ring-sage-400 focus:border-transparent outline-none transition text-center tracking-widest"
             placeholder="輸入密碼"
             autoFocus
           />
           {error && <p className="text-red-500 text-xs mt-2 text-center">密碼錯誤，請重試</p>}
        </div>
        <div className="flex space-x-3 pt-2">
            <button 
              type="button"
              onClick={onCancel}
              className="flex-1 py-2 px-4 border border-sage-200 text-sage-600 rounded-lg hover:bg-sage-50 transition"
            >
              返回
            </button>
            <button 
              type="submit"
              className="flex-1 py-2 px-4 bg-sage-600 text-white rounded-lg hover:bg-sage-700 shadow-md transition"
            >
              登入
            </button>
        </div>
      </form>
    </div>
  );
};

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.STUDENT_FORM);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize storage config (check for shared link params)
  useEffect(() => {
    storageService.initialize();
  }, []);

  const handleRegistrationSubmit = () => {
    // Registrations are now handled inside the form component via storageService
    // We just scroll to top or show success (handled in form)
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavClick = (mode: ViewMode) => {
    if (mode === ViewMode.STUDENT_FORM) {
      setViewMode(mode);
    } else {
      // If clicking dashboard
      if (isAuthenticated) {
        setViewMode(mode);
      } else {
        setViewMode(mode); // Will show login screen because !isAuthenticated
      }
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setViewMode(ViewMode.STUDENT_FORM);
  };

  return (
    <div className="min-h-screen bg-sage-50 flex flex-col font-sans">
      {/* Navigation / Header */}
      <nav className="bg-white shadow-sm border-b border-sage-100 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center cursor-pointer" onClick={() => handleNavClick(ViewMode.STUDENT_FORM)}>
              <span className="text-2xl font-serif text-sage-800 font-bold tracking-tight">Sophie's Yoga</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleNavClick(ViewMode.STUDENT_FORM)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                  viewMode === ViewMode.STUDENT_FORM 
                    ? 'text-sage-900 bg-sage-100' 
                    : 'text-sage-500 hover:text-sage-700'
                }`}
              >
                課程報名
              </button>
              <button
                onClick={() => handleNavClick(ViewMode.INSTRUCTOR_DASHBOARD)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition flex items-center space-x-1 ${
                  viewMode === ViewMode.INSTRUCTOR_DASHBOARD 
                    ? 'text-sage-900 bg-sage-100' 
                    : 'text-sage-500 hover:text-sage-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                <span>{isAuthenticated ? '後台管理' : '管理者登入'}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
        {viewMode === ViewMode.STUDENT_FORM ? (
          <div className="max-w-lg mx-auto">
             <RegistrationForm onSubmit={handleRegistrationSubmit} />
          </div>
        ) : (
          isAuthenticated ? (
            <Dashboard onLogout={handleLogout} />
          ) : (
            <AdminLogin 
              onLogin={() => setIsAuthenticated(true)} 
              onCancel={() => setViewMode(ViewMode.STUDENT_FORM)} 
            />
          )
        )}
      </main>

      {/* Footer */}
      <footer className="bg-sage-100 mt-auto py-6">
        <div className="max-w-4xl mx-auto px-4 text-center text-sage-500 text-sm">
          &copy; {new Date().getFullYear()} Sophie's Yoga. Namaste.
        </div>
      </footer>
    </div>
  );
};

export default App;