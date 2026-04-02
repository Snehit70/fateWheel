import { ref, onMounted, onUnmounted } from 'vue';
import socket from '../services/socket';
import { useGameStore } from '../stores/game';
import { SEGMENTS, SEGMENT_ANGLE, ANIMATION, TIMING } from '../constants/game';
import { useAudio } from './useAudio';

export function useGameLogic() {
    const gameStore = useGameStore();
    const { playWinSound } = useAudio();

    // Animation-only state
    const rotation = ref(0);
    const transitionDuration = ref(0);
    const isAnimating = ref(false);

    let animationFrameId = null;
    let animationTimeout = null;
    let safetyTimeout = null;

    const handleSpin = async (result, spinEndTime) => {
        isAnimating.value = true;
        gameStore.lastResult = null;

        const now = socket.getServerTime();
        let duration = Math.max(0, spinEndTime - now);

        // Start continuous spinning
        transitionDuration.value = 0;
        const animateSpin = () => {
            rotation.value += ANIMATION.ROTATION_SPEED;
            animationFrameId = requestAnimationFrame(animateSpin);
        };
        animateSpin();

        // Calculate target rotation
        const resultIndex = SEGMENTS.findIndex(s => s.number === result.number);
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        await new Promise(r => requestAnimationFrame(r));

        if (isNaN(duration) || duration < ANIMATION.SPIN_MIN_DURATION) {
            duration = TIMING.SPIN_DURATION * 1000;
        }
        duration = Math.min(duration, ANIMATION.SPIN_MAX_DURATION);
        transitionDuration.value = duration;

        const randomOffset = 0.5 + (Math.random() * 0.8 - 0.4);
        const targetAngle = (resultIndex + randomOffset) * SEGMENT_ANGLE;
        const currentRot = rotation.value;
        const extraSpins = ANIMATION.EXTRA_SPINS * 360;
        const targetRotationMod = 180 - targetAngle;
        const currentMod = currentRot % 360;
        let diff = targetRotationMod - currentMod;
        while (diff < 0) diff += 360;
        rotation.value = currentRot + extraSpins + diff;

        const completeAnimation = () => {
            isAnimating.value = false;
            gameStore.lastResult = result;
            gameStore.status = 'RESULT';
            if (safetyTimeout) {
                clearTimeout(safetyTimeout);
                safetyTimeout = null;
            }
            playWinSound();
        };

        animationTimeout = setTimeout(completeAnimation, duration);
        safetyTimeout = setTimeout(() => {
            if (isAnimating.value) {
                console.warn('Safety timeout triggered - forcing wheel recovery');
                completeAnimation();
            }
        }, duration + ANIMATION.SAFETY_TIMEOUT_BUFFER);
    };

    onMounted(() => {
        // Listen for spin results (animation-only concern)
        socket.on('spinResult', (data) => {
            gameStore.isSpinning = true;
            handleSpin(data.result, data.endTime).catch(err => {
                console.error('Error in handleSpin:', err);
            });
        });

        // Handle late-join SPINNING state from gameState
        socket.on('gameState', (data) => {
            if (data.state === 'SPINNING' && data.targetResult && !isAnimating.value) {
                gameStore.isSpinning = true;
                handleSpin(data.targetResult, data.endTime || socket.getServerTime() + TIMING.SPIN_DURATION * 1000).catch(err => {
                    console.error('Error in late-join spin:', err);
                });
            }
        });

        // Visibility change re-sync
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                gameStore.requestState();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        socket._visibilityHandler = handleVisibilityChange;

        // Set up game store socket listeners
        gameStore.setupSocketListeners();
    });

    onUnmounted(() => {
        socket.off('spinResult');
        // gameState listener for late-join is cleaned up by gameStore

        if (socket._visibilityHandler) {
            document.removeEventListener('visibilitychange', socket._visibilityHandler);
            socket._visibilityHandler = null;
        }

        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        if (animationTimeout) {
            clearTimeout(animationTimeout);
            animationTimeout = null;
        }
        if (safetyTimeout) {
            clearTimeout(safetyTimeout);
            safetyTimeout = null;
        }
    });

    return {
        rotation,
        transitionDuration,
        isAnimating,
    };
}
