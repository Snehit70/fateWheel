const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const crypto = require("crypto");

initializeApp();
const db = getFirestore();

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

/**
 * Securely generates a random integer between min (inclusive) and max (exclusive).
 */
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

exports.spinWheel = onCall({ cors: true }, async (request) => {
    // 1. Authentication Check
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
    }

    const uid = request.auth.uid;
    const userEmail = request.auth.token.email;
    const { bets } = request.data;

    // 2. Input Validation
    if (!Array.isArray(bets) || bets.length === 0) {
        throw new HttpsError("invalid-argument", "No bets placed.");
    }

    let totalBetAmount = 0;
    for (const bet of bets) {
        if (typeof bet.amount !== "number" || bet.amount <= 0) {
            throw new HttpsError("invalid-argument", "Invalid bet amount.");
        }
        if (!["number", "color"].includes(bet.type)) {
            throw new HttpsError("invalid-argument", "Invalid bet type.");
        }
        totalBetAmount += bet.amount;
    }

    const userRef = db.collection("users").doc(userEmail);

    // 3. Transaction
    return await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists) {
            throw new HttpsError("not-found", "User not found.");
        }

        const userData = userDoc.data();
        const currentBalance = userData.balance || 0;

        if (currentBalance < totalBetAmount) {
            throw new HttpsError("failed-precondition", "Insufficient balance.");
        }

        // 4. Generate Result
        const resultIndex = secureRandomInt(0, 15);
        const resultSegment = SEGMENTS[resultIndex];

        // 5. Calculate Winnings
        let totalWinnings = 0;
        for (const bet of bets) {
            if (bet.type === "number" && bet.value === resultSegment.number) {
                totalWinnings += bet.amount * 14;
            } else if (bet.type === "color" && bet.value === resultSegment.color) {
                totalWinnings += bet.amount * 2;
            }
        }

        // 6. Update Balance
        const newBalance = currentBalance - totalBetAmount + totalWinnings;
        transaction.update(userRef, { balance: newBalance });

        return {
            result: resultSegment,
            winnings: totalWinnings,
            balance: newBalance,
            previousBalance: currentBalance,
            totalBetAmount
        };
    });
});
