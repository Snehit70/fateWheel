const crypto = require('crypto');

// Game Configuration
const SEGMENTS = [
    { number: 0, color: "green" },
    { number: 1, color: "red" },
    { number: 8, color: "black" },
    { number: 2, color: "red" },
    { number: 9, color: "black" },
    { number: 3, color: "red" },
    { number: 10, color: "black" },
    { number: 4, color: "red" },
    { number: 11, color: "black" },
    { number: 5, color: "red" },
    { number: 12, color: "black" },
    { number: 6, color: "red" },
    { number: 13, color: "black" },
    { number: 7, color: "red" },
    { number: 14, color: "black" },
];

// Secure Random Generator (Same as GameLoop.js)
function secureRandomInt(min, max) {
    const range = max - min;
    const bytesNeeded = Math.ceil(Math.log2(range) / 8);
    const maxBytes = Math.pow(256, bytesNeeded);
    const keep = maxBytes - (maxBytes % range);

    while (true) {
        const buffer = crypto.randomBytes(bytesNeeded);
        let value = 0;
        for (let i = 0; i < bytesNeeded; i++) {
            value = (value << 8) + buffer[i];
        }
        if (value < keep) {
            return min + (value % range);
        }
    }
}

function simulateRound() {
    const resultIndex = secureRandomInt(0, 15);
    return SEGMENTS[resultIndex];
}

function runSimulation(rounds = 1000000) {
    console.log(`Running simulation for ${rounds.toLocaleString()} rounds...`);

    const stats = {
        red: { hits: 0, bet: 100, payout: 200 },
        black: { hits: 0, bet: 100, payout: 200 },
        green: { hits: 0, bet: 100, payout: 1400 }, // 14x payout means you get 14 * bet (total return)
        even: { hits: 0, bet: 100, payout: 200 },
        odd: { hits: 0, bet: 100, payout: 200 },
        number: { hits: 0, bet: 100, payout: 1400 } // Specific number
    };

    let totalBet = 0;
    let totalWon = 0;

    // We will simulate placing 1 unit bet on EACH outcome type every round to see individual performance
    // Note: In a real game, you wouldn't bet on everything at once usually.
    // This calculates the theoretical return for EACH bet type independently.

    for (let i = 0; i < rounds; i++) {
        const result = simulateRound();

        // Check Red
        if (result.color === 'red') stats.red.hits++;

        // Check Black
        if (result.color === 'black') stats.black.hits++;

        // Check Green
        if (result.color === 'green') stats.green.hits++;

        // Check Even (excluding 0)
        if (result.number !== 0 && result.number % 2 === 0) stats.even.hits++;

        // Check Odd (excluding 0)
        if (result.number !== 0 && result.number % 2 !== 0) stats.odd.hits++;

        // Check Specific Number (e.g. betting on 7)
        if (result.number === 7) stats.number.hits++;
    }

    console.log('\n--- Simulation Results ---');

    // Calculate RTP for each type
    const calculateRTP = (type) => {
        const totalInvested = rounds * stats[type].bet;
        const totalReturned = stats[type].hits * stats[type].payout;
        const rtp = (totalReturned / totalInvested) * 100;
        const houseEdge = 100 - rtp;
        return { rtp, houseEdge, hits: stats[type].hits };
    };

    const printStat = (name, data) => {
        const { rtp, houseEdge, hits } = calculateRTP(name);
        const winChance = (hits / rounds) * 100;
        console.log(`\n${name.toUpperCase()}:`);
        console.log(`  Win Chance: ${winChance.toFixed(2)}% (Theoretical: ${(name === 'green' || name === 'number' ? 1 / 15 * 100 : 7 / 15 * 100).toFixed(2)}%)`);
        console.log(`  RTP (Return to Player): ${rtp.toFixed(2)}%`);
        console.log(`  House Edge: ${houseEdge.toFixed(2)}%`);
        console.log(`  Net Result (if betting 100 every round): ${((hits * stats[name].payout) - (rounds * stats[name].bet)).toLocaleString()}`);
    };

    printStat('red', stats.red);
    printStat('black', stats.black);
    printStat('green', stats.green);
    printStat('even', stats.even);
    printStat('odd', stats.odd);
    printStat('number', stats.number);

    console.log('\n--------------------------');
    console.log('Summary: The House Edge is consistently around 6.67% for all bets.');
}

runSimulation(1000000);
