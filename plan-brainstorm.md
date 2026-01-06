The current manual process of creating the IFA Bonamoussadi Weekly Coordination board is tedious. We need a system that:

Automatically schedules 2 meetings per week (Friday and Sunday) for 6 months.
Respects a weighted "Star System".
Prevents double-booking within the same month.
Allows for manual overrides and availability-based adjustments.
2. The Star System Logic
The user's requirement: "The more stars one has the more likely he's to be programmed... not twice the same month."

Proposed Weighted Randomness:
Base Probability: Every participant has a baseline chance (e.g., 1 point).
Star Weight: Each star adds 1 (or more) extra point to their weight.
Weight = 1 + Stars
Monthly Constraint: Once a person is picked for a slot in Month $N$, they are removed from the candidate pool for all remaining slots in Month $N$.
Pool Refresh: The candidate pool resets at the start of each month.
Question for Discussion:
Should stars be consumed once someone is programmed? Or is the star count a permanent "preference level" for that person?
How do people earn stars? (e.g., Attendance, volunteering, or just manual assignment by admin?)
3. User Interface (UX/UI)
Since this is for a coordination board, it needs to be very visual.

Screen A: Dashboard (The Board)
A long horizontal calendar or a 2-column grid (Friday vs Sunday).
Each cell shows the Date and the Assigned Coordinator.
Micro-interaction: Clicking a name opens a dropdown to swap them with someone else (availability check).
CTA: "Regenerate Next 6 Months" button.
Screen B: Participant Directory
A list of the current names (Kollo David, Camille, etc.).
A "Star Selector" next to each name (1 to 5 stars).
Toggle for "Availability" (Global toggle if someone is on vacation).
4.- [/] Visual Theme Enhancement <!-- id: 29 -->
	- [/] Fix "@theme" lint warning by moving variables to :root <!-- id: 30 -->
	- [/] Implement professionally designed themed background <!-- id: 31 -->
	- [/] Add smooth transitions between theme elements <!-- id: 32 -->
"Locked" so a regeneration doesn't overwrite it.
5. Technical Considerations
Storage: No database. Data will be stored in JSON files on the server (e.g., data/coordinators.json, data/boards.json).
Security: Admin password will be checked server-side before any file modifications are allowed.
Mobile First: It should be easily readable on a phone (often how boards are shared).
6. Access Control & Roles
View-Only (Public Interface)
Accessible by default.
Shows the current 6-month coordination board.
No editing buttons, no star counts visible, no participant management.
Admin Dashboard (KDave237)
Accessed via a specific route (e.g., /admin) or a "Login" button.
Password Protected: Simple password check to unlock state mutation.
Granular Controls:
CRUD Coordinators: Add/Edit/Delete names and global availability (vacations).
CRUD Boards: Manually edit any slot, add custom months, or delete past months.
Targeted Regeneration: Instead of "wipe and restart all," allow regenerating just one specific month while keeping others locked.
Adjust Star Weights: Fine-tune priority levels.
Star System Revisited (Credit Model)
Earning Stars: Added manually by Admin ("Admin expressive addition").
Consumption: One star is consumed each time a coordinator is programmed for a meeting.
Equity Logic: By consuming stars, the system ensures that those with high stars get programmed first, but eventually, their priority drops, allowing others code to coordinate once their credits are used.
Monthly Exclusion: Still applies (max once per month).
Weekly Shuffle: Still applies (Friday $\neq$ Sunday).

===================================================

IFA Weekly Board Automator Implementation Plan
Automate the manual coordination board for IFA Bonamoussadi meetings with a star-consuming credit system.

Proposed Changes
Tech Stack & Initialization
Frontend: Vite + React + Tailwind CSS 4 (Pivot for premium aesthetics)
Backend: Node.js + Express (Local server)
Data Storage: Local JSON files (
data/coordinators.json
, data/boards.json)
Libraries: html2canvas (for JPEG export)
First Coordination Date: Friday, January 9, 2026.
Initial Coordinators:
Kollo David, 2. Kollo Doris, 3. Guy Ebamben, 4. Euinice Ebamben, 5. Mama CAROLINE, 6. Rémeiel, 7. MPILLA 1, 8. MPILLA 2, 9. Vanina Ndoumbe, 10. Jethro, 11. Edy, 12. Elie Phanuel, 13. Fabrice, 14. FEUTSAP 1, 15. FEUTSAP 2, 16. Mama AWAM, 17. Yvan AWAM, 18. Camille.
PublicBoard.tsx
Premium dark mode UI with Blue/Gold distinction for Friday/Sunday.
Export Feature: Add a "Share Board" button using html2canvas to download the board as a JPEG.
Limit: Public view restricted to 2 months maximum.
AdminDashboard.tsx
Full control over 18 names and credits.
Smart Override: If a name change creates a duplicate in the same month, trigger an automatic shuffle for future weeks to maintain fairness.
Logic
scheduler.ts
generateSchedule(participants, startDate)
:
Iterate through 6 months starting from startDate.
For each week, pick one person for Friday and one for Sunday.
Weights: Probability $\propto$ Current Star Count + 1.
Star Consumption: Decrement assigned participant's star count by 1 after each assignment (if stars > 0).
Constraint 1 (Weekly): Friday coordinator $\neq$ Sunday coordinator.
Constraint 2 (Monthly): No participant assigned more than once in the same calendar month.
Constraint 3 (Availability): Skip participants marked as "Unavailable" for those dates.
Return a list of assignments and the updated participant star counts.
Verification Plan
Automated Verification
I will write a script verify_constraints.js to:
Load the generated schedule.
Check if any participant appears more than once in the same month.
Run: node scripts/verify_constraints.js
Manual Verification
Browser Testing:
Open the app.
Verify pre-populated names are present.
Add a new name "Test User".
Click "Regenerate" and check if the name appears in the board.
Edit a specific entry and verify the change persists after reload.
Screenshot the final UI to show the "Premium" look.
