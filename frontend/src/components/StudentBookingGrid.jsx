import { useState, useEffect } from 'react'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircle2, 
  Send, 
  Loader2, 
  ChevronRight,
  Lock,
  Clock,
  CalendarDays,
  Target
} from 'lucide-react'

export default function StudentBookingGrid({ user }) {
  const [tasks, setTasks] = useState([]);
  const [dates, setDates] = useState([]);
  const [maxTasks, setMaxTasks] = useState(0);
  const [selections, setSelections] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get(`/api/student/grid?email=${user.email}&t=${Date.now()}`);
      setTasks(res.data.config.tasks || []);
      setMaxTasks(res.data.config.max_tasks_to_select || 0);
      setDates(res.data.dates || []);
      
      if (res.data.selections && res.data.selections.length > 0) {
        const initialSelections = {};
        res.data.selections.forEach(s => {
          initialSelections[s.task_name] = { date: s.date, slot_id: s.slot_id };
        });
        setSelections(initialSelections);
        setIsLocked(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (taskName, dateStr) => {
    if (isLocked) return;
    
    const isNewSelection = !selections[taskName]?.date;
    if (dateStr && isNewSelection && totalSelected >= maxTasks) {
      alert(`You can only select up to ${maxTasks} tasks.`);
      return;
    }

    const newSelections = { ...selections };
    if (!dateStr) {
      delete newSelections[taskName];
    } else {
      newSelections[taskName] = { date: dateStr, slot_id: '' };
    }
    setSelections(newSelections);
  };

  const handleSlotSelect = (taskName, slotId) => {
    if (isLocked) return;
    const currentSelection = selections[taskName];
    if (!currentSelection) return;

    if (slotId) {
      const isNewTaskBeingFinalized = !currentSelection.slot_id;
      if (isNewTaskBeingFinalized && totalSelected >= maxTasks) {
        alert(`You can only select up to ${maxTasks} tasks.`);
        return;
      }

      const isAlreadyUsed = Object.entries(selections).some(([tName, details]) => 
        tName !== taskName && details.date === currentSelection.date && details.slot_id === slotId
      );
      
      if (isAlreadyUsed) {
        alert("This time slot is already assigned to another task.");
        return;
      }
    }

    setSelections({
      ...selections,
      [taskName]: { ...currentSelection, slot_id: slotId }
    });
  };

  const handleSubmit = async () => {
    if (!isTargetMet || isLocked) return;
    setSubmitting(true);
    try {
      const payload = Object.entries(selections)
        .filter(([_, details]) => details.slot_id)
        .map(([task_name, details]) => ({
          task_name, ...details
        }));
      await axios.post('/api/student/book', { email: user.email, selections: payload });
      setSuccess(true);
      setIsLocked(true);
    } catch (err) {
      alert('Transmission failed. Check connection.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center p-20">
      <Loader2 className="animate-spin text-[var(--brand-teal)] w-10 h-10" />
    </div>
  );

  if (success) return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="lecture-card max-w-2xl mx-auto flex-col text-center !py-20 border-teal-100">
      <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-8 text-[var(--brand-teal)]">
        <CheckCircle2 size={48} />
      </div>
      <h2 className="text-3xl font-bold mb-4 tracking-tight">Booking Secured</h2>
      <p className="text-gray-500 font-medium mb-2">Registration finalized for spring 2026.</p>
    </motion.div>
  );

  const totalSelected = Object.values(selections).filter(s => s.slot_id).length;
  const isTargetMet = totalSelected === maxTasks;

  return (
    <div className="space-y-10">
      {/* 1. Header & Status Banner */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-gray-900">Select your slots for Oral Defence</h1>
          <p className="text-sm font-medium text-gray-400 max-w-xl leading-relaxed">
            Note: Slots cannot be changed once submitted. You must select slots for exactly <span className="text-indigo-600 font-bold">{maxTasks} tasks</span>, ensuring all required tasks are included. <span className="text-gray-900 border-b border-gray-100">Bookings must be made at least one day in advance.</span>
          </p>
        </div>

        <div className="flex items-center gap-6 px-6 py-4 bg-gray-50 rounded-2xl border border-gray-100">
          <div className="flex items-center gap-3">
             <Target className={isTargetMet ? 'text-teal-600' : 'text-gray-400'} size={24} />
             <div>
               <p className="text-[10px] font-black uppercase text-gray-400 leading-none mb-1 tracking-widest">Slots Selected</p>
               <p className="text-xl font-black tracking-tighter">{totalSelected} <span className="text-gray-300 font-bold mx-1">/</span> {maxTasks}</p>
             </div>
          </div>
          {isLocked && <div className="h-8 w-[1px] bg-gray-200" />}
          {isLocked && <span className="text-red-500 font-black uppercase tracking-[.2em] text-[10px] bg-white px-3 py-1.5 rounded-lg shadow-sm">READ ONLY</span>}
        </div>
      </header>

      {/* 2. Simplified Task List */}
      <section className={`space-y-3 pb-32 ${isLocked ? 'opacity-70 pointer-events-none' : ''}`}>
          {tasks.map((task, idx) => {
            const current = selections[task.name] || {};
            const availableSlots = dates.find(d => d.date === current.date)?.slots || [];
            const isDone = !!current.slot_id;

            return (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                className={`lecture-card group !py-2.5 !px-6 flex-col md:flex-row !gap-4 md:!gap-8 ${isDone ? 'ring-1 ring-indigo-50 bg-indigo-50/5' : ''}`}
              >
                {/* Task Label - Increased width to 60% to push dropdowns more right */}
                <div className="md:w-3/5 shrink-0">
                  <div className="flex items-center gap-3">
                    <h3 className={`text-sm font-extrabold truncate tracking-tight transition-colors ${isDone ? 'text-indigo-600' : 'text-gray-800'}`}>
                      {String(idx + 1).padStart(2, '0')}. {task.name}
                    </h3>
                    {task.is_mandatory && (
                      <span className="shrink-0 bg-red-50 text-red-500 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border border-red-100">
                        Req
                      </span>
                    )}
                  </div>
                </div>

                {/* Selection Dropdowns moved closer to text */}
                <div className="flex items-center gap-3 shrink-0">
                   <div className="relative">
                      <select 
                        value={current.date || ''}
                        onChange={(e) => handleDateSelect(task.name, e.target.value)}
                        className="appearance-none bg-gray-50/50 border border-gray-100 rounded-lg px-3 py-2 text-[10px] font-black text-gray-600 focus:outline-none focus:border-indigo-600 w-28 cursor-pointer transition-all uppercase tracking-wider"
                      >
                        <option value="">Date</option>
                        {dates.map(d => (
                          <option key={d.date} value={d.date}>{new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()}</option>
                        ))}
                      </select>
                   </div>

                   <div className="relative">
                      <select 
                        value={current.slot_id || ''}
                        onChange={(e) => handleSlotSelect(task.name, e.target.value)}
                        disabled={!current.date}
                        className={`
                          appearance-none rounded-lg px-3 py-2 text-[10px] font-black w-32 cursor-pointer transition-all border uppercase tracking-wider
                          ${!current.date ? 'bg-transparent text-gray-200 border-transparent' : 
                            isDone ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-gray-50 border-gray-100 text-gray-600 focus:border-indigo-600'}
                        `}
                      >
                        <option value="">{current.date ? 'Slot' : '-'}</option>
                        {availableSlots.map(s => {
                           const usedByOther = Object.entries(selections).some(([tName, details]) => 
                            tName !== task.name && details.date === current.date && details.slot_id === s.id
                          );
                          return (
                            <option key={s.id} value={s.id} disabled={usedByOther || s.capacity <= 0} className="text-gray-900 bg-white">
                               {s.start} - {s.end} {!isLocked && (usedByOther ? "(Taken)" : `(Avl: ${s.capacity})`)}
                            </option>
                          );
                        })}
                      </select>
                   </div>
                   
                   <ChevronRight size={14} className={`text-gray-200 transition-all ${isDone ? 'text-indigo-400 translate-x-1' : ''}`} />
                </div>
              </motion.div>
            );
          })}
      </section>

      {/* Persistence Hub */}
      <AnimatePresence>
        {!isLocked && totalSelected > 0 && (
          <motion.div initial={{ y: 50 }} animate={{ y: 0 }} exit={{ y: 50 }} className="fixed bottom-0 left-0 right-0 p-8 flex justify-center z-50">
             <button 
                onClick={handleSubmit}
                disabled={submitting || !isTargetMet}
                className={`
                  px-20 py-4 rounded-2xl font-black text-xs uppercase tracking-[.25em] shadow-2xl transition-all
                  ${!isTargetMet ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:-translate-y-1'}
                `}
              >
                {submitting ? 'Transmitting...' : 'Commit Configuration'}
              </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
