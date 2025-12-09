import { ref, onMounted, onUnmounted } from 'vue';
import socket from '../services/socket';
import { useAuthStore } from '../stores/auth';
import { SEGMENTS, SEGMENT_ANGLE, ANIMATION, TIMING } from '../constants/game';
import { isClearPending } from './useBetting';
import { useAudio } from './useAudio';

export function useGameLogic() {
    const authStore = useAuthStore();
    const { playWinSound } = useAudio();

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

    let countdownInterval = null; // For the countdown timer
    let animationFrameId = null;  // For requestAnimationFrame spin animation
    let endTime = 0;

    const handleSpin = async (result, spinEndTime) => {
        isSpinning.value = true;
        isAnimating.value = true;
        lastResult.value = null;
        winnings.value = 0;

        // Stop countdown timer when spinning starts
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }

        // Calculate duration based on server timestamp
        const now = socket.getServerTime();

        let duration = Math.max(0, spinEndTime - now);

        // Start continuous spinning
        transitionDuration.value = 0;

        const animateSpin = () => {
            rotation.value += ANIMATION.ROTATION_SPEED;
            animationFrameId = requestAnimationFrame(animateSpin);
        };
        animateSpin();

        // Calculate rotation to land on the result
        const resultIndex = SEGMENTS.findIndex(s => s.number === result.number);

        // Stop continuous spin immediately and start the target transition
        if (animationFrameId) cancelAnimationFrame(animationFrameId);

        // Force reflow
        await new Promise(r => requestAnimationFrame(r));

        // Ensure minimum animation duration (never 0 or negative)
        // Also fallback if duration is NaN (serverTimeOffset not synced yet)
        const MIN_DURATION = 1000; // 1 second minimum
        const MAX_DURATION = 10000; // 10 second maximum safety cap
        if (isNaN(duration) || duration < MIN_DURATION) {
            duration = TIMING.SPIN_DURATION * 1000; // Fallback to configured duration
        }
        duration = Math.min(duration, MAX_DURATION); // Cap at max

        transitionDuration.value = duration;

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

        // Primary animation completion handler
        const completeAnimation = () => {
            isAnimating.value = false;
            lastResult.value = result;
            isSpinning.value = false;
            status.value = 'RESULT';

            // Play winning sound
            playWinSound();
        };

        // Set timeout for animation completion
        const animationTimeout = setTimeout(completeAnimation, duration);

        // Safety timeout: force recovery if still stuck after duration + buffer
        const safetyTimeout = setTimeout(() => {
            if (isAnimating.value || isSpinning.value) {
                console.warn('Safety timeout triggered - forcing wheel recovery');
                completeAnimation();
            }
        }, duration + 2000);

        // Clear safety timeout once animation completes normally
        setTimeout(() => clearTimeout(safetyTimeout), duration + 100);
    };

    onMounted(() => {
        socket.connect();

        socket.on('gameState', (data) => {
            // If a clear operation is pending, filter out current user's bets from the broadcast
            // to preserve the optimistic clear until the server confirms
            if (isClearPending() && authStore.user?.id) {
                const userId = authStore.user.id;
                bets.value = data.bets.filter(b => b.userId !== userId);
            } else {
                bets.value = data.bets;
            }
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

                if (!countdownInterval) {
                    countdownInterval = setInterval(() => {
                        const remaining = Math.max(0, (endTime - socket.getServerTime()) / 1000);
                        timeLeft.value = remaining;
                    }, 100); // Update more frequently for smooth timer
                }

            } else if (data.state === 'SPINNING') {
                status.value = 'ROLLING...';
                isSpinning.value = true;
                if (countdownInterval) {
                    clearInterval(countdownInterval);
                    countdownInterval = null;
                }
                // Late join handling
                if (data.targetResult && !isAnimating.value) {
                    handleSpin(data.targetResult, endTime);
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

                if (countdownInterval) {
                    clearInterval(countdownInterval);
                    countdownInterval = null;
                }
            }
        });

        socket.on('spinResult', (data) => {
            handleSpin(data.result, data.endTime);
        });
    });

    onUnmounted(() => {
        socket.disconnect();
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
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
