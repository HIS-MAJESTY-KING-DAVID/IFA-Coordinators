export interface Coordinator {
    id: string;
    name: string;
    stars: number;
    available: boolean;
}

export interface Assignment {
    date: string;
    coordinatorId: string;
    coordinatorName: string;
    type: 'Friday' | 'Sunday';
}

export interface MonthlyBoard {
    month: string; // e.g. "2026-01"
    assignments: Assignment[];
}

export const generateSchedule = (
    coordinators: Coordinator[],
    startMonth: string,
    numMonths: number = 6
): { boards: MonthlyBoard[]; updatedCoordinators: Coordinator[] } => {
    const boards: MonthlyBoard[] = [];
    const currentCoordinators = JSON.parse(JSON.stringify(coordinators)) as Coordinator[];

    const [startYear, startMonthIdx] = startMonth.split('-').map(Number);
    let year = startYear;
    let month = startMonthIdx - 1; // 0-indexed

    for (let m = 0; m < numMonths; m++) {
        const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
        const assignments: Assignment[] = [];
        const usedInMonth: Set<string> = new Set();

        // Find all Fridays and Sundays in the month
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d);
            const dayOfWeek = date.getDay(); // 0: Sun, 5: Fri

            if (dayOfWeek === 5 || dayOfWeek === 0) {
                const type = dayOfWeek === 5 ? 'Friday' : 'Sunday';
                const dateStr = date.toISOString().split('T')[0];

                // Filter available and not used this month
                const pool = currentCoordinators.filter(c => c.available && !usedInMonth.has(c.id));

                if (pool.length > 0) {
                    // Weighted random pick
                    const totalWeight = pool.reduce((acc, c) => acc + (c.stars || 0) + 1, 0);
                    let r = Math.random() * totalWeight;
                    let pick: Coordinator = pool[0];

                    for (const c of pool) {
                        r -= (c.stars || 0) + 1;
                        if (r <= 0) {
                            pick = c;
                            break;
                        }
                    }

                    assignments.push({
                        date: dateStr,
                        coordinatorId: pick.id,
                        coordinatorName: pick.name,
                        type
                    });

                    usedInMonth.add(pick.id);
                    // Consume star
                    if (pick.stars > 0) pick.stars--;
                }
            }
        }

        boards.push({ month: monthStr, assignments });

        // Increment month
        month++;
        if (month > 11) {
            month = 0;
            year++;
        }
    }

    return { boards, updatedCoordinators: currentCoordinators };
};

export function smartShuffle(
    allBoards: MonthlyBoard[],
    coordinators: Coordinator[],
    changedMonthIdx: number,
    changedAssignmentIdx: number
): MonthlyBoard[] {
    const updatedBoards = JSON.parse(JSON.stringify(allBoards)) as MonthlyBoard[];
    const currentBoard = updatedBoards[changedMonthIdx];

    // Check for duplicates in current month
    const monthIds = currentBoard.assignments.map(a => a.coordinatorId);
    const hasDuplicates = monthIds.some((id, index) => monthIds.indexOf(id) !== index);

    if (hasDuplicates) {
        // PER REQUIREMENT: Trigger shuffle to fix upcoming weeks if double appearance
        // Re-pick for assignments from changedAssignmentIdx + 1 onwards in THIS month
        const usedInMonth = new Set(currentBoard.assignments.slice(0, changedAssignmentIdx + 1).map(a => a.coordinatorId));

        for (let i = changedAssignmentIdx + 1; i < currentBoard.assignments.length; i++) {
            const pool = coordinators.filter(c => c.available && !usedInMonth.has(c.id));
            if (pool.length > 0) {
                const pick = pool[Math.floor(Math.random() * pool.length)];
                currentBoard.assignments[i].coordinatorId = pick.id;
                currentBoard.assignments[i].coordinatorName = pick.name;
                usedInMonth.add(pick.id);
            }
        }

        // Regenerate future months entirely to be safe and fair
        // We'll just use a simple shuffle for those as well
        for (let m = changedMonthIdx + 1; m < updatedBoards.length; m++) {
            const usedThisMonth = new Set<string>();
            for (let i = 0; i < updatedBoards[m].assignments.length; i++) {
                const pool = coordinators.filter(c => c.available && !usedThisMonth.has(c.id));
                if (pool.length > 0) {
                    const pick = pool[Math.floor(Math.random() * pool.length)];
                    updatedBoards[m].assignments[i].coordinatorId = pick.id;
                    updatedBoards[m].assignments[i].coordinatorName = pick.name;
                    usedThisMonth.add(pick.id);
                }
            }
        }
    }

    return updatedBoards;
}
