import { ref, onMounted, onUnmounted } from 'vue';
import socket from '../services/socket';
import { useAuthStore } from '../stores/auth';

export function useGameLogic() {
    const authStore = useAuthStore();

    // State
    const bets = ref([]);
    const isSpinning = ref(false);
    const rotation = ref(0);
    const lastResult = ref(null);
    const winnings = ref(0);
    const spinHistory = ref([]);
    const status = ref('');
    const timeLeft = ref(0);
    const transitionDuration = ref(0);

    let spinInterval = null;
    let endTime = 0;

    const SEGMENT_ANGLE = 360 / 15;
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

    const handleSpin = async (result, duration) => {
        isSpinning.value = true;
        lastResult.value = null;
        winnings.value = 0;

        // Start continuous spinning
        transitionDuration.value = 0;

        const animateSpin = () => {
            rotation.value += 15;
            spinInterval = requestAnimationFrame(animateSpin);
        };
        animateSpin();

        // Calculate rotation to land on the result
        const resultIndex = SEGMENTS.findIndex(s => s.number === result.number);

        // Let's stop continuous spin immediately and start the target transition
        if (spinInterval) cancelAnimationFrame(spinInterval);

        // Force reflow
        await new Promise(r => requestAnimationFrame(r));

        transitionDuration.value = duration;

        const randomOffset = 0.5 + (Math.random() * 0.8 - 0.4);
        const targetAngle = (resultIndex + randomOffset) * SEGMENT_ANGLE;

        const currentRot = rotation.value;
        const extraSpins = 5 * 360;

        const targetRotationMod = (180 - targetAngle);
        const currentMod = currentRot % 360;

        let diff = targetRotationMod - currentMod;
        while (diff < 0) diff += 360;

        const finalRotation = currentRot + extraSpins + diff;

        rotation.value = finalRotation;

        setTimeout(() => {
            lastResult.value = result;
            // calculateWinnings(result); // Removed: Server handles balance updates
        }, duration);
    };



    onMounted(() => {
        socket.connect();

        socket.on('gameState', (data) => {
            bets.value = data.bets;
            spinHistory.value = data.history;

            if (data.state === 'WAITING') {
                status.value = 'ROLLING IN';
                isSpinning.value = false;
                lastResult.value = null;
                winnings.value = 0;

                const newEndTime = Date.now() + (data.timeLeft * 1000);

                if (!endTime || Math.abs(newEndTime - endTime) > 200) {
                    endTime = newEndTime;
                }

                if (!spinInterval) {
                    spinInterval = setInterval(() => {
                        const remaining = Math.max(0, (endTime - Date.now()) / 1000);
                        timeLeft.value = remaining;
                        if (remaining <= 0) {
                            // Timer finished
                        }
                    }, 16);
                }

            } else if (data.state === 'SPINNING') {
                status.value = 'ROLLING...';
                isSpinning.value = true;
                if (spinInterval) {
                    clearInterval(spinInterval);
                    spinInterval = null;
                }
            } else if (data.state === 'RESULT') {
                status.value = 'RESULT';
                isSpinning.value = false;
                if (spinInterval) {
                    clearInterval(spinInterval);
                    spinInterval = null;
                }
            }
        });

        socket.on('spinResult', (data) => {
            handleSpin(data.result, data.duration);
        });
    });

    onUnmounted(() => {
        socket.disconnect();
        if (spinInterval) {
            clearInterval(spinInterval);
            cancelAnimationFrame(spinInterval);
        }
    });

    return {
        bets,
        isSpinning,
        rotation,
        lastResult,
        winnings,
        spinHistory,
        status,
        timeLeft,
        transitionDuration
    };
}
