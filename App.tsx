
import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { TaskType, Game, AppData, Task, Account, GameEvent } from './types';
import { getGeminiAdvice, AiResponse } from './services/geminiService';

const STORAGE_KEY = 'game_checkin_data_v8';
const CLOUD_API = 'https://jsonblob.com/api/jsonBlob';

// 严格马卡龙配色
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
  const [aiResponse, setAiResponse] = useState<AiResponse | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  // 云同步相关状态
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncCodeInput, setSyncCodeInput] = useState('');
  const [generatedSyncCode, setGeneratedSyncCode] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  // --- 云端同步逻辑 ---
  const handleCloudUpload = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch(CLOUD_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const location = response.headers.get('Location');
      if (location) {
        const id = location.split('/').pop();
        setGeneratedSyncCode(id || '');
      }
    } catch (error) {
      alert('上传失败，请检查网络连接');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCloudRestore = async () => {
    if (!syncCodeInput.trim()) return;
    setIsSyncing(true);
    try {
      const response = await fetch(`${CLOUD_API}/${syncCodeInput.trim()}`);
      if (response.ok) {
        const cloudData = await response.json();
        if (cloudData.games) {
          setData(cloudData);
          alert('数据恢复成功！');
          setShowSyncModal(false);
          setSyncCodeInput('');
          if (cloudData.games.length > 0) setActiveTab(cloudData.games[0].id);
        }
      } else {
        alert('同步码无效或已过期');
      }
    } catch (error) {
      alert('恢复失败，请检查网络或同步码');
    } finally {
      setIsSyncing(false);
    }
  };

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
  const handleAiConsult = async () => {
    if (!aiInput.trim()) return;
    setIsAiLoading(true);
    const result = await getGeminiAdvice(`解析公告：${aiInput}`);
    if (result.events.length > 0) {
      setData(prev => ({ ...prev, games: prev.games.map(g => g.id === activeTab ? { ...g, events: [...g.events, ...result.events.map(ev => ({ id: `ai-${Date.now()}-${Math.random()}`, ...ev }))] } : g) }));
      setAiResponse(result);
      setAiInput('');
    }
    setIsAiLoading(false);
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
        
        {/* 导航条 */}
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
          
          <div className="flex items-center gap-2">
            {/* 云同步按钮 */}
            <button onClick={() => setShowSyncModal(true)} className="w-10 h-10 flex items-center justify-center bg-white/60 backdrop-blur-xl border border-slate-100 rounded-xl text-[#D4C1EC] hover:text-[#B28DFF] shadow-sm transition-all group">
               <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
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
                {isEditMode && (
                  <button onClick={addAccount} className="w-full py-8 border border-dashed border-slate-100 rounded-2xl text-slate-400 hover:text-slate-800 hover:bg-white transition-all text-[10px] font-black tracking-[0.2em] uppercase">
                    添加新号位
                  </button>
                )}
              </div>

              {/* 右侧边栏 */}
              <div className="space-y-6">
                <div className="bg-white/70 border border-slate-100 rounded-2xl p-4 shadow-sm">
                   <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">活动日程</h4>
                   <div className="space-y-2">
                     {currentGame.events.length > 0 ? currentGame.events.map(ev => (
                       <div key={ev.id} className="relative bg-slate-50 p-3 rounded-xl border border-slate-100 group transition-all">
                         {isEditMode ? (
                           <div className="space-y-2">
                             <input className="bg-white border border-slate-200 p-1.5 rounded-lg font-black text-xs w-full outline-none text-slate-800" value={ev.title} onChange={e => {
                               setData(prev => ({ ...prev, games: prev.games.map(g => g.id === activeTab ? {...g, events: g.events.map(event => event.id === ev.id ? {...event, title: e.target.value} : event)} : g)}))
                             }} />
                             <div className="flex flex-col gap-1 text-[8px] font-bold text-slate-400">
                               <input type="date" className="bg-white p-1 rounded-md border border-slate-200 outline-none" value={ev.startDate} onChange={e => {
                                 setData(prev => ({ ...prev, games: prev.games.map(g => g.id === activeTab ? {...g, events: g.events.map(event => event.id === ev.id ? {...event, startDate: e.target.value} : event)} : g)}))
                               }} />
                               <input type="date" className="bg-white p-1 rounded-md border border-slate-200 outline-none" value={ev.deadline} onChange={e => {
                                 setData(prev => ({ ...prev, games: prev.games.map(g => g.id === activeTab ? {...g, events: g.events.map(event => event.id === ev.id ? {...event, deadline: e.target.value} : event)} : g)}))
                               }} />
                             </div>
                           </div>
                         ) : (
                           <>
                             <div className="text-xs font-black text-slate-700 mb-1 truncate">{ev.title}</div>
                             <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-400">
                               <div className="w-1 h-1 rounded-full bg-[#FFB7B2]" />
                               {ev.startDate} ~ {ev.deadline}
                             </div>
                           </>
                         )}
                         {isEditMode && <button onClick={() => { setData(prev => ({ ...prev, games: prev.games.map(g => g.id === activeTab ? {...g, events: g.events.filter(event => event.id !== ev.id)} : g)})) }} className="absolute top-2 right-2 text-rose-300 font-bold">×</button>}
                       </div>
                     )) : <div className="text-center py-6 text-slate-300 text-[9px] font-black tracking-widest uppercase italic">暂无活动</div>}
                   </div>
                </div>

                <div className="bg-gradient-to-br from-[#FFB7B2]/5 to-[#D4C1EC]/5 border border-slate-100 rounded-2xl p-5 relative overflow-hidden group shadow-sm">
                  <div className="absolute -top-8 -right-8 w-24 h-24 bg-[#FFB7B2]/20 blur-[40px] rounded-full" />
                  <h4 className="text-[10px] font-black text-[#FFB7B2] mb-4 flex items-center gap-2 tracking-[0.1em]">
                    <span className="w-2 h-2 bg-[#FFB7B2] rounded-full animate-pulse shadow-sm" />
                    AI 魔法同步
                  </h4>
                  <textarea className="w-full bg-white/80 border border-slate-100 rounded-xl p-3 text-xs font-medium text-slate-600 min-h-[100px] outline-none focus:ring-1 focus:ring-[#FFB7B2]/20 transition-all placeholder:text-slate-300" placeholder="粘贴公告文本..." value={aiInput} onChange={e => setAiInput(e.target.value)} />
                  <button onClick={handleAiConsult} disabled={isAiLoading || !aiInput.trim()} className="w-full mt-4 py-3 bg-gradient-to-r from-[#FFB7B2] to-[#D4C1EC] hover:brightness-105 disabled:opacity-30 rounded-xl text-[10px] font-black tracking-[0.1em] text-slate-900 shadow-sm transition-all hover:translate-y-[-2px] active:translate-y-[1px] uppercase">
                    {isAiLoading ? '解析中...' : '同步日程'}
                  </button>
                </div>
              </div>
            </div>
          ) : <div className="text-center py-20 text-slate-300 font-black tracking-[1em] text-xs italic uppercase">开启游戏打卡之旅</div>
        ) : (
          <div className="bg-white/80 rounded-3xl p-6 md:p-8 border border-slate-100 shadow-lg backdrop-blur-3xl overflow-hidden flex flex-col min-h-[700px]">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-4xl font-black tracking-tighter text-slate-800">
                {currentDate.getFullYear()} <span className="text-[#FFB7B2] italic">/</span> {(currentDate.getMonth() + 1).toString().padStart(2, '0')}
              </h2>
              <div className="flex gap-3">
                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 hover:bg-[#FFB7B2]/10 transition-all shadow-sm">←</button>
                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 hover:bg-[#FFB7B2]/10 transition-all shadow-sm">→</button>
              </div>
            </div>

            <div className="grid grid-cols-7 text-center text-[10px] font-black text-slate-300 tracking-[0.2em] pb-4 border-b border-slate-50 mb-4">
              {['周日', '周一', '周二', '周三', '周四', '周五', '周六'].map(d => <div key={d}>{d}</div>)}
            </div>

            <div className="flex-grow space-y-4">
              {calendarWeeks.map((week, wIdx) => {
                const wStart = week.find(d => d !== null)!;
                const wEnd = [...week].reverse().find(d => d !== null)!;
                const weeklyEvents = allEvents.filter(ev => {
                  const s = new Date(ev.startDate || ev.deadline);
                  const e = new Date(ev.deadline);
                  return s <= wEnd && e >= wStart;
                });

                return (
                  <div key={wIdx} className="relative min-h-[100px] bg-slate-50/30 rounded-2xl border border-slate-100 group">
                    <div className="absolute inset-0 grid grid-cols-7">
                      {week.map((day, dIdx) => (
                        <div key={dIdx} className={`border-r border-slate-50 last:border-0 p-4 ${day && new Date().toDateString() === day.toDateString() ? 'bg-[#FFB7B2]/5' : ''}`}>
                          {day && <span className={`text-lg font-black ${new Date().toDateString() === day.toDateString() ? 'text-[#FFB7B2]' : 'text-slate-200 group-hover:text-slate-300'}`}>{day.getDate()}</span>}
                        </div>
                      ))}
                    </div>
                    <div className="relative pt-12 pb-4 space-y-1.5 px-1">
                      {weeklyEvents.map((ev, eIdx) => {
                        const s = new Date(ev.startDate || ev.deadline);
                        const e = new Date(ev.deadline);
                        let startIdx = 0, endIdx = 6;
                        week.forEach((d, i) => { if (d && d.toDateString() === s.toDateString()) startIdx = i; if (d && d.toDateString() === e.toDateString()) endIdx = i; });
                        const actualStart = Math.max(startIdx, week.findIndex(d => d !== null));
                        const actualEnd = Math.min(endIdx, 6 - [...week].reverse().findIndex(d => d !== null));
                        const isEndDay = e >= wStart && e <= wEnd;

                        return (
                          <div key={eIdx} className="relative h-6" style={{ marginLeft: `${(actualStart/7)*100}%`, width: `${((actualEnd-actualStart+1)/7)*100}%` }}>
                            <div className={`absolute inset-y-0 left-1 right-1 rounded-full bg-gradient-to-r ${ev.gameColor} px-3 flex items-center text-[8px] font-black shadow-sm transition-all hover:scale-[1.02] z-10 ${s < wStart ? 'rounded-l-none' : ''} ${e > wEnd ? 'rounded-r-none' : ''}`}>
                              <span className="truncate opacity-90">{ev.title}</span>
                              {isEndDay && <div className="ml-auto w-2 h-2 bg-white/80 rounded-full border border-white animate-pulse" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

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

      {/* 云同步弹窗 */}
      {showSyncModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-md" onClick={() => setShowSyncModal(false)} />
          <div className="relative w-full max-w-xs bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300">
            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2 tracking-tighter italic">
              <span className="w-2 h-7 bg-[#D4C1EC] rounded-full"></span>
              云端同步
            </h3>
            
            <div className="space-y-6">
              {/* 上传区域 */}
              <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-3 tracking-[0.2em]">备份到云端</p>
                {generatedSyncCode ? (
                  <div className="space-y-3">
                    <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-inner">
                      <code className="block text-[11px] font-black text-[#D4C1EC] text-center break-all">{generatedSyncCode}</code>
                    </div>
                    <button onClick={() => { navigator.clipboard.writeText(generatedSyncCode); alert('同步码已复制'); }} className="w-full text-[9px] font-black text-slate-400 uppercase hover:text-slate-800 transition-colors">点击复制</button>
                  </div>
                ) : (
                  <button onClick={handleCloudUpload} disabled={isSyncing} className="w-full py-3.5 bg-gradient-to-r from-[#FFB7B2] to-[#D4C1EC] text-slate-900 text-xs font-black rounded-2xl shadow-sm hover:brightness-105 active:scale-95 transition-all">
                    {isSyncing ? '上传中...' : '生成同步码'}
                  </button>
                )}
              </div>

              {/* 恢复区域 */}
              <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-3 tracking-[0.2em]">从备份恢复</p>
                <div className="flex gap-2">
                  <input className="flex-grow bg-white border border-slate-200 rounded-2xl px-4 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-[#D4C1EC]/30" placeholder="同步码" value={syncCodeInput} onChange={e => setSyncCodeInput(e.target.value)} />
                  <button onClick={handleCloudRestore} disabled={isSyncing || !syncCodeInput.trim()} className="px-5 py-2 bg-slate-800 text-white text-xs font-black rounded-2xl hover:bg-slate-700 disabled:opacity-30 transition-all">恢复</button>
                </div>
              </div>
            </div>
            
            <button onClick={() => setShowSyncModal(false)} className="absolute top-6 right-6 text-slate-300 hover:text-slate-800 font-black">×</button>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default App;
