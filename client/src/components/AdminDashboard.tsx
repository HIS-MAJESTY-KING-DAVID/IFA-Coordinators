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
import { generateSchedule } from '../utils/scheduler';
import { API_BASE_URL } from '../utils/config';
import ThemeToggle from './ThemeToggle';
import ThemeSelect from './ThemeSelect';

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
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [editingPhoneId, setEditingPhoneId] = useState<string | null>(null);
    const [editingPhone, setEditingPhone] = useState('');
    const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
    const [newMonth, setNewMonth] = useState<string>('');
    const [autoDone, setAutoDone] = useState<boolean>(false);
    const [showPast, setShowPast] = useState<boolean>(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [health, setHealth] = useState<{ db_configured?: boolean; env?: string } | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        setApiError(null);
        try {
            const healthResp = await axios.get(`${API_BASE_URL}/api/health`);
            setHealth({ db_configured: !!healthResp.data?.db_configured, env: healthResp.data?.env });
            const [coordResp, boardResp] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/coordinators`),
                axios.get(`${API_BASE_URL}/api/boards`)
            ]);
            setCoordinators(coordResp.data);
            setBoards(boardResp.data);
            await autoGenerateNextMonthIfDue(coordResp.data, boardResp.data);
        } catch (err) {
            const message = (err as { message?: string })?.message || 'Network error';
            setApiError(`Failed to load data: ${message}`);
            console.error('Fetch failed', err);
        } finally {
            setLoading(false);
        }
    };

    const saveCoordinators = async (list: Coordinator[]) => {
        const prev = coordinators;
        setCoordinators(list);
        try {
            await axios.post(`${API_BASE_URL}/api/coordinators`, {
                password,
                coordinators: list
            });
        } catch (err) {
            console.error('Save failed', err);
            setCoordinators(prev);
        }
    };

    const saveBoards = async (list: MonthlyBoard[]) => {
        const prev = boards;
        setBoards(list);
        try {
            await axios.post(`${API_BASE_URL}/api/boards`, {
                password,
                boards: list
            });
        } catch (err) {
            console.error('Save failed', err);
            setBoards(prev);
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

    const handleUpdateName = (id: string, newName: string) => {
        if (!newName.trim()) return;

        // Update coordinator list
        const updatedCoords = coordinators.map(c =>
            c.id === id ? { ...c, name: newName.trim() } : c
        );
        saveCoordinators(updatedCoords);

        // PROPAGATION: Update Name in all board assignments across all months
        const updatedBoards = JSON.parse(JSON.stringify(boards)) as MonthlyBoard[];
        updatedBoards.forEach(month => {
            month.assignments.forEach(asss => {
                if (asss.coordinatorId === id) {
                    asss.coordinatorName = newName.trim();
                }
            });
        });
        saveBoards(updatedBoards);
    };

    const handleUpdatePhone = (id: string, newPhone: string) => {
        const cleaned = newPhone.trim();
        const updatedCoords = coordinators.map(c =>
            c.id === id ? { ...c, phone: cleaned || undefined } : c
        );
        saveCoordinators(updatedCoords);
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

    const upsertBoards = async (list: MonthlyBoard[]) => {
        try {
            await axios.post(`${API_BASE_URL}/api/boards`, {
                password,
                boards: list
            });
            await fetchData();
        } catch (err) {
            console.error('Upsert boards failed', err);
        }
    };

    const handleGenerateMonth = async (monthStr: string) => {
        if (!monthStr) return;
        const { boards: one, updatedCoordinators } = generateSchedule(coordinators, monthStr, 1);
        await upsertBoards(one);
        await saveCoordinators(updatedCoordinators);
        setNewMonth('');
    };

    const handleRegenerateMonth = async (monthStr: string) => {
        if (!monthStr) return;
        const nowMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        const isPastMonth = new Date(monthStr + '-01').getTime() < new Date(nowMonth + '-01').getTime();
        if (isPastMonth) {
            alert('Cannot modify historical months.');
            return;
        }
        const { boards: one, updatedCoordinators } = generateSchedule(coordinators, monthStr, 1);
        const idx = findBoardIndex(boards, monthStr);
        let nextBoards: MonthlyBoard[] = JSON.parse(JSON.stringify(boards)) as MonthlyBoard[];
        if (idx !== -1) {
            const merged = mergeFutureAssignments(boards[idx], one[0]);
            nextBoards[idx] = merged;
        } else {
            nextBoards = [...nextBoards, filterFutureAssignmentsOnly(one[0])];
        }
        await saveBoards(nextBoards);
        await saveCoordinators(updatedCoordinators);
    };

    const handleRegenerateSelected = async () => {
        if (selectedMonths.length === 0) return;
        const months = [...selectedMonths].sort();
        let currentCoors = JSON.parse(JSON.stringify(coordinators)) as Coordinator[];
        const updatedBoardsLocal: MonthlyBoard[] = JSON.parse(JSON.stringify(boards)) as MonthlyBoard[];
        for (const mStr of months) {
            const nowMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
            const isPastMonth = new Date(mStr + '-01').getTime() < new Date(nowMonth + '-01').getTime();
            if (isPastMonth) {
                continue;
            }
            const { boards: one, updatedCoordinators } = generateSchedule(currentCoors, mStr, 1);
            currentCoors = updatedCoordinators;
            const idx = findBoardIndex(updatedBoardsLocal, mStr);
            if (idx !== -1) {
                updatedBoardsLocal[idx] = mergeFutureAssignments(updatedBoardsLocal[idx], one[0]);
            } else {
                updatedBoardsLocal.push(filterFutureAssignmentsOnly(one[0]));
            }
        }
        await saveBoards(updatedBoardsLocal);
        await saveCoordinators(currentCoors);
        setSelectedMonths([]);
    };

    const autoGenerateNextMonthIfDue = async (coords: Coordinator[], existingBoards: MonthlyBoard[]) => {
        if (autoDone) return;
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const isSecondLast = now.getDate() === (daysInMonth - 1);
        if (!isSecondLast) return;
        const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const nextStr = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
        const exists = existingBoards.some(b => b.month === nextStr && (b.assignments?.length || 0) > 0);
        if (exists) return;
        const { boards: one, updatedCoordinators } = generateSchedule(coords, nextStr, 1);
        await upsertBoards(one);
        await saveCoordinators(updatedCoordinators);
        setAutoDone(true);
    };
    const findBoardIndex = (list: MonthlyBoard[], monthStr: string) => list.findIndex(b => b.month === monthStr);
    const pickCoordinator = (month: MonthlyBoard, excludeDate: string) => {
        const usedIds = new Set(month.assignments.filter(a => a.date !== excludeDate && a.coordinatorId).map(a => a.coordinatorId));
        const pool = coordinators.filter(c => c.available && !usedIds.has(c.id));
        if (pool.length === 0) return null;
        const totalWeight = pool.reduce((acc, c) => acc + (c.stars || 0) + 1, 0);
        let r = Math.random() * totalWeight;
        let pick = pool[0];
        for (const c of pool) {
            r -= (c.stars || 0) + 1;
            if (r <= 0) {
                pick = c;
                break;
            }
        }
        return pick;
    };
    const getWeekStart = (dateStr: string) => {
        const d = new Date(dateStr);
        const day = d.getDay();
        const start = new Date(d);
        start.setDate(d.getDate() - day);
        start.setHours(0, 0, 0, 0);
        return start;
    };
    const getCurrentWeekStart = () => {
        const now = new Date();
        const day = now.getDay();
        const start = new Date(now);
        start.setDate(now.getDate() - day);
        start.setHours(0, 0, 0, 0);
        return start;
    };
    const isFutureWeek = (dateStr: string) => {
        return getWeekStart(dateStr).getTime() > getCurrentWeekStart().getTime();
    };
    const mergeFutureAssignments = (original: MonthlyBoard, generated: MonthlyBoard): MonthlyBoard => {
        const map = new Map<string, typeof original.assignments[0]>();
        for (const a of generated.assignments) {
            map.set(`${a.date}|${a.type}`, a);
        }
        const merged: MonthlyBoard = { month: original.month, assignments: [] };
        for (const a of original.assignments) {
            const key = `${a.date}|${a.type}`;
            if (isFutureWeek(a.date) && map.has(key)) {
                const rep = map.get(key)!;
                merged.assignments.push({ ...rep, joined: false });
            } else {
                merged.assignments.push(a);
            }
        }
        merged.assignments.sort((x, y) => new Date(x.date).getTime() - new Date(y.date).getTime());
        return merged;
    };
    const filterFutureAssignmentsOnly = (board: MonthlyBoard): MonthlyBoard => {
        const list = board.assignments
            .filter(a => isFutureWeek(a.date))
            .map(a => ({ ...a, joined: false }));
        return { month: board.month, assignments: list.sort((x, y) => new Date(x.date).getTime() - new Date(y.date).getTime()) };
    };
    const [dupChecking, setDupChecking] = useState<string | null>(null);
    const [conflict, setConflict] = useState<{
        month: string;
        date: string;
        type: 'Friday' | 'Sunday';
        name: string;
        prevId?: string;
        prevName?: string;
        mIdx?: number;
        aIdx?: number;
    } | null>(null);
    const [manualAlt, setManualAlt] = useState<string>('');
    type AuditEvent = {
        action: string;
        resolution?: string | null;
        trigger?: string | null;
        month_start?: string | null;
        date?: string | null;
        type?: 'Friday' | 'Sunday' | null;
        previous_coordinator_id?: string | null;
        previous_coordinator_name?: string | null;
        new_coordinator_id?: string | null;
        new_coordinator_name?: string | null;
    };
    const logAudit = async (event: AuditEvent) => {
        try {
            await axios.post(`${API_BASE_URL}/api/audit`, { password, event });
        } catch {
            console.warn('Audit log failed');
        }
    };
    const hasDuplicateName = (month: MonthlyBoard, type: 'Friday' | 'Sunday', candidateName: string) => {
        const names = month.assignments.filter(a => a.type === type && a.coordinatorName).map(a => a.coordinatorName.toLowerCase());
        const count = names.filter(n => n === candidateName.toLowerCase()).length;
        return count > 1;
    };
    const resolveConflictAuto = async () => {
        if (!conflict) return;
        const updatedBoards = JSON.parse(JSON.stringify(boards)) as MonthlyBoard[];
        const mIdx = findBoardIndex(updatedBoards, conflict.month);
        if (mIdx === -1) return;
        const aIdx = updatedBoards[mIdx].assignments.findIndex(a => a.date === conflict.date && a.type === conflict.type);
        if (aIdx === -1) return;
        const pick = pickCoordinator(updatedBoards[mIdx], conflict.date);
        if (pick) {
            updatedBoards[mIdx].assignments[aIdx].coordinatorId = pick.id;
            updatedBoards[mIdx].assignments[aIdx].coordinatorName = pick.name;
            setConflict(null);
            await saveBoards(updatedBoards);
            await logAudit({
                action: 'duplicate_resolved_auto',
                resolution: 'auto_replace',
                trigger: 'conflict_modal',
                month_start: `${conflict.month}-01`,
                date: conflict.date,
                type: conflict.type,
                previous_coordinator_id: conflict.prevId || null,
                previous_coordinator_name: conflict.prevName || null,
                new_coordinator_id: pick.id,
                new_coordinator_name: pick.name
            });
        }
    };
    const resolveConflictManual = async () => {
        if (!conflict || !manualAlt.trim()) return;
        const match = coordinators.find(c => c.name.toLowerCase() === manualAlt.trim().toLowerCase());
        if (!match) {
            alert('Name not found among coordinators.');
            return;
        }
        const updatedBoards = JSON.parse(JSON.stringify(boards)) as MonthlyBoard[];
        const mIdx = findBoardIndex(updatedBoards, conflict.month);
        if (mIdx === -1) return;
        const aIdx = updatedBoards[mIdx].assignments.findIndex(a => a.date === conflict.date && a.type === conflict.type);
        if (aIdx === -1) return;
        updatedBoards[mIdx].assignments[aIdx].coordinatorId = match.id;
        updatedBoards[mIdx].assignments[aIdx].coordinatorName = match.name;
        if (hasDuplicateName(updatedBoards[mIdx], conflict.type, match.name)) {
            alert('Duplicate remains. Choose another name.');
            return;
        }
        setConflict(null);
        setManualAlt('');
        await saveBoards(updatedBoards);
        await logAudit({
            action: 'duplicate_resolved_manual',
            resolution: 'manual_entry',
            trigger: 'conflict_modal',
            month_start: `${conflict.month}-01`,
            date: conflict.date,
            type: conflict.type,
            previous_coordinator_id: conflict.prevId || null,
            previous_coordinator_name: conflict.prevName || null,
            new_coordinator_id: match.id,
            new_coordinator_name: match.name
        });
    };
    const handleManualAssignmentUpdate = (monthStr: string, dateStr: string, newCoordId: string) => {
        const newCoord = coordinators.find(c => c.id === newCoordId);
        if (!newCoord) return;
        const updatedBoards = JSON.parse(JSON.stringify(boards)) as MonthlyBoard[];
        const mIdx = findBoardIndex(updatedBoards, monthStr);
        if (mIdx === -1) return;
        const aIdx = updatedBoards[mIdx].assignments.findIndex(a => a.date === dateStr);
        if (aIdx === -1) return;
        setDupChecking(`${monthStr}:${dateStr}`);
        updatedBoards[mIdx].assignments[aIdx].coordinatorId = newCoord.id;
        updatedBoards[mIdx].assignments[aIdx].coordinatorName = newCoord.name;
        const isDup = hasDuplicateName(updatedBoards[mIdx], updatedBoards[mIdx].assignments[aIdx].type, newCoord.name);
        if (isDup) {
            setConflict({
                month: monthStr,
                date: dateStr,
                type: updatedBoards[mIdx].assignments[aIdx].type,
                name: newCoord.name,
                prevId: '',
                prevName: ''
            });
            logAudit({
                action: 'duplicate_detected',
                trigger: 'manual_assignment',
                month_start: `${monthStr}-01`,
                date: dateStr,
                type: updatedBoards[mIdx].assignments[aIdx].type,
                new_coordinator_id: newCoord.id,
                new_coordinator_name: newCoord.name
            });
        } else {
            saveBoards(updatedBoards);
        }
        setDupChecking(null);
    };
    const handleToggleJoined = async (monthStr: string, dateStr: string, type: 'Friday' | 'Sunday', checked: boolean) => {
        const updatedBoards = JSON.parse(JSON.stringify(boards)) as MonthlyBoard[];
        const updatedCoords = JSON.parse(JSON.stringify(coordinators)) as Coordinator[];
        const mIdx = findBoardIndex(updatedBoards, monthStr);
        if (mIdx === -1) {
            alert('Assignment not found in month. Please refresh.');
            return;
        }
        const aIdx = updatedBoards[mIdx].assignments.findIndex(a => a.date === dateStr && a.type === type);
        if (aIdx === -1) {
            alert('Assignment not found in month. Please refresh.');
            return;
        }
        setDupChecking(`${monthStr}:${dateStr}`);
        updatedBoards[mIdx].assignments[aIdx].joined = checked;
        if (checked) {
            updatedBoards[mIdx].assignments[aIdx].youthSunday = false;
        }
        if (checked) {
            updatedBoards[mIdx].assignments[aIdx].coordinatorId = '';
            updatedBoards[mIdx].assignments[aIdx].coordinatorName = '';
            await saveBoards(updatedBoards);
            await logAudit({
                action: 'joined_checked',
                trigger: 'joined_toggle',
                month_start: `${monthStr}-01`,
                date: dateStr,
                type,
                previous_coordinator_id: '',
                previous_coordinator_name: ''
            });
            setDupChecking(null);
            return;
        }
        const pick = pickCoordinator(updatedBoards[mIdx], dateStr);
        if (pick) {
            updatedBoards[mIdx].assignments[aIdx].coordinatorId = pick.id;
            updatedBoards[mIdx].assignments[aIdx].coordinatorName = pick.name;
            const coordIdx = updatedCoords.findIndex(c => c.id === pick.id);
            if (coordIdx !== -1 && updatedCoords[coordIdx].stars > 0) {
                updatedCoords[coordIdx].stars = updatedCoords[coordIdx].stars - 1;
            }
            if (hasDuplicateName(updatedBoards[mIdx], type, pick.name)) {
                setConflict({
                    month: monthStr,
                    date: dateStr,
                    type,
                    name: pick.name,
                    prevId: '',
                    prevName: ''
                });
                await logAudit({
                    action: 'duplicate_detected',
                    trigger: 'joined_toggle',
                    month_start: `${monthStr}-01`,
                    date: dateStr,
                    type,
                    new_coordinator_id: pick.id,
                    new_coordinator_name: pick.name
                });
            } else {
                await saveBoards(updatedBoards);
                await saveCoordinators(updatedCoords);
            }
        } else {
            updatedBoards[mIdx].assignments[aIdx].coordinatorId = '';
            updatedBoards[mIdx].assignments[aIdx].coordinatorName = '';
            await saveBoards(updatedBoards);
            alert('No available coordinator without duplicate for this month.');
        }
        setDupChecking(null);
    };
    const handleToggleYouth = async (monthStr: string, dateStr: string, type: 'Friday' | 'Sunday', checked: boolean) => {
        if (type !== 'Sunday') {
            alert('Youth Sunday applies only to Sunday meetings.');
            return;
        }
        const updatedBoards = JSON.parse(JSON.stringify(boards)) as MonthlyBoard[];
        const updatedCoords = JSON.parse(JSON.stringify(coordinators)) as Coordinator[];
        const mIdx = findBoardIndex(updatedBoards, monthStr);
        if (mIdx === -1) {
            alert('Assignment not found in month. Please refresh.');
            return;
        }
        const aIdx = updatedBoards[mIdx].assignments.findIndex(a => a.date === dateStr && a.type === type);
        if (aIdx === -1) {
            alert('Assignment not found in month. Please refresh.');
            return;
        }
        setDupChecking(`${monthStr}:${dateStr}`);
        updatedBoards[mIdx].assignments[aIdx].youthSunday = checked;
        if (checked) {
            updatedBoards[mIdx].assignments[aIdx].joined = false;
            updatedBoards[mIdx].assignments[aIdx].coordinatorId = '';
            updatedBoards[mIdx].assignments[aIdx].coordinatorName = '';
            await saveBoards(updatedBoards);
            await logAudit({
                action: 'youth_checked',
                trigger: 'youth_toggle',
                month_start: `${monthStr}-01`,
                date: dateStr,
                type,
                previous_coordinator_id: '',
                previous_coordinator_name: ''
            });
            setDupChecking(null);
            return;
        }
        const pick = pickCoordinator(updatedBoards[mIdx], dateStr);
        if (pick) {
            updatedBoards[mIdx].assignments[aIdx].coordinatorId = pick.id;
            updatedBoards[mIdx].assignments[aIdx].coordinatorName = pick.name;
            const coordIdx = updatedCoords.findIndex(c => c.id === pick.id);
            if (coordIdx !== -1 && updatedCoords[coordIdx].stars > 0) {
                updatedCoords[coordIdx].stars = updatedCoords[coordIdx].stars - 1;
            }
            if (hasDuplicateName(updatedBoards[mIdx], type, pick.name)) {
                setConflict({
                    month: monthStr,
                    date: dateStr,
                    type,
                    name: pick.name,
                    prevId: '',
                    prevName: ''
                });
                await logAudit({
                    action: 'duplicate_detected',
                    trigger: 'youth_toggle',
                    month_start: `${monthStr}-01`,
                    date: dateStr,
                    type,
                    new_coordinator_id: pick.id,
                    new_coordinator_name: pick.name
                });
            } else {
                await saveBoards(updatedBoards);
                await saveCoordinators(updatedCoords);
            }
        } else {
            updatedBoards[mIdx].assignments[aIdx].coordinatorId = '';
            updatedBoards[mIdx].assignments[aIdx].coordinatorName = '';
            await saveBoards(updatedBoards);
            alert('No available coordinator without duplicate for this month.');
        }
        setDupChecking(null);
    };

    const getOrdinalDate = (dateStr: string) => {
        const d = parseInt(dateStr.split('-')[2]);
        const s = ["th", "st", "nd", "rd"];
        const v = d % 100;
        const suffix = s[(v - 20) % 10] || s[v] || s[0];
        return `${d}${suffix}`;
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

                <div className="flex gap-2 items-center bg-ifa-card p-1 rounded-xl border border-gray-800">
                    <ThemeToggle />
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
                    {dupChecking && (
                        <div className="flex items-center gap-3 bg-ifa-dark/50 border border-ifa-gold/30 text-ifa-gold px-4 py-2 rounded-xl">
                            <RefreshCw size={16} className="animate-spin" />
                            <span className="text-xs font-bold uppercase tracking-widest">Checking duplicates...</span>
                        </div>
                    )}
                    {apiError && (
                        <div className="flex items-center justify-between bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl">
                            <span className="text-xs font-bold uppercase tracking-widest">{apiError}</span>
                            <button
                                onClick={fetchData}
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
                    {conflict && (
                        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                            <div className="bg-ifa-card border border-gray-800 rounded-2xl p-6 w-[440px] space-y-4">
                                <div className="text-ifa-gold font-black text-lg">Duplicate Detected</div>
                                <div className="text-gray-300 text-sm">
                                    {conflict.type} {new Date(conflict.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })} in {conflict.month} has a duplicate: {conflict.name}.
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={resolveConflictAuto}
                                        className="flex-1 bg-ifa-gold text-ifa-dark font-black px-4 py-2 rounded-xl"
                                    >
                                        Auto Replace
                                    </button>
                                    <button
                                        onClick={() => setConflict(null)}
                                        className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 font-bold"
                                    >
                                        Cancel
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    <input
                                        value={manualAlt}
                                        onChange={(e) => setManualAlt(e.target.value)}
                                        placeholder="Enter alternative name"
                                        className="w-full bg-ifa-dark border border-gray-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-ifa-gold outline-none"
                                    />
                                    <button
                                        onClick={resolveConflictManual}
                                        className="w-full bg-blue-500/20 text-blue-400 font-black px-4 py-2 rounded-xl border border-blue-500/20"
                                    >
                                        Use Manual Name
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
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
                            className="bg-ifa-card border border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ifa-gold outline-none cursor-pointer"
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
                            className="bg-ifa-card border border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ifa-gold outline-none cursor-pointer"
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
                            className="bg-ifa-card border border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ifa-gold outline-none cursor-pointer"
                            aria-label="Sort by"
                        >
                            <option value="date">Sort by Date</option>
                            <option value="name">Sort by Name</option>
                        </select>
                        <label className="flex items-center gap-2 text-xs font-bold text-gray-400">
                            <input
                                type="checkbox"
                                checked={showPast}
                                onChange={(e) => setShowPast(e.target.checked)}
                            />
                            Show Past Months
                        </label>
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

                    <div className="bg-ifa-card border border-gray-800 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
                        <div className="flex items-center gap-4 text-left">
                            <div className="bg-ifa-gold/10 p-4 rounded-2xl text-ifa-gold">
                                <RefreshCw size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">Generate Month</h3>
                                <p className="text-gray-400 text-sm max-w-sm">Create planning for a specific month or selection.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                type="month"
                                value={newMonth}
                                onChange={(e) => setNewMonth(e.target.value)}
                                className="bg-ifa-dark border border-gray-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-ifa-gold outline-none"
                                aria-label="Target month"
                            />
                            <button
                                onClick={() => handleGenerateMonth(newMonth)}
                                className="flex items-center gap-2 bg-ifa-gold hover:bg-ifa-gold/90 text-ifa-dark font-black px-6 py-3 rounded-2xl transition-all shadow-xl"
                            >
                                <RefreshCw size={16} />
                                GENERATE MONTH
                            </button>
                            <button
                                onClick={handleRegenerateSelected}
                                className="flex items-center gap-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 font-black px-6 py-3 rounded-2xl transition-all border border-blue-500/20"
                            >
                                <RefreshCw size={16} />
                                REGENERATE SELECTED
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-10">
                        {boards
                            .filter(b => (filterMonth ? b.month === filterMonth : true))
                            .filter(b => {
                                if (showPast) return true;
                                const now = new Date();
                                const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                                return b.month >= currentMonth;
                            })
                            .sort((a, b) => new Date(a.month + '-01').getTime() - new Date(b.month + '-01').getTime())
                            .map((board, bIdx) => {
                                const [y, m] = board.month.split('-');
                                const mName = new Date(parseInt(y), parseInt(m) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

                                return (
                                    <div key={bIdx} className="bg-ifa-card border border-gray-800 rounded-3xl overflow-hidden shadow-lg">
                                        <div className="bg-ifa-dark/50 p-6 border-b border-gray-800 flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedMonths.includes(board.month)}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        setSelectedMonths(prev => checked ? [...prev, board.month] : prev.filter(x => x !== board.month));
                                                    }}
                                                    className="rounded"
                                                    aria-label="Select month"
                                                />
                                                <h4 className="text-ifa-gold font-bold text-xl uppercase tracking-widest">{mName}</h4>
                                            </div>
                                            <button
                                                onClick={() => handleRegenerateMonth(board.month)}
                                                className="px-3 py-1 rounded-lg text-xs font-black bg-ifa-gold text-ifa-dark hover:bg-ifa-gold/90 transition-all"
                                            >
                                                Regenerate
                                            </button>
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
                                                        .filter(as => as.date.startsWith(board.month)) // Enforce strict month filtering
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
                                                            <tr
                                                                key={aIdx}
                                                                className={`transition-all ${(() => {
                                                                    const range = getCurrentWeekRangeForMonth(board.month);
                                                                    const day = parseInt(as.date.split('-')[2], 10);
                                                                    const isCurrent = !!range && day >= range.start && day <= range.end;
                                                                    return isCurrent ? 'bg-ifa-gold/5 hover:bg-ifa-gold/10' : 'hover:bg-white/5';
                                                                })()}`}
                                                            >
                                                                <td className="px-6 py-4">
                                                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${as.type === 'Friday' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                                                        }`}>
                                                                        {as.type} {getOrdinalDate(as.date)}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 text-gray-300 font-medium">
                                                                    {new Date(as.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })}
                                                                </td>
                                                                <td className="px-6 py-4 font-bold italic text-white min-w-[200px]">
                                                                    <div className="flex items-center gap-3">
                                                                        <ThemeSelect
                                                                            className="w-full"
                                                                            value={as.coordinatorId}
                                                                            onChange={(val) => handleManualAssignmentUpdate(board.month, as.date, val)}
                                                                            options={coordinators.map(c => ({ value: c.id, label: c.name }))}
                                                                            disabled={as.joined || !!as.youthSunday}
                                                                        />
                                                                        <label className="flex items-center gap-2 text-xs font-bold text-gray-300">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={!!as.joined}
                                                                                onChange={(e) => handleToggleJoined(board.month, as.date, as.type, e.target.checked)}
                                                                            />
                                                                            Joined Service
                                                                        </label>
                                                                        {as.type === 'Sunday' && (
                                                                            <label className="flex items-center gap-2 text-xs font-bold text-purple-300">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={!!as.youthSunday}
                                                                                    onChange={(e) => handleToggleYouth(board.month, as.date, as.type, e.target.checked)}
                                                                                />
                                                                                Youth Sunday
                                                                            </label>
                                                                        )}
                                                                    </div>
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
                        <h3 className="text-xl font-bold text-ifa-gold mb-4">Past Analytics (Completed Meetings)</h3>
                        <div className="space-y-4">
                            {coordinators
                                .map(c => {
                                    const pastAssignments = boards.flatMap(b => b.assignments)
                                        .filter(a => a.coordinatorId === c.id)
                                        .filter(a => {
                                            const meetingDate = new Date(a.date);
                                            const today = new Date();
                                            today.setHours(0, 0, 0, 0);
                                            return meetingDate < today;
                                        })
                                        .sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime());
                                    
                                    return {
                                        id: c.id,
                                        name: c.name,
                                        count: pastAssignments.length,
                                        meetings: pastAssignments
                                    };
                                })
                                .filter(x => x.count > 0)
                                .sort((a, b) => b.count - a.count)
                                .slice(0, 10) // Top 10
                                .map((row, idx) => {
                                    const max = Math.max(1, ...coordinators.map(c => {
                                        return boards.flatMap(b => b.assignments)
                                            .filter(a => a.coordinatorId === c.id)
                                            .filter(a => new Date(a.date) < new Date())
                                            .length;
                                    }));
                                    const pct = Math.round((row.count / max) * 100);
                                    
                                    return (
                                        <div key={idx} className="bg-ifa-dark/30 p-4 rounded-2xl border border-gray-800/50">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="font-bold text-white text-lg">{row.name}</div>
                                                <div className="text-ifa-gold font-black text-xl">{row.count} <span className="text-xs text-gray-500 font-normal uppercase">meetings</span></div>
                                            </div>
                                            
                                            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mb-3">
                                                <div
                                                    className="h-full bg-gradient-to-r from-ifa-purple via-ifa-blue to-ifa-gold rounded-full"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                {row.meetings.slice(0, 5).map((m, mi) => (
                                                    <span key={mi} className={`text-[10px] font-bold px-2 py-1 rounded border ${
                                                        m.type === 'Friday' 
                                                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                                                            : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                    }`}>
                                                        {new Date(m.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </span>
                                                ))}
                                                {row.meetings.length > 5 && (
                                                    <span className="text-[10px] text-gray-500 py-1">+ {row.meetings.length - 5} more</span>
                                                )}
                                            </div>
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
                                    <div className="flex items-center gap-3 flex-1 mr-2">
                                        <div className="w-10 h-10 bg-ifa-dark rounded-xl flex items-center justify-center font-bold text-ifa-gold border border-gray-800 shrink-0">
                                            {c.name.charAt(0)}
                                        </div>
                                        {editingId === c.id ? (
                                            <input
                                                autoFocus
                                                className="bg-ifa-dark border border-ifa-gold/50 rounded-lg px-2 py-1 text-sm font-bold w-full outline-none"
                                                value={editingName}
                                                onChange={e => setEditingName(e.target.value)}
                                                onBlur={() => {
                                                    handleUpdateName(c.id, editingName);
                                                    setEditingId(null);
                                                }}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') {
                                                        handleUpdateName(c.id, editingName);
                                                        setEditingId(null);
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <div
                                                className="font-bold text-lg cursor-pointer hover:text-ifa-gold transition-colors"
                                                onClick={() => {
                                                    setEditingId(c.id);
                                                    setEditingName(c.name);
                                                }}
                                            >
                                                {c.name}
                                            </div>
                                        )}
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

                                <div className="mt-4 flex items-center gap-3">
                                    <input
                                        placeholder="Phone number"
                                        className="flex-1 bg-ifa-dark border border-gray-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-ifa-gold outline-none"
                                        value={editingPhoneId === c.id ? editingPhone : (c.phone || '')}
                                        onChange={e => {
                                            setEditingPhoneId(c.id);
                                            setEditingPhone(e.target.value);
                                        }}
                                        onBlur={() => {
                                            if (editingPhoneId === c.id) {
                                                handleUpdatePhone(c.id, editingPhone);
                                                setEditingPhoneId(null);
                                                setEditingPhone('');
                                            }
                                        }}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                handleUpdatePhone(c.id, editingPhone);
                                                setEditingPhoneId(null);
                                                setEditingPhone('');
                                            }
                                        }}
                                    />
                                    <a
                                        href={c.phone ? `tel:${c.phone}` : undefined}
                                        className={`px-3 py-2 rounded-xl text-xs font-bold ${c.phone ? 'bg-ifa-gold text-ifa-dark' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                                        aria-disabled={!c.phone}
                                    >
                                        Call
                                    </a>
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
