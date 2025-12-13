const { format } = require('util');

// Mock function from formatters.js
const formatOnlyDate = (dateString, locale = 'en-GB') => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

// Simulation Params
const USER_SELECTED_DATE = '2025-12-12'; // User picks "12 Dec"
const BET_SCENARIOS = [
    { label: 'Bet on Dec 12 00:01 Local', timeStr: '2025-12-12T00:01:00' }, // Assume Local ISO Construction
    { label: 'Bet on Dec 12 12:00 Local', timeStr: '2025-12-12T12:00:00' },
    { label: 'Bet on Dec 12 23:59 Local', timeStr: '2025-12-12T23:59:00' },
    { label: 'Bet on Dec 13 00:01 Local', timeStr: '2025-12-13T00:01:00' },
    { label: 'Bet on Dec 12 20:00 UTC (Simulating previous issue)', utcStr: '2025-12-12T20:00:00Z' }
];

// Logic from History.vue (Local Calculation)
console.log('--- Filter Calculation (History.vue) ---');
console.log(`Selected Date: ${USER_SELECTED_DATE}`);
const [y, m, d] = USER_SELECTED_DATE.split('-').map(Number);
const start = new Date(y, m - 1, d, 0, 0, 0, 0);
const end = new Date(y, m - 1, d, 23, 59, 59, 999);

const startDateISO = start.toISOString();
const endDateISO = end.toISOString();

console.log(`Calculated Start (Local): ${start.toString()}`);
console.log(`Calculated End (Local):   ${end.toString()}`);
console.log(`Sent Start (ISO):         ${startDateISO}`);
console.log(`Sent End (ISO):           ${endDateISO}`);

console.log('\n--- Bet Verification ---');
BET_SCENARIOS.forEach(bet => {
    let betDate;
    if (bet.utcStr) {
        betDate = new Date(bet.utcStr);
    } else {
        // Construct local date explicitly for simulation if needed, or rely on parsing
        // In Node, new Date('YYYY-MM-DDTHH:mm:ss') parses as Local
        betDate = new Date(bet.timeStr);
    }

    const formatted = formatOnlyDate(betDate.toISOString());
    const inRange = betDate >= start && betDate <= end;

    console.log(`\nScenario: ${bet.label}`);
    console.log(`  Timestamp (Local): ${betDate.toString()}`);
    console.log(`  Timestamp (ISO):   ${betDate.toISOString()}`);
    console.log(`  Displayed Date:    ${formatted}`);
    console.log(`  In Filter Range?   ${inRange ? 'YES (Visible)' : 'NO (Hidden)'}`);

    if (inRange && formatted !== '12/12/2025') {
        console.error('  [BUG FOUND] Bet is Visible but Displayed Date mismatch!');
    }
    if (!inRange && formatted === '12/12/2025') {
        console.error('  [BUG FOUND] Bet is Hidden but Displayed Date says it should be visible!');
    }
});
