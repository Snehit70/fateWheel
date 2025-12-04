import { ref, onMounted, onUnmounted } from 'vue';
import socket from '../services/socket';
import { useAuthStore } from '../stores/auth';
import { SEGMENTS, SEGMENT_ANGLE, ANIMATION, TIMING } from '../constants/game';

export function useGameLogic() {
    const authStore = useAuthStore();

    // State
    const bets = ref([]);
    const isSpinning = ref(false);
    const isAnimating = ref(false);
    const rotation = ref(0);
    const lastResult = ref(null);
    const winnings = ref(0);
    const spinHistory = ref([]);
    const status = ref('');
    const timeLeft = ref(0);
    const transitionDuration = ref(0);

    let spinInterval = null;
    let endTime = 0;

    const handleSpin = async (result, spinEndTime) => {
        isSpinning.value = true;
        isAnimating.value = true;
        lastResult.value = null;
        winnings.value = 0;

        // Calculate duration based on server timestamp
        const now = socket.getServerTime();
        // Add a small buffer for network latency if needed, but ideally we trust server time
        // If spinEndTime is in the past, we just snap to result? 
        // No, usually spinEndTime is in the future (5 seconds from start).

        let duration = Math.max(0, spinEndTime - now);

        // If duration is too small (e.g. late join), we might want to skip animation or speed it up.
        // For now, let's just use the calculated duration.

        // Start continuous spinning
        transitionDuration.value = 0;

        const animateSpin = () => {
            rotation.value += ANIMATION.ROTATION_SPEED;
            spinInterval = requestAnimationFrame(animateSpin);
        };
        animateSpin();

        // Calculate rotation to land on the result
        const resultIndex = SEGMENTS.findIndex(s => s.number === result.number);

        // Let's stop continuous spin immediately and start the target transition
        if (spinInterval) cancelAnimationFrame(spinInterval);

        // Force reflow
        await new Promise(r => requestAnimationFrame(r));

        transitionDuration.value = duration; // Use calculated duration

        const randomOffset = 0.5 + (Math.random() * 0.8 - 0.4);
        const targetAngle = (resultIndex + randomOffset) * SEGMENT_ANGLE;

        const currentRot = rotation.value;
        const extraSpins = ANIMATION.EXTRA_SPINS * 360;

        const targetRotationMod = (180 - targetAngle);
        const currentMod = currentRot % 360;

        let diff = targetRotationMod - currentMod;
        while (diff < 0) diff += 360;

        const finalRotation = currentRot + extraSpins + diff;

        rotation.value = finalRotation;

        setTimeout(() => {
            isAnimating.value = false;
            lastResult.value = result;
            isSpinning.value = false; // Ensure spinning stops after animation
            status.value = 'RESULT';
        }, duration);
    };

    onMounted(() => {
        socket.connect();

        socket.on('gameState', (data) => {
            bets.value = data.bets;
            spinHistory.value = data.history;

            // Sync Time
            if (data.endTime) {
                endTime = data.endTime;
            }

            if (data.state === 'WAITING') {
                status.value = 'ROLLING IN';
                isSpinning.value = false;
                isAnimating.value = false;
                lastResult.value = null;
                winnings.value = 0;

                if (!spinInterval) {
                    spinInterval = setInterval(() => {
                        const remaining = Math.max(0, (endTime - socket.getServerTime()) / 1000);
                        timeLeft.value = remaining;
                        if (remaining <= 0) {
                            // Timer finished
                        }
                    }, 100); // Update more frequently for smooth timer
                }

            } else if (data.state === 'SPINNING') {
                status.value = 'ROLLING...';
                isSpinning.value = true;
                if (spinInterval) {
                    clearInterval(spinInterval);
                    spinInterval = null;
                }
            } else if (data.state === 'RESULT') {
                if (!isAnimating.value) {
                    status.value = 'RESULT';
                    isSpinning.value = false;
                    // If we missed the spin event (late join), show result immediately
                    if (data.result) {
                        lastResult.value = data.result;
                    }
                }

                if (spinInterval) {
                    clearInterval(spinInterval);
                    spinInterval = null;
                }
            }
        });

        socket.on('spinResult', (data) => {
            handleSpin(data.result, data.endTime);
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
