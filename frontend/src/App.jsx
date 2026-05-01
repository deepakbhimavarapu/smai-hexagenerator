import { useState, useEffect } from 'react';
import axios from 'axios';
import StudentBookingGrid from './components/StudentBookingGrid';
import ChoicePortal from './components/ChoicePortal';
import { 
  LayoutDashboard, 
  Library, 
  BookOpen, 
  User, 
  LogOut,
  ChevronRight,
  Settings,
  CheckCircle2
} from 'lucide-react';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [preference, setPreference] = useState(null); // Saved in DB
  const [view, setView] = useState(null); // Local UI view ('portal', 'exam_confirm', 'oral_grid')
  const [prefLoading, setPrefLoading] = useState(false);

  // Set global axios base URL from env
  axios.defaults.baseURL = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let code = params.get('code');
    
    if (!code) {
      const path = window.location.pathname.slice(1);
      if (path && path.length > 20) {
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
      const statusRes = await axios.get(`/api/student/grid?email=${res.data.email}`);
      const savedPref = statusRes.data.preference;
      setPreference(savedPref);
      // Determine initial view
      if (savedPref === 'exam') setView('exam_saved');
      else if (savedPref === 'oral') setView('oral_grid');
      else setView('portal');
    } catch (err) {
      console.error('Verification failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreference = async (pref) => {
    setPrefLoading(true);
    try {
      await axios.post('/api/student/preference', { email: user.email, preference: pref });
      setPreference(pref);
      setView(pref === 'exam' ? 'exam_saved' : 'oral_grid');
    } catch (err) {
      alert('Failed to save preference');
    } finally {
      setPrefLoading(false);
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
        {view === 'portal' && (
          <ChoicePortal 
            onSave={handleSavePreference} 
            onOralPreview={() => setView('oral_grid')}
            loading={prefLoading}
          />
        )}

        {view === 'exam_saved' && (
          <div className="max-w-2xl mx-auto text-center py-20 px-6 bg-white rounded-[40px] border border-indigo-100 shadow-2xl shadow-indigo-100/50">
            <div className="w-20 h-20 bg-indigo-600 text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-indigo-200">
              <CheckCircle2 size={40} />
            </div>
            <div className="inline-block px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 border border-indigo-100">
              Preference Saved
            </div>
            <h2 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">End-Sem Evaluation Path</h2>
            <p className="text-gray-500 font-medium text-lg leading-relaxed max-w-md mx-auto">
              Your preference has been finalized. You will be evaluated based on your end-semester examination performance.
            </p>
          </div>
        )}

        {view === 'oral_grid' && (
          <div className="space-y-6">
             {preference === 'oral' && (
               <div className="flex items-center gap-3 px-6 py-3 bg-indigo-50 border border-indigo-100 rounded-2xl w-fit">
                  <CheckCircle2 className="text-indigo-600" size={18} />
                  <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">Preference Saved: Live Oral Defense</span>
               </div>
             )}
             {/* Back to selection only if not saved yet */}
             {!preference && (
               <button 
                 onClick={() => setView('portal')}
                 className="text-xs font-black text-gray-400 uppercase tracking-widest hover:text-indigo-600 flex items-center gap-2 transition-colors mb-4"
               >
                 <ChevronRight className="rotate-180" size={14} /> Back to Evaluation Choice
               </button>
             )}
             <StudentBookingGrid 
               user={user} 
               isFinalized={preference === 'oral'} 
               onFinalize={() => handleSavePreference('oral')}
             />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
