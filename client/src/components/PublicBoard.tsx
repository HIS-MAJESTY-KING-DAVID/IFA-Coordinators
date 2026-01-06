import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Calendar, Download, User } from 'lucide-react';
import type { MonthlyBoard } from '../utils/scheduler';
import { toJpeg } from 'html-to-image';
import html2canvas from 'html2canvas';
import { API_BASE_URL } from '../utils/config';

import { INITIAL_COORDINATORS } from '../utils/constants';
import { generateSchedule } from '../utils/scheduler';

const PublicBoard: React.FC = () => {
    const [boards, setBoards] = useState<MonthlyBoard[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSharing, setIsSharing] = useState(false);
    const [isOffline, setIsOffline] = useState(false);
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
            // If API_BASE_URL is empty (production fallback), don't even try localhost
            if (!API_BASE_URL && window.location.hostname !== 'localhost') {
                throw new Error('No API configured');
            }

            const resp = await axios.get(`${API_BASE_URL}/api/boards`);
            if (resp.data && Array.isArray(resp.data) && resp.data.length > 0) {
                // Auto-rolling: Show current month + next month
                const now = new Date();
                const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

                // Find index of current month
                const currentIdx = resp.data.findIndex((b: MonthlyBoard) => b.month === currentMonth);

                if (currentIdx !== -1) {
                    // Show current month and next month
                    setBoards(resp.data.slice(currentIdx, currentIdx + 2));
                } else {
                    // Fallback: if current month not found, show first 2 months
                    setBoards(resp.data.slice(0, 2));
                }
            } else {
                throw new Error('Empty or invalid data');
            }
        } catch (err) {
            console.warn('Using fallback data', err);
            setIsOffline(true);

            // 1. Try local storage first (last known admin changes)
            const savedBoards = localStorage.getItem('ifa_boards');
            const savedCoords = localStorage.getItem('ifa_coordinators');

            if (savedBoards && JSON.parse(savedBoards).length > 0) {
                const parsed = JSON.parse(savedBoards);
                const now = new Date();
                const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                const currentIdx = parsed.findIndex((b: MonthlyBoard) => b.month === currentMonth);

                if (currentIdx !== -1) {
                    setBoards(parsed.slice(currentIdx, currentIdx + 2));
                } else {
                    setBoards(parsed.slice(0, 2));
                }
            } else {
                // 2. Factory reset: Generate on the fly from constants
                const now = new Date();
                const startMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                const coordsToUse = savedCoords ? JSON.parse(savedCoords) : INITIAL_COORDINATORS;
                const { boards: fallbackBoards } = generateSchedule(coordsToUse, startMonth, 2);
                setBoards(fallbackBoards);
            }
        } finally {
            setLoading(false);
        }
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
                    {isOffline && (
                        <p className="text-amber-500 text-sm font-bold flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                            PREVIEW MODE (Generated Schedule)
                        </p>
                    )}
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

                                    return (
                                        <div key={wIdx} className="space-y-4">
                                            <div className="flex items-center gap-2 text-gray-400 font-bold text-lg mb-2">
                                                <Calendar size={20} className="text-gray-500" />
                                                <span>{weekLabel}</span>
                                            </div>

                                            {assignments.length === 0 ? (
                                                <div className="flex justify-center items-center py-6 text-gray-500 italic text-sm border border-dashed border-white/5 rounded-2xl">
                                                    No meetings in this range.
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {/* Friday Card */}
                                                    <div className="bg-[#242d3d] border border-blue-500/20 rounded-2xl p-6 flex flex-col gap-4 shadow-lg">
                                                        <div className="flex items-center gap-2 text-blue-400">
                                                            <Calendar size={18} />
                                                            <span className="font-bold text-sm uppercase tracking-wider">
                                                                Friday {friday ? getOrdinalDate(friday.date) : ''}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="bg-blue-500/10 p-2 rounded-full">
                                                                <User className="text-white" size={22} />
                                                            </div>
                                                            <span className="text-white text-xl font-bold leading-tight">
                                                                {friday ? friday.coordinatorName : 'No coordinator'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Sunday Card */}
                                                    <div className="bg-[#2b251e] border border-amber-500/20 rounded-2xl p-6 flex flex-col gap-4 shadow-lg">
                                                        <div className="flex items-center gap-2 text-amber-500">
                                                            <Calendar size={18} />
                                                            <span className="font-bold text-sm uppercase tracking-wider">
                                                                Sunday {sunday ? getOrdinalDate(sunday.date) : ''}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="bg-amber-500/10 p-2 rounded-full">
                                                                <User className="text-white" size={22} />
                                                            </div>
                                                            <span className="text-white text-xl font-bold leading-tight">
                                                                {sunday ? sunday.coordinatorName : 'No coordinator'}
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
