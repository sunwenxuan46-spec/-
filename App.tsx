
import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { TaskType, Game, AppData, Task, Account, GameEvent } from './types';
import { getGeminiAdvice, AiResponse } from './services/geminiService';
import { uploadToCloud, downloadFromCloud } from './services/syncService';

const STORAGE_KEY = 'game_checkin_data_v8';

const GAME_COLORS = [
  'from-[#FFB7B2] to-[#FF9AA2] shadow-[#FF9AA2]/20 text-rose-950', 
  'from-[#D4C1EC] to-[#B28DFF] shadow-[#B28DFF]/20 text-purple-950', 
  'from-[#FFF9AA] to-[#FDFD96] shadow-[#FDFD96]/20 text-yellow-950', 
  'from-[#B2E2F2] to-[#89CFF0] shadow-[#89CFF0]/20 text-sky-950',    
  'from-[#E2F0CB] to-[#C5E1A5] shadow-[#C5E1A5]/20 text-emerald-950', 
];

const App: React.FC = () => {
  const [data, setData] = useState<AppData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : { games: [], lastUpdate: Date.now() };
  });
  const [activeTab, setActiveTab] = useState(data.games[0]?.id || '');
  const [viewMode, setViewMode] = useState<'dashboard' | 'calendar'>('dashboard');
  const [isEditMode, setIsEditMode] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  // 同步中心状态
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncId, setSyncId] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [generatedSyncCode, setGeneratedSyncCode] = useState('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  // --- 核心逻辑 ---
  const addGame = () => {
    const colorIndex = data.games.length % GAME_COLORS.length;
    const newGame: Game = { id: `g-${Date.now()}`, name: '新游戏', color: GAME_COLORS[colorIndex], accounts: [], events: [] };
    setData(prev => ({ ...prev, games: [...prev.games, newGame] }));
    setActiveTab(newGame.id);
  };
  const deleteGame = (id: string) => { if (confirm('确认删除游戏？')) { setData(prev => { const filtered = prev.games.filter(g => g.id !== id); if (activeTab === id && filtered.length > 0) setActiveTab(filtered[0].id); return { ...prev, games: filtered }; }); } };
  const updateGameName = (id: string, name: string) => { setData(prev => ({ ...prev, games: prev.games.map(g => g.id === id ? { ...g, name } : g) })); };
  const addAccount = () => { setData(prev => ({ ...prev, games: prev.games.map(g => g.id === activeTab ? { ...g, accounts: [...g.accounts, { id: `acc-${Date.now()}`, name: '新号位', tasks: [] }] } : g) })); };
  const deleteAccount = (accId: string) => { setData(prev => ({ ...prev, games: prev.games.map(g => g.id === activeTab ? { ...g, accounts: g.accounts.filter(a => a.id !== accId) } : g) })); };
  const addTask = (accId: string, type: TaskType) => {
    const newTask: Task = { id: `t-${Date.now()}`, label: type === TaskType.DAILY ? '每日任务' : '每周任务', isDone: false, type };
    setData(prev => ({ ...prev, games: prev.games.map(g => g.id === activeTab ? { ...g, accounts: g.accounts.map(a => a.id === accId ? { ...a, tasks: [...a.tasks, newTask] } : a) } : g) }));
  };
  const deleteTask = (accId: string, taskId: string) => { setData(prev => ({ ...prev, games: prev.games.map(g => g.id === activeTab ? { ...g, accounts: g.accounts.map(a => a.id === accId ? { ...a, tasks: a.tasks.filter(t => t.id !== taskId) } : a) } : g) })); };
  const toggleTask = (accId: string, taskId: string) => { if (isEditMode) return; setData(prev => ({ ...prev, games: prev.games.map(g => g.id === activeTab ? { ...g, accounts: g.accounts.map(a => a.id === accId ? { ...a, tasks: a.tasks.map(t => t.id === taskId ? { ...t, isDone: !t.isDone } : t) } : a) } : g) })); };
  
  // 云同步逻辑
  const handleCloudUpload = async () => {
    setIsSyncing(true);
    const code = await uploadToCloud(data);
    if (code) {
      setGeneratedSyncCode(code);
    } else {
      alert('同步失败，请重试');
    }
    setIsSyncing(false);
  };

  const handleCloudDownload = async () => {
    if (!syncId.trim()) return;
    if (!confirm('这会覆盖当前电脑上的所有打卡进度，确定吗？')) return;
    setIsSyncing(true);
    const downloadedData = await downloadFromCloud(syncId.trim());
    if (downloadedData) {
      setData(downloadedData);
      alert('数据已成功从云端恢复！');
      setShowSyncModal(false);
      if (downloadedData.games.length > 0) setActiveTab(downloadedData.games[0].id);
    } else {
      alert('同步码无效或已过期');
    }
    setIsSyncing(false);
  };

  const calendarWeeks = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const weeks: (Date | null)[][] = [];
    let week: (Date | null)[] = Array(firstDay).fill(null);
    for (let i = 1; i <= daysInMonth; i++) {
      week.push(new Date(year, month, i));
      if (week.length === 7) { weeks.push(week); week = []; }
    }
    if (week.length > 0) { while (week.length < 7) week.push(null); weeks.push(week); }
    return weeks;
  }, [currentDate]);

  const allEvents = useMemo(() => data.games.flatMap(g => g.events.map(e => ({ ...e, gameName: g.name, gameColor: g.color }))), [data]);
  const currentGame = useMemo(() => data.games.find(g => g.id === activeTab), [data, activeTab]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow max-w-6xl w-full mx-auto p-4 md:p-6 pb-32 relative z-10">
        
        {/* 导航条与功能键 */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
          <div className="flex bg-white/60 p-1 rounded-2xl border border-slate-100 backdrop-blur-3xl shadow-sm">
            <button onClick={() => setViewMode('dashboard')} className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black transition-all duration-500 ${viewMode === 'dashboard' ? 'bg-[#D4C1EC] text-purple-950 shadow-sm translate-y-[-1px]' : 'text-slate-400 hover:text-slate-600'}`}>
              控制看板
            </button>
            <button onClick={() => setViewMode('calendar')} className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black transition-all duration-500 ${viewMode === 'calendar' ? 'bg-[#D4C1EC] text-purple-950 shadow-sm translate-y-[-1px]' : 'text-slate-400 hover:text-slate-600'}`}>
              全景日历
            </button>
          </div>

          {viewMode === 'dashboard' && (
            <div className="flex flex-wrap gap-2">
              {data.games.map(g => (
                <div key={g.id} className="relative group">
                  {isEditMode ? (
                    <div className="flex items-center bg-white rounded-xl overflow-hidden border border-slate-200 focus-within:ring-1 focus-within:ring-[#FFB7B2]/40 transition-all shadow-sm">
                      <input className="bg-transparent text-xs font-black px-3 py-1.5 w-24 outline-none text-slate-800" value={g.name} onChange={e => updateGameName(g.id, e.target.value)} />
                      <button onClick={() => deleteGame(g.id)} className="px-2 py-1.5 text-rose-400 hover:bg-rose-50 transition-colors">×</button>
                    </div>
                  ) : (
                    <button onClick={() => setActiveTab(g.id)} className={`px-4 py-2 rounded-xl text-xs font-black transition-all duration-500 ${activeTab === g.id ? `bg-gradient-to-r ${g.color} shadow-md scale-105` : 'bg-white/40 text-slate-400 hover:text-slate-600 border border-slate-100 shadow-sm'}`}>
                      {g.name}
                    </button>
                  )}
                </div>
              ))}
              {isEditMode && <button onClick={addGame} className="w-8 h-8 bg-white border border-slate-200 text-[#FFB7B2] rounded-xl flex items-center justify-center hover:shadow-sm transition-all text-lg font-bold">+</button>}
            </div>
          )}
          <div className="flex-grow" />
          <div className="flex gap-2">
            <button onClick={() => setShowSyncModal(true)} className="w-9 h-9 flex items-center justify-center bg-white/60 rounded-xl border border-slate-100 text-[#D4C1EC] hover:text-[#B28DFF] transition-all shadow-sm relative group">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">同步云端</span>
            </button>
            <button onClick={() => setIsEditMode(!isEditMode)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] border transition-all duration-500 ${isEditMode ? 'bg-[#FF9AA2] border-[#FFB7B2] text-rose-950 shadow-sm' : 'bg-white/40 border-slate-200 text-slate-400 hover:text-slate-600'}`}>
              {isEditMode ? '退出管理' : '管理中心'}
            </button>
          </div>
        </div>

        {viewMode === 'dashboard' ? (
          currentGame ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                {currentGame.accounts.map((acc, idx) => (
                  <div key={acc.id} className="bg-white/70 border border-slate-100 rounded-2xl p-4 backdrop-blur-3xl shadow-sm relative overflow-hidden group/acc animate-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${idx * 80}ms` }}>
                    <div className="absolute top-0 right-0 w-20 h-20 bg-[#D4C1EC]/5 blur-[30px] rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-1.5 h-6 bg-gradient-to-b ${currentGame.color} rounded-full`} />
                        {isEditMode ? (
                          <input className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none text-base font-black text-slate-800" value={acc.name} onChange={e => {
                            setData(prev => ({ ...prev, games: prev.games.map(g => g.id === activeTab ? {...g, accounts: g.accounts.map(a => a.id === acc.id ? {...a, name: e.target.value} : a)} : g)}))
                          }} />
                        ) : <h3 className="text-lg font-black tracking-tight text-slate-800">{acc.name}</h3>}
                      </div>
                      {isEditMode && <button onClick={() => deleteAccount(acc.id)} className="text-rose-400 text-[9px] font-black bg-rose-50 px-3 py-1.5 rounded-lg hover:bg-rose-100 transition-all uppercase tracking-widest">删除号位</button>}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {acc.tasks.map(t => (
                        <div key={t.id} className="group/task relative">
                          <div onClick={() => toggleTask(acc.id, t.id)} className={`p-3 rounded-xl border transition-all duration-300 active:scale-95 ${t.isDone ? 'bg-slate-50 opacity-40 border-transparent shadow-none' : 'bg-white border-slate-100 hover:border-[#D4C1EC]/40 shadow-sm cursor-pointer'}`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${t.isDone ? 'bg-[#D4C1EC]' : 'bg-slate-50 group-hover/task:bg-slate-100'}`}>
                                {t.isDone && <svg className="w-4 h-4 text-purple-900" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>}
                              </div>
                              {isEditMode ? (
                                <input className="bg-transparent border-none p-0 outline-none w-full text-xs font-bold text-slate-800" value={t.label} onChange={e => {
                                  setData(prev => ({ ...prev, games: prev.games.map(g => g.id === activeTab ? {...g, accounts: g.accounts.map(a => a.id === acc.id ? {...a, tasks: a.tasks.map(task => task.id === t.id ? {...task, label: e.target.value} : task)} : a)} : g)}))
                                }} />
                              ) : <span className={`text-xs font-bold ${t.isDone ? 'line-through text-slate-300' : 'text-slate-700'}`}>{t.label}</span>}
                              {isEditMode && <button onClick={(e) => { e.stopPropagation(); deleteTask(acc.id, t.id); }} className="ml-auto text-rose-300 text-sm hover:scale-125 transition-transform font-black">×</button>}
                            </div>
                          </div>
                          {t.type === TaskType.WEEKLY && !t.isDone && <div className="absolute -top-1 right-2 bg-[#FFF9AA] text-yellow-900 text-[7px] font-black px-1.5 py-0.5 rounded-full shadow-sm border border-white uppercase">每周</div>}
                        </div>
                      ))}
                      {isEditMode && (
                        <div className="flex gap-2 mt-1">
                          <button onClick={() => addTask(acc.id, TaskType.DAILY)} className="flex-grow py-3 border border-dashed border-slate-200 rounded-xl text-[8px] font-black text-slate-400 hover:text-[#FFB7B2] hover:border-[#FFB7B2]/40 transition-all uppercase tracking-[0.1em]">+ 每日</button>
                          <button onClick={() => addTask(acc.id, TaskType.WEEKLY)} className="flex-grow py-3 border border-dashed border-slate-200 rounded-xl text-[8px] font-black text-slate-400 hover:text-[#D4C1EC] hover:border-[#D4C1EC]/40 transition-all uppercase tracking-[0.1em]">+ 每周</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* 右侧边栏 */}
              <div className="space-y-6">
                <div className="bg-white/70 border border-slate-100 rounded-2xl p-4 shadow-sm">
                   <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">活动日程</h4>
                   <div className="space-y-2">
                     {currentGame.events.length > 0 ? currentGame.events.map(ev => (
                       <div key={ev.id} className="relative bg-slate-50 p-3 rounded-xl border border-slate-100 group transition-all">
                         <div className="text-xs font-black text-slate-700 mb-1 truncate">{ev.title}</div>
                         <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-400">
                           <div className="w-1 h-1 rounded-full bg-[#FFB7B2]" />
                           {ev.startDate} ~ {ev.deadline}
                         </div>
                       </div>
                     )) : <div className="text-center py-6 text-slate-300 text-[9px] font-black tracking-widest uppercase italic">暂无活动</div>}
                   </div>
                </div>
              </div>
            </div>
          ) : null
        ) : (
           <div className="text-center py-20 text-slate-300 font-black tracking-[1em] text-xs italic uppercase">开启游戏打卡之旅</div>
        )}
      </main>

      {/* 同步中心弹窗 */}
      {showSyncModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-white/40 backdrop-blur-md" onClick={() => setShowSyncModal(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-8 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-500">
            <button onClick={() => setShowSyncModal(false)} className="absolute top-6 right-6 text-slate-300 hover:text-slate-600 font-black text-xl">×</button>
            
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-[#D4C1EC]/20 rounded-2xl flex items-center justify-center text-[#D4C1EC]">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">云端同步中心</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Cloud Sync Hub</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* 上传板块 */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">备份到云端</p>
                {generatedSyncCode ? (
                  <div className="space-y-3">
                    <p className="text-[9px] text-rose-400 font-bold">请妥善保存此代码：</p>
                    <div className="bg-white px-3 py-2 rounded-lg border border-[#D4C1EC]/30 flex items-center justify-between">
                      <code className="text-xs font-black text-[#D4C1EC] tracking-tighter">{generatedSyncCode}</code>
                      <button onClick={() => {navigator.clipboard.writeText(generatedSyncCode); alert('已复制')}} className="text-[8px] font-black text-slate-400 hover:text-slate-800">复制</button>
                    </div>
                    <button onClick={() => setGeneratedSyncCode('')} className="w-full py-2 text-[9px] font-black text-slate-400 uppercase">重新生成</button>
                  </div>
                ) : (
                  <button onClick={handleCloudUpload} disabled={isSyncing} className="w-full py-3 bg-gradient-to-r from-[#FFB7B2] to-[#D4C1EC] text-slate-900 text-xs font-black rounded-xl shadow-sm hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
                    {isSyncing ? '同步中...' : '生成同步码'}
                  </button>
                )}
              </div>

              {/* 下载板块 */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">从云端恢复</p>
                <div className="flex gap-2">
                  <input className="flex-grow bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-[#D4C1EC]/30" placeholder="粘贴同步码..." value={syncId} onChange={e => setSyncId(e.target.value)} />
                  <button onClick={handleCloudDownload} disabled={isSyncing || !syncId.trim()} className="px-4 py-2 bg-slate-800 text-white text-xs font-black rounded-xl shadow-sm hover:bg-slate-700 active:scale-95 transition-all disabled:opacity-50">
                    恢复
                  </button>
                </div>
              </div>
            </div>

            <p className="mt-8 text-[8px] text-slate-300 text-center leading-relaxed">提示：同步码是您的唯一凭证，<br/>建议通过微信或备忘录将其发送至新电脑。</p>
          </div>
        </div>
      )}

      {/* 底部进度条 */}
      {viewMode === 'dashboard' && currentGame && !isEditMode && (
        <div className="fixed bottom-0 left-0 right-0 p-6 z-[100] animate-in slide-in-from-bottom-8 duration-700">
           <div className="max-w-md mx-auto bg-white/90 backdrop-blur-3xl rounded-3xl p-4 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.1)] flex items-center gap-6 border border-slate-100">
              <div className="relative">
                <div className={`absolute -inset-2 bg-gradient-to-r ${currentGame.color} opacity-20 blur-xl rounded-full`}></div>
                <div className={`relative w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center font-black text-xs text-slate-800 shadow-inner`}>
                  {Math.round((currentGame.accounts.flatMap(a => a.tasks).filter(t => t.isDone).length / (currentGame.accounts.flatMap(a => a.tasks).length || 1)) * 100)}%
                </div>
              </div>
              <div className="flex-grow">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 italic">{currentGame.name} 打卡进度</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner p-1 ring-1 ring-slate-200">
                  <div 
                    className={`h-full bg-gradient-to-r ${currentGame.color} transition-all duration-1000 rounded-full relative overflow-hidden`} 
                    style={{ width: `${(currentGame.accounts.flatMap(a => a.tasks).filter(t => t.isDone).length / (currentGame.accounts.flatMap(a => a.tasks).length || 1)) * 100}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-[shimmer_4s_infinite]" style={{ backgroundSize: '200% 100%' }}></div>
                  </div>
                </div>
              </div>
           </div>
        </div>
      )}
      
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
};

export default App;
