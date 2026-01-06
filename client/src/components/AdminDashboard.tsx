import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Users,
    RefreshCw,
    Plus,
    Trash2,
    Star,
    CheckCircle,
    XCircle
} from 'lucide-react';
import type { Coordinator, MonthlyBoard } from '../utils/scheduler';
import { generateSchedule, smartShuffle } from '../utils/scheduler';
import { API_BASE_URL } from '../utils/config';

const AdminDashboard: React.FC = () => {
    const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
    const [boards, setBoards] = useState<MonthlyBoard[]>([]);
    const [activeTab, setActiveTab] = useState<'coordinators' | 'boards'>('boards');
    const [loading, setLoading] = useState(true);
    const [newName, setNewName] = useState('');
    const password = 'KDave237'; // Hardcoded for this local tool as per requirements
    const [search, setSearch] = useState('');
    const [filterCoordinatorId, setFilterCoordinatorId] = useState<string>('');
    const [filterMonth, setFilterMonth] = useState<string>('');
    const [sortBy, setSortBy] = useState<'date' | 'name'>('date');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [coordResp, boardResp] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/coordinators`),
                axios.get(`${API_BASE_URL}/api/boards`)
            ]);
            setCoordinators(coordResp.data);
            setBoards(boardResp.data);
        } catch (err) {
            console.error('Fetch failed', err);
        } finally {
            setLoading(false);
        }
    };

    const saveCoordinators = async (list: Coordinator[]) => {
        try {
            await axios.post(`${API_BASE_URL}/api/coordinators`, {
                password,
                coordinators: list
            });
            setCoordinators(list);
            localStorage.setItem('ifa_coordinators', JSON.stringify(list));
        } catch (err) {
            console.error('Save failed', err);
            // Even if server fails, update local state and storage for "Offline Mode"
            setCoordinators(list);
            localStorage.setItem('ifa_coordinators', JSON.stringify(list));
            if (API_BASE_URL) alert('Server save failed, changes stored locally.');
        }
    };

    const saveBoards = async (list: MonthlyBoard[]) => {
        try {
            await axios.post(`${API_BASE_URL}/api/boards`, {
                password,
                boards: list
            });
            setBoards(list);
            localStorage.setItem('ifa_boards', JSON.stringify(list));
        } catch (err) {
            console.error('Save failed', err);
            setBoards(list);
            localStorage.setItem('ifa_boards', JSON.stringify(list));
            if (API_BASE_URL) alert('Server save failed, changes stored locally.');
        }
    };

    const handleAddCoordinator = () => {
        if (!newName.trim()) return;
        const newList = [...coordinators, {
            id: Date.now().toString(),
            name: newName,
            stars: 1,
            available: true
        }];
        saveCoordinators(newList);
        setNewName('');
    };

    const handleToggleAvailability = (id: string) => {
        const newList = coordinators.map(c =>
            c.id === id ? { ...c, available: !c.available } : c
        );
        saveCoordinators(newList);
    };

    const handleUpdateStars = (id: string, stars: number) => {
        const newList = coordinators.map(c =>
            c.id === id ? { ...c, stars: Math.max(0, stars) } : c
        );
        saveCoordinators(newList);
    };

    const handleDeleteCoordinator = (id: string) => {
        if (!window.confirm('Are you sure?')) return;
        const newList = coordinators.filter(c => c.id !== id);
        saveCoordinators(newList);
    };

    const handleRegenerate = () => {
        if (!window.confirm('This will wipe the current 6-month plan and create a new one based on current stars. Proceed?')) return;

        // Start from current month
        const now = new Date();
        const startMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const { boards: newBoards, updatedCoordinators } = generateSchedule(coordinators, startMonth, 6);

        saveBoards(newBoards);
        saveCoordinators(updatedCoordinators);
    };

    const handleManualAssignmentUpdate = (monthIdx: number, assignmentIdx: number, newCoordId: string) => {
        const newCoord = coordinators.find(c => c.id === newCoordId);
        if (!newCoord) return;

        let updatedBoards = [...boards];
        updatedBoards[monthIdx].assignments[assignmentIdx].coordinatorId = newCoord.id;
        updatedBoards[monthIdx].assignments[assignmentIdx].coordinatorName = newCoord.name;

        // Check for double appearance in month and trigger shuffle
        const monthIds = updatedBoards[monthIdx].assignments.map(a => a.coordinatorId);
        const hasDuplicates = monthIds.some((id, index) => monthIds.indexOf(id) !== index);

        if (hasDuplicates) {
            alert(`Duplicate found in ${updatedBoards[monthIdx].month}! Triggering automatic shuffle for upcoming weeks...`);
            updatedBoards = smartShuffle(updatedBoards, coordinators, monthIdx, assignmentIdx);
        }

        saveBoards(updatedBoards);
    };

    if (loading) return <div className="p-20 text-center text-ifa-gold">Loading Admin Tools...</div>;

    return (
        <div className="space-y-8 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                        <span className="bg-ifa-gold/10 p-2 rounded-lg"><Users className="text-ifa-gold" /></span>
                        Admin Dashboard
                    </h2>
                    <p className="text-gray-400 mt-1">Manage coordinators and weekly programming</p>
                </div>

                <div className="flex gap-2 bg-ifa-card p-1 rounded-xl border border-gray-800">
                    <button
                        onClick={() => setActiveTab('boards')}
                        className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'boards' ? 'bg-ifa-gold text-ifa-dark shadow-lg shadow-ifa-gold/20' : 'text-gray-400 hover:text-white'}`}
                    >
                        Boards
                    </button>
                    <button
                        onClick={() => setActiveTab('coordinators')}
                        className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'coordinators' ? 'bg-ifa-gold text-ifa-dark shadow-lg shadow-ifa-gold/20' : 'text-gray-400 hover:text-white'}`}
                    >
                        Coordinators
                    </button>
                </div>
            </div>

            {activeTab === 'boards' ? (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search coordinator or date"
                            className="bg-ifa-card border border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ifa-gold outline-none"
                            aria-label="Search"
                        />
                        <select
                            value={filterCoordinatorId}
                            onChange={(e) => setFilterCoordinatorId(e.target.value)}
                            className="bg-ifa-card border border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ifa-gold outline-none"
                            aria-label="Filter by coordinator"
                        >
                            <option value="">All Coordinators</option>
                            {coordinators.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <select
                            value={filterMonth}
                            onChange={(e) => setFilterMonth(e.target.value)}
                            className="bg-ifa-card border border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ifa-gold outline-none"
                            aria-label="Filter by month"
                        >
                            <option value="">All Months</option>
                            {boards.map(b => (
                                <option key={b.month} value={b.month}>{b.month}</option>
                            ))}
                        </select>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as 'date' | 'name')}
                            className="bg-ifa-card border border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ifa-gold outline-none"
                            aria-label="Sort by"
                        >
                            <option value="date">Sort by Date</option>
                            <option value="name">Sort by Name</option>
                        </select>
                    </div>

                    <div className="bg-ifa-card border border-gray-800 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
                        <div className="flex items-center gap-4 text-left">
                            <div className="bg-ifa-gold/10 p-4 rounded-2xl text-ifa-gold">
                                <RefreshCw size={32} className="animate-pulse-slow" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">Automated Refresh</h3>
                                <p className="text-gray-400 text-sm max-w-sm">Regenerate a fresh 6-month schedule based on current coordinator star credits.</p>
                            </div>
                        </div>
                        <button
                            onClick={handleRegenerate}
                            className="flex items-center gap-2 bg-ifa-gold hover:bg-ifa-gold/90 text-ifa-dark font-black px-10 py-4 rounded-2xl transition-all hover:scale-[1.02] shadow-xl active:scale-[0.98]"
                        >
                            <RefreshCw size={20} />
                            REGENERATE BOARD
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-10">
                        {boards
                            .filter(b => (filterMonth ? b.month === filterMonth : true))
                            .map((board, bIdx) => {
                                const [y, m] = board.month.split('-');
                                const mName = new Date(parseInt(y), parseInt(m) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

                                return (
                                    <div key={bIdx} className="bg-ifa-card border border-gray-800 rounded-3xl overflow-hidden shadow-lg">
                                        <div className="bg-ifa-dark/50 p-6 border-b border-gray-800 flex justify-between items-center">
                                            <h4 className="text-ifa-gold font-bold text-xl uppercase tracking-widest">{mName}</h4>
                                            <span className="bg-gray-800 text-gray-400 text-xs px-3 py-1 rounded-full uppercase font-black">
                                                {board.assignments.length} Meetings
                                            </span>
                                        </div>
                                        <div className="p-0">
                                            <table className="w-full text-left text-sm">
                                                <thead className="text-gray-500 font-bold border-b border-gray-800">
                                                    <tr>
                                                        <th className="px-6 py-4 uppercase text-[10px] tracking-widest">Meeting</th>
                                                        <th className="px-6 py-4 uppercase text-[10px] tracking-widest">Date</th>
                                                        <th className="px-6 py-4 uppercase text-[10px] tracking-widest">Coordinator</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-800">
                                                    {board.assignments
                                                        .filter(as => (filterCoordinatorId ? as.coordinatorId === filterCoordinatorId : true))
                                                        .filter(as => {
                                                            const term = search.trim().toLowerCase();
                                                            if (!term) return true;
                                                            const dateStr = new Date(as.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' }).toLowerCase();
                                                            return as.coordinatorName.toLowerCase().includes(term) || dateStr.includes(term);
                                                        })
                                                        .sort((a, b) => {
                                                            if (sortBy === 'name') return a.coordinatorName.localeCompare(b.coordinatorName);
                                                            return new Date(a.date).getTime() - new Date(b.date).getTime();
                                                        })
                                                        .map((as, aIdx) => (
                                                            <tr key={aIdx} className="hover:bg-white/5 transition-all">
                                                                <td className="px-6 py-4">
                                                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${as.type === 'Friday' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                                                        }`}>
                                                                        {as.type}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 text-gray-300 font-medium">
                                                                    {new Date(as.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })}
                                                                </td>
                                                                <td className="px-6 py-4 font-bold italic text-white min-w-[200px]">
                                                                    <select
                                                                        className="bg-transparent hover:bg-white/10 outline-none rounded p-1 transition-all w-full"
                                                                        value={as.coordinatorId}
                                                                        onChange={(e) => handleManualAssignmentUpdate(bIdx, aIdx, e.target.value)}
                                                                    >
                                                                        {coordinators.map(c => (
                                                                            <option key={c.id} value={c.id} className="bg-ifa-card text-white">
                                                                                {c.name}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>

                    <div className="bg-ifa-card border border-gray-800 rounded-3xl p-8 shadow-xl">
                        <h3 className="text-xl font-bold text-ifa-gold mb-4">Six-Month Analytics</h3>
                        <div className="space-y-3">
                            {coordinators
                                .map(c => ({
                                    id: c.id,
                                    name: c.name,
                                    count: boards.reduce((acc, b) => acc + b.assignments.filter(a => a.coordinatorId === c.id).length, 0)
                                }))
                                .filter(x => x.count > 0)
                                .sort((a, b) => b.count - a.count)
                                .slice(0, 6)
                                .map((row, idx) => {
                                    const max = Math.max(1, ...coordinators.map(c => boards.reduce((acc, b) => acc + b.assignments.filter(a => a.coordinatorId === c.id).length, 0)));
                                    const pct = Math.round((row.count / max) * 100);
                                    return (
                                        <div key={idx} className="flex items-center gap-4">
                                            <div className="w-40 text-sm font-bold text-gray-300 truncate">{row.name}</div>
                                            <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-ifa-purple via-ifa-blue to-ifa-gold rounded-full"
                                                    style={{ width: `${pct}%` }}
                                                    aria-valuenow={row.count}
                                                    aria-valuemin={0}
                                                    aria-valuemax={max}
                                                    role="progressbar"
                                                />
                                            </div>
                                            <div className="w-10 text-right text-sm font-bold text-gray-400">{row.count}</div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="bg-ifa-card border-2 border-dashed border-gray-800 rounded-3xl p-6 flex flex-col items-center justify-center gap-4 hover:border-ifa-gold/50 transition-all group">
                            <Plus size={40} className="text-gray-700 group-hover:text-ifa-gold transition-all" />
                            <div className="w-full space-y-3">
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    placeholder="Full Name"
                                    className="w-full bg-ifa-dark border border-gray-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-ifa-gold outline-none"
                                />
                                <button
                                    onClick={handleAddCoordinator}
                                    className="w-full bg-ifa-gold text-ifa-dark font-bold py-2 rounded-xl text-sm"
                                >
                                    Quick Add
                                </button>
                            </div>
                        </div>

                        {coordinators.map(c => (
                            <div key={c.id} className="bg-ifa-card border border-gray-800 rounded-3xl p-6 relative group overflow-hidden shadow-md">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-ifa-dark rounded-xl flex items-center justify-center font-bold text-ifa-gold border border-gray-800">
                                            {c.name.charAt(0)}
                                        </div>
                                        <div className="font-bold text-lg">{c.name}</div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteCoordinator(c.id)}
                                        className="p-2 text-gray-700 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between bg-ifa-dark/50 p-4 rounded-2xl border border-gray-800/50">
                                    <div className="flex items-center gap-1">
                                        <Star className="text-ifa-gold" size={16} fill="currentColor" />
                                        <span className="text-ifa-gold font-black text-xl ml-1">{c.stars}</span>
                                        <span className="text-xs text-gray-500 ml-1 uppercase font-bold tracking-widest">Credits</span>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => handleUpdateStars(c.id, c.stars - 1)}
                                            className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center font-bold"
                                        >-</button>
                                        <button
                                            onClick={() => handleUpdateStars(c.id, c.stars + 1)}
                                            className="w-8 h-8 rounded-lg bg-ifa-gold/20 text-ifa-gold hover:bg-ifa-gold/30 flex items-center justify-center font-bold"
                                        >+</button>
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center justify-between">
                                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Status</div>
                                    <button
                                        onClick={() => handleToggleAvailability(c.id)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${c.available
                                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                                            }`}
                                    >
                                        {c.available ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                        {c.available ? 'Available' : 'Paused'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
