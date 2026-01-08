import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Calendar, Download, User } from 'lucide-react';
import type { MonthlyBoard } from '../utils/scheduler';
import { toJpeg } from 'html-to-image';
import html2canvas from 'html2canvas';
import { API_BASE_URL } from '../utils/config';

 

const PublicBoard: React.FC = () => {
    const [boards, setBoards] = useState<MonthlyBoard[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSharing, setIsSharing] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [health, setHealth] = useState<{ db_configured?: boolean; env?: string } | null>(null);
    
    const boardRef = useRef<HTMLDivElement>(null);

    const handleDownloadImage = async () => {
        if (!boardRef.current || boards.length === 0) return;

        try {
            setIsSharing(true);
            await new Promise(r => setTimeout(r, 100));

            const dataUrl = await toJpeg(boardRef.current, {
                quality: 0.95,
                backgroundColor: '#111827',
                pixelRatio: 2,
                cacheBust: true,
                style: { backgroundColor: '#111827' },
            });

            const link = document.createElement('a');
            link.href = dataUrl;
            const fileName = boards[0]?.month || 'Schedule';
            link.download = `IFA-Board-${fileName}.jpg`;
            link.click();
        } catch (err) {
            console.error('html-to-image failed, falling back to html2canvas', err);
            try {
                const canvas = await html2canvas(boardRef.current, {
                    backgroundColor: '#111827',
                    scale: 2,
                    logging: false,
                    useCORS: true,
                    foreignObjectRendering: true,
                    allowTaint: true,
                    windowWidth: boardRef.current.scrollWidth,
                    windowHeight: boardRef.current.scrollHeight
                });
                const image = canvas.toDataURL('image/jpeg', 0.9);
                const link = document.createElement('a');
                link.href = image;
                const fileName = boards[0]?.month || 'Schedule';
                link.download = `IFA-Board-${fileName}.jpg`;
                link.click();
            } catch (e2) {
                console.error('Failed to generate image with fallback', e2);
                alert('Could not generate image. Please try again.');
            }
        } finally {
            setIsSharing(false);
        }
    };

    useEffect(() => {
        fetchBoards();
    }, []);

    const fetchBoards = async () => {
        try {
            setApiError(null);
            const healthResp = await axios.get(`${API_BASE_URL}/api/health`);
            setHealth({ db_configured: !!healthResp.data?.db_configured, env: healthResp.data?.env });
            const resp = await axios.get(`${API_BASE_URL}/api/boards`);
            if (resp.data && Array.isArray(resp.data) && resp.data.length > 0) {
                const now = new Date();
                const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                const currentIdx = resp.data.findIndex((b: MonthlyBoard) => b.month === currentMonth);
                if (currentIdx !== -1) {
                    setBoards(resp.data.slice(currentIdx, currentIdx + 2));
                } else {
                    setBoards(resp.data.slice(0, 2));
                }
            } else {
                setBoards([]);
            }
        } catch (err) {
            const message = (err as { message?: string })?.message || 'Network error';
            setApiError(`Failed to load boards: ${message}`);
            console.error('Failed to fetch boards', err);
            setBoards([]);
        } finally {
            setLoading(false);
        }
    };

    const getCurrentWeekRangeForMonth = (monthStr: string) => {
        const [y, m] = monthStr.split('-').map(Number);
        const daysInMonth = new Date(y, m, 0).getDate();
        const today = new Date();
        const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        if (monthStr !== currentMonthStr) return null;
        const d = today.getDate();
        if (d <= 7) return { start: 1, end: 7 };
        if (d <= 14) return { start: 8, end: 14 };
        if (d <= 21) return { start: 15, end: 21 };
        return { start: 22, end: daysInMonth };
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ifa-blue"></div>
                <p className="mt-4 text-gray-400">Loading coordination boards...</p>
            </div>
        );
    }

    if (boards.length === 0) {
        return (
            <div className="text-center py-20 bg-gray-900 rounded-2xl border border-dashed border-gray-800">
                <Calendar className="mx-auto text-gray-600 mb-4" size={48} />
                <h2 className="text-xl font-medium text-gray-400">No boards programmed yet.</h2>
            </div>
        );
    }

    // Determine overall date range for title
    const startBoard = boards[0];
    const endBoard = boards[boards.length - 1];
    const startMonthName = new Date(startBoard.month + '-01').toLocaleString('default', { month: 'long' });
    const endMonthName = new Date(endBoard.month + '-01').toLocaleString('default', { month: 'long' });
    const year = startBoard.month.split('-')[0];
    const pageTitle = startMonthName === endMonthName
        ? `${startMonthName} ${year}`
        : `${startMonthName} - ${endMonthName} ${year}`;

    // Group by month, then by week
    // We'll iterate through the boards to keep the month structure

    return (
        <div className="space-y-12 animate-in fade-in duration-700 max-w-6xl mx-auto pb-20">
            {/* Range Title and Share Button */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
                <div className="space-y-2">
                    <h2 className="text-3xl font-bold text-white tracking-tight">
                        {pageTitle}
                    </h2>
                    
                </div>
                <button
                    onClick={handleDownloadImage}
                    disabled={isSharing}
                    className={`flex items-center gap-2 bg-[#3B82F6] hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-all font-bold text-sm shadow-xl shadow-blue-500/20 ${isSharing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <Download size={18} className={isSharing ? 'animate-pulse' : ''} />
                    {isSharing ? 'GENERATING...' : 'SHARE AS JPEG'}
                </button>
            </div>
            {apiError && (
                <div className="flex items-center justify-between bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl">
                    <span className="text-xs font-bold uppercase tracking-widest">{apiError}</span>
                    <button
                        onClick={fetchBoards}
                        className="px-3 py-1 rounded-lg text-xs font-black bg-red-500/20 hover:bg-red-500/30 transition-all"
                    >
                        Retry
                    </button>
                </div>
            )}
            {health && health.db_configured === false && (
                <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 px-4 py-2 rounded-xl">
                    <span className="text-xs font-bold uppercase tracking-widest">Database not configured</span>
                </div>
            )}

            {/* Main Board Container */}
            <div ref={boardRef} className="bg-[#1e2533] rounded-3xl p-6 md:p-10 shadow-2xl border border-white/5">
                {boards.map((board, bIdx) => {
                    const [y, m] = board.month.split('-');
                    const dateObj = new Date(parseInt(y), parseInt(m) - 1);
                    const monthNameFull = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
                    const daysInMonth = new Date(parseInt(y), parseInt(m), 0).getDate();

                    // Group by exact weeks (1-7, 8-14, 15-21, 22-end)
                    const weekRanges = [
                        { start: 1, end: 7 },
                        { start: 8, end: 14 },
                        { start: 15, end: 21 },
                        { start: 22, end: daysInMonth }
                    ];
                    const getOrdinalDate = (dateStr: string) => {
                        const d = parseInt(dateStr.split('-')[2]);
                        const s = ["th", "st", "nd", "rd"];
                        const v = d % 100;
                        const suffix = s[(v - 20) % 10] || s[v] || s[0];
                        return `${d}${suffix}`;
                    };

                    return (
                        <div key={bIdx} className="mb-16 last:mb-0">
                            {/* Month Header */}
                            <div className="flex items-center gap-3 mb-10">
                                <Calendar className="text-white/60" size={28} />
                                <h3 className="text-3xl font-bold text-white">{monthNameFull}</h3>
                            </div>

                            <div className="space-y-12 ml-4 md:ml-6">
                                {weekRanges.map((wr, wIdx) => {
                                    const assignments = board.assignments.filter(a => {
                                        const d = parseInt(a.date.split('-')[2]);
                                        return d >= wr.start && d <= wr.end;
                                    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                                    const weekLabel = `Week ${wIdx + 1}: ${dateObj.toLocaleString('default', { month: 'short' })} ${wr.start}-${wr.end}`;

                                    const friday = assignments.find(as => as.type === 'Friday');
                                    const sunday = assignments.find(as => as.type === 'Sunday');
                                    const currentRange = getCurrentWeekRangeForMonth(board.month);
                                    const isCurrentWeek = !!currentRange && wr.start === currentRange.start && wr.end === currentRange.end;

                                    return (
                                        <div key={wIdx} className={`space-y-4 ${isCurrentWeek ? 'bg-ifa-gold/5 border-2 border-ifa-gold rounded-2xl p-3' : ''}`}>
                                            <div className={`flex items-center gap-2 font-bold text-lg mb-2 ${isCurrentWeek ? 'text-ifa-gold' : 'text-gray-400'}`}>
                                                <Calendar size={20} className="text-gray-500" />
                                                <span>{weekLabel}</span>
                                                {isCurrentWeek && (
                                                    <span className="ml-3 px-2 py-1 text-xs font-black rounded-full bg-ifa-gold text-ifa-dark uppercase tracking-widest">
                                                        Current Week
                                                    </span>
                                                )}
                                            </div>

                                            {assignments.length === 0 ? (
                                                <div className="flex justify-center items-center py-6 text-gray-500 italic text-sm border border-dashed border-white/5 rounded-2xl">
                                                    No meetings in this range.
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {/* Friday Card */}
                                                    <div className={`${friday && friday.joined ? 'bg-blue-500/10 border-blue-500/30' : 'bg-[#242d3d] border-blue-500/20'} rounded-2xl p-6 flex flex-col gap-4 shadow-lg`}>
                                                        <div className={`flex items-center gap-2 ${friday && friday.joined ? 'text-blue-300' : 'text-blue-400'}`}>
                                                            <Calendar size={18} />
                                                            <span className="font-bold text-sm uppercase tracking-wider">
                                                                Friday {friday ? getOrdinalDate(friday.date) : ''}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className={`${friday && friday.joined ? 'bg-blue-500/20' : 'bg-blue-500/10'} p-2 rounded-full`}>
                                                                <User className="text-white" size={22} />
                                                            </div>
                                                            <span className="text-white text-xl font-bold leading-tight">
                                                                {friday ? (friday.joined ? 'Joined Service' : friday.coordinatorName || 'No coordinator') : 'No coordinator'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Sunday Card */}
                                                    <div className={`${sunday && sunday.youthSunday ? 'bg-purple-500/10 border-purple-500/30' : (sunday && sunday.joined ? 'bg-ifa-gold/10 border-ifa-gold/30' : 'bg-[#2b251e] border border-amber-500/20')} rounded-2xl p-6 flex flex-col gap-4 shadow-lg`}>
                                                        <div className={`flex items-center gap-2 ${sunday && sunday.youthSunday ? 'text-purple-400' : (sunday && sunday.joined ? 'text-ifa-gold' : 'text-amber-500')}`}>
                                                            <Calendar size={18} />
                                                            <span className="font-bold text-sm uppercase tracking-wider">
                                                                Sunday {sunday ? getOrdinalDate(sunday.date) : ''}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className={`${sunday && sunday.youthSunday ? 'bg-purple-500/20' : (sunday && sunday.joined ? 'bg-ifa-gold/20' : 'bg-amber-500/10')} p-2 rounded-full`}>
                                                                <User className="text-white" size={22} />
                                                            </div>
                                                            <span className="text-white text-xl font-bold leading-tight">
                                                                {sunday ? (sunday.youthSunday ? 'Youth Sunday' : (sunday.joined ? 'Joined Service' : sunday.coordinatorName || 'No coordinator')) : 'No coordinator'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex flex-col items-center gap-4 pt-12">
                <div className="flex items-center gap-2 bg-[#1A202C]/60 px-4 py-2 rounded-full border border-gray-700 shadow-inner">
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                    <span className="text-gray-400 text-xs font-bold tracking-widest uppercase">View-Only Mode</span>
                </div>
                <p className="text-gray-600 text-sm font-medium">
                    &copy; {new Date().getFullYear()} IFA Bonamoussadi Weekly Coordination. All rights reserved.
                </p>
            </div>
        </div>
    );
};

export default PublicBoard;
