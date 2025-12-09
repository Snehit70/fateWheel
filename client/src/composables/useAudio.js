import { ref } from 'vue';

const isMuted = ref(false);
const isAudioUnlocked = ref(false);
// Create audio instance once
const winAudio = new Audio('https://cdn.reamaze.com/audio/snapup.mp3');
winAudio.volume = 1.0;

export function useAudio() {

    const tryUnlockAudio = () => {
        if (isAudioUnlocked.value) return;

        // Attempt to play a silent moment or just resume context
        // For HTML5 Audio, simple play/pause in a user handler is often enough
        // to whitelist the element or the document.

        // We'll try to play it muted for a split second, then reset.
        // Or better, just mark us as having had interaction.
        // Actually, to be safe, let's just try to play() and catch.
        // If we are in a click handler, this will work.

        const originalVolume = winAudio.volume;
        winAudio.volume = 0;

        const promise = winAudio.play();

        if (promise !== undefined) {
            promise.then(() => {
                // Success!
                winAudio.pause();
                winAudio.currentTime = 0;
                winAudio.volume = 1.0; // Restore volume
                isAudioUnlocked.value = true;
                console.log("Audio unlocked successfully.");
            }).catch(e => {
                // Still failed
                console.debug("Audio unlock attempt failed (interaction needed):", e);
                winAudio.volume = originalVolume; // Restore
            });
        }
    };

    const playWinSound = () => {
        if (isMuted.value) return;

        winAudio.currentTime = 0;

        const promise = winAudio.play();
        if (promise !== undefined) {
            promise.catch(e => {
                console.error("Audio playback failed (check autoplay policy):", e);
                isAudioUnlocked.value = false;
            });
        }
    };

    const toggleMute = () => {
        isMuted.value = !isMuted.value;
    };

    return {
        isMuted,
        isAudioUnlocked,
        toggleMute,
        playWinSound,
        tryUnlockAudio
    };
}
