import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Mic, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ChoicePortal({ onSave, onOralPreview, loading }) {
  const [tempSelection, setTempSelection] = useState(null);

  const options = [
    {
      id: 'exam',
      title: 'End-Sem Evaluation',
      description: 'I want to get my 5% of oral defense grade from the end sem exam performance.',
      icon: <FileText className="w-8 h-8" />,
    },
    {
      id: 'oral',
      title: 'Live Oral Defense',
      description: 'I want to take a live oral defense session for the 5% grade.',
      icon: <Mic className="w-8 h-8" />,
    }
  ];

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <h1 className="text-4xl font-black tracking-tight text-gray-900 mb-4">
          Select Your Evaluation Path
        </h1>
        <p className="text-gray-500 font-medium text-lg">
          This decision is final and cannot be changed once submitted.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-8">
        {options.map((opt) => (
          <motion.button
            key={opt.id}
            whileHover={!loading ? { scale: 1.02 } : {}}
            whileTap={!loading ? { scale: 0.98 } : {}}
            onClick={() => {
              if (opt.id === 'oral') {
                onOralPreview();
              } else {
                setTempSelection(opt.id);
              }
            }}
            disabled={loading}
            className={`
              relative text-left p-8 rounded-3xl border-2 transition-all group
              ${tempSelection === opt.id 
                ? 'border-indigo-600 bg-indigo-50/30 ring-4 ring-indigo-50' 
                : 'border-gray-100 bg-white hover:border-indigo-200 shadow-sm'}
            `}
          >
            <div className={`
              w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-colors
              ${tempSelection === opt.id ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600'}
            `}>
              {opt.icon}
            </div>

            <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">
              {opt.title}
            </h3>
            <p className="text-gray-500 font-medium leading-relaxed">
              {opt.description}
            </p>
          </motion.button>
        ))}
      </div>

      {tempSelection && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-16 flex flex-col items-center"
        >
            <button 
              onClick={() => onSave(tempSelection)}
              disabled={loading}
              className="px-20 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-100 disabled:text-gray-400 rounded-2xl font-black text-xs uppercase tracking-[.25em] transition-all shadow-2xl hover:-translate-y-1 mb-4 text-white"
            >
              {loading ? 'Transmitting...' : 'Commit Configuration'}
            </button>
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-xl border border-amber-100">
               <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">
                 ⚠️ This decision is final and cannot be modified after submission.
               </p>
            </div>
        </motion.div>
      )}
    </div>
  );
}
