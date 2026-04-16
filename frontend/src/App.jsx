import { useState, useEffect } from 'react';
import axios from 'axios';
import StudentBookingGrid from './components/StudentBookingGrid';
import { 
  LayoutDashboard, 
  Library, 
  BookOpen, 
  User, 
  LogOut,
  ChevronRight
} from 'lucide-react';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Set global axios base URL from env
  axios.defaults.baseURL = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let code = params.get('code');
    
    // If code is not in query params, check the path (e.g., /gAAAA...)
    if (!code) {
      const path = window.location.pathname.slice(1); // Remove leading slash
      if (path && path.length > 20) { // Simple check to see if it looks like a hex code
        code = path;
      }
    }

    if (code) {
      verifyUser(code);
    } else {
      setLoading(false);
    }
  }, []);

  const verifyUser = async (code) => {
    try {
      const res = await axios.post('/api/verify', { code });
      setUser(res.data);
    } catch (err) {
      console.error('Verification failed', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[var(--brand-teal)] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 text-center">
       <div className="max-w-md">
          <h1 className="text-4xl font-black text-gray-900 mb-6 tracking-tighter">AI 4 SMAI</h1>
          <p className="text-gray-500 font-medium">Please use your personalized link to access the dashboard.</p>
       </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* AI 4 SMAI Header */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-10">
          <h1 className="text-xl font-black tracking-tighter text-[var(--brand-teal)]">AI 4 SMAI</h1>
        </div>

        <div className="flex items-center gap-4 border-l border-gray-100 pl-6">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-gray-900 leading-none mb-1">{user.name || user.email.split('@')[0]}</p>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Student</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-inner ring-4 ring-indigo-50">
            {user.email.charAt(0).toUpperCase()}
          </div>
          <button className="text-gray-400 hover:text-red-500 transition-colors ml-2">
            <LogOut size={20} />
          </button>
        </div>
      </nav>

      <main className="max-w-[1240px] mx-auto px-6 py-12">
        <StudentBookingGrid user={user} />
      </main>
    </div>
  );
}

export default App;
