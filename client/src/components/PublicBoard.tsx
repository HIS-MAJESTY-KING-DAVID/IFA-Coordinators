import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Calendar, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import type { MonthlyBoard } from '../utils/scheduler';
import html2canvas from 'html2canvas';

const PublicBoard: React.FC = () => {
    const [boards, setBoards] = useState<MonthlyBoard[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeMonthIdx, setActiveMonthIdx] = useState(0);
    const boardRef = useRef<HTMLDivElement>(null);

    const handleDownloadImage = async () => {
        if (!boardRef.current) return;

        // Create a clone to avoid capturing UI buttons if needed, 
        // but here we just hide them temporarily or capture the whole container.
        const canvas = await html2canvas(boardRef.current, {
            backgroundColor: '#121212',
            scale: 2, // Higher quality
            logging: false,
            useCORS: true
        });

        const image = canvas.toDataURL("image/jpeg", 0.9);
        const link = document.createElement('a');
        link.href = image;
        link.download = `IFA-Board-${boards[activeMonthIdx].month}.jpg`;
        link.click();
    };

    useEffect(() => {
        fetchBoards();
    }, []);

    const fetchBoards = async () => {
        try {
            const resp = await axios.get('http://localhost:5000/api/boards');
            if (resp.data && Array.isArray(resp.data)) {
                // Public view limited to current and next month
                setBoards(resp.data.slice(0, 2));
            }
        } catch (err) {
            console.error('Failed to fetch boards', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ifa-gold"></div>
                <p className="mt-4 text-gray-400">Loading coordination boards...</p>
            </div>
        );
    }

    if (boards.length === 0) {
        return (
            <div className="text-center py-20 bg-ifa-card rounded-2xl border border-dashed border-gray-800">
                <Calendar className="mx-auto text-gray-700 mb-4" size={48} />
                <h2 className="text-xl font-medium text-gray-400">No boards programmed yet.</h2>
                <p className="text-gray-600 mt-2">Check back later or contact the administrator.</p>
            </div>
        );
    }

    const activeBoard = boards[activeMonthIdx];
    const [year, month] = activeBoard.month.split('-');
    const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter text-ifa-gold mb-1">
                        {monthName}
                    </h2>
                    <p className="text-gray-400 font-medium">Weekly Coordination Board</p>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={handleDownloadImage}
                        className="flex items-center gap-2 bg-ifa-gold/10 text-ifa-gold hover:bg-ifa-gold/20 px-4 py-2 rounded-xl border border-ifa-gold/30 transition-all font-bold text-sm"
                    >
                        <Download size={18} />
                        SHARE AS JPEG
                    </button>

                    <div className="flex items-center bg-ifa-card rounded-xl p-1 border border-gray-800">
                        <button
                            onClick={() => setActiveMonthIdx(Math.max(0, activeMonthIdx - 1))}
                            disabled={activeMonthIdx === 0}
                            className="p-2 hover:bg-ifa-dark rounded-lg disabled:opacity-30 transition-all text-ifa-gold"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <div className="px-4 text-sm font-bold text-gray-300">
                            Month {activeMonthIdx + 1} of {boards.length}
                        </div>
                        <button
                            onClick={() => setActiveMonthIdx(Math.min(boards.length - 1, activeMonthIdx + 1))}
                            disabled={activeMonthIdx === boards.length - 1}
                            className="p-2 hover:bg-ifa-dark rounded-lg disabled:opacity-30 transition-all text-ifa-gold"
                        >
                            <ChevronRight size={24} />
                        </button>
                    </div>
                </div>
            </div>

            <div ref={boardRef} className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4">
                {activeBoard.assignments.map((assignment, idx) => (
                    <div
                        key={idx}
                        className="group bg-ifa-card border border-gray-800 rounded-3xl p-6 transition-all hover:border-ifa-gold/50 hover:shadow-[0_0_30px_rgba(212,175,55,0.1)] relative overflow-hidden"
                    >
                        {/* Background Accent */}
                        <div className={`absolute top-0 right-0 w-48 h-48 blur-3xl opacity-20 group-hover:opacity-40 transition-all ${assignment.type === 'Friday' ? 'bg-blue-600' : 'bg-ifa-gold/50'
                            }`}></div>

                        <div className="flex justify-between items-start mb-6 relative">
                            <div className="flex items-center gap-3">
                                <div className={`p-4 rounded-2xl shadow-lg border ${assignment.type === 'Friday'
                                    ? 'bg-blue-600/20 text-blue-400 border-blue-500/30'
                                    : 'bg-ifa-gold/20 text-ifa-gold border-ifa-gold/30'
                                    }`}>
                                    <Calendar size={24} />
                                </div>
                                <div>
                                    <div className={`text-xs uppercase tracking-[0.2em] font-black mb-1 ${assignment.type === 'Friday' ? 'text-blue-400' : 'text-ifa-gold'
                                        }`}>
                                        {assignment.type} Meeting
                                    </div>
                                    <div className="text-3xl font-black tracking-tighter">
                                        {new Date(assignment.date).toLocaleDateString('default', {
                                            weekday: 'long',
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={`rounded-2xl p-6 flex items-center gap-6 border transition-all ${assignment.type === 'Friday'
                            ? 'bg-blue-900/10 border-blue-900/30 group-hover:border-blue-500/50'
                            : 'bg-ifa-gold/5 border-ifa-gold/10 group-hover:border-ifa-gold/50'
                            }`}>
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center font-black text-2xl shadow-inner ${assignment.type === 'Friday' ? 'bg-blue-500/20 text-blue-400' : 'bg-ifa-gold/20 text-ifa-gold'
                                }`}>
                                {assignment.coordinatorName.charAt(0)}
                            </div>
                            <div>
                                <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-1">Coordinator</div>
                                <div className="text-2xl font-black text-white group-hover:scale-105 transition-transform origin-left italic">
                                    {assignment.coordinatorName}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PublicBoard;
