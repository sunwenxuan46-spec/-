
import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="pt-8 pb-4 px-6 relative z-50">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-tr from-[#FFB7B2] via-[#D4C1EC] to-[#FFF9AA] rounded-2xl blur-lg opacity-60 group-hover:opacity-100 transition duration-1000"></div>
            <div className="relative w-14 h-14 bg-white rounded-2xl flex items-center justify-center border border-slate-100 shadow-xl">
              <svg className="w-8 h-8 text-[#FFB7B2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tighter italic">
              GAME<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFB7B2] to-[#D4C1EC]">DAILY</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-0.5 italic">Sweet Gaming Hub</p>
          </div>
        </div>
        
        <div className="hidden sm:flex items-center gap-6 bg-white/60 backdrop-blur-xl border border-slate-100 rounded-2xl px-5 py-2.5 shadow-sm">
           <div className="text-right">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Lovely Day</p>
              <p className="text-sm font-black text-[#D4C1EC]">{new Date().toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' })}</p>
           </div>
        </div>
      </div>
    </header>
  );
};
