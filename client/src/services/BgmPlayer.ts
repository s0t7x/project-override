// client/src/services/BgmPlayer.ts
// Static class to manage Background Music playback using HTMLAudioElement.
// Independent of BabylonJS scenes. (DEBUG VERSION)

// Type definition for BGM tracks
interface BgmTrack {
    name: string;       // Unique identifier for the track
    filePath: string;   // Path to the audio file (e.g., "/assets/music/menu_theme.ogg")
    volume?: number;    // Default volume (0 to 1)
    loop?: boolean;
}

export class BgmPlayer {
    private static currentAudio: HTMLAudioElement | null = null;
    private static currentTrackName: string | null = null;
    private static targetVolume: number = 0.3;
    private static isInitialized: boolean = false;
    private static audioContextUnlocked: boolean = false;
    private static unlockHandlerRef: (() => void) | null = null;
    private static dummyAudioUnlocker: HTMLAudioElement | null = null;
    private static currentFadeFrameId: number | null = null;

    // --- Initialization ---
    public static initialize(): void {
        if (this.isInitialized) {
            console.log("[BgmPlayer] Already initialized.");
            return;
        }
        console.log("[BgmPlayer] Initializing with HTMLAudioElement...");
        if (!this.dummyAudioUnlocker) {
            this.dummyAudioUnlocker = new Audio();
            this.dummyAudioUnlocker.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
            this.dummyAudioUnlocker.volume = 0;
            console.log("[BgmPlayer] Dummy audio element created.");
        }
        this.setupAudioUnlock();
        this.isInitialized = true;
        console.log("[BgmPlayer] Initialization complete.");
    }

    private static setupAudioUnlock(): void {
        if (this.unlockHandlerRef || !this.dummyAudioUnlocker) {
            console.log(`[BgmPlayer] setupAudioUnlock skipped (Handler exists: ${!!this.unlockHandlerRef}, Dummy exists: ${!!this.dummyAudioUnlocker})`);
            return;
        }
        console.log("[BgmPlayer] Setting up audio unlock listeners.");

        const handlerToRemove = this.unlockHandlerRef = () => {
            if (this.audioContextUnlocked || !handlerToRemove) {
                console.log("[BgmPlayer] Unlock handler called but already unlocked or ref missing.");
                return;
            }
            console.log("[BgmPlayer] User interaction detected. Attempting to unlock audio context...");
            this.unlockHandlerRef = null; // Clear ref *before* async

            const removeListeners = () => {
                console.log("[BgmPlayer] Removing unlock listeners.");
                window.removeEventListener('click', handlerToRemove!, true);
                window.removeEventListener('keydown', handlerToRemove!, true);
                window.removeEventListener('pointerdown', handlerToRemove!, true);
                window.removeEventListener('touchstart', handlerToRemove!, true);
            };

            const dummyAudio = this.dummyAudioUnlocker;
            if (!dummyAudio) {
                console.error("[BgmPlayer] Dummy audio element missing for unlock.");
                removeListeners();
                return;
            }

            console.log("[BgmPlayer] Attempting dummyAudio.play()...");
            const playPromise = dummyAudio.play();

            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log("[BgmPlayer] Dummy play() resolved. Audio context likely unlocked.");
                    this.audioContextUnlocked = true;
                    if (this.currentAudio) {
                        console.log(`[BgmPlayer] Retrying playback of "${this.currentTrackName}" after unlock, setting volume to ${this.targetVolume}.`);
                        this.currentAudio.volume = this.targetVolume;
                        this.currentAudio.play().catch(e => console.warn("[BgmPlayer] Error re-playing after unlock:", e));
                    }
                }).catch(error => {
                    console.warn(`[BgmPlayer] Dummy audio play failed (Error: ${error.name} - ${error.message}), context might still be locked or other issue exists.`);
                    this.audioContextUnlocked = true; // Tentatively set unlocked
                }).finally(() => {
                    removeListeners();
                });
            } else {
                 console.warn("[BgmPlayer] Audio playPromise undefined, assuming unlocked.");
                 this.audioContextUnlocked = true;
                 removeListeners();
            }
        };

        window.addEventListener('click', this.unlockHandlerRef, { once: true, capture: true });
        window.addEventListener('keydown', this.unlockHandlerRef, { once: true, capture: true });
        window.addEventListener('pointerdown', this.unlockHandlerRef, { once: true, capture: true });
        window.addEventListener('touchstart', this.unlockHandlerRef, { once: true, capture: true });
         console.log("[BgmPlayer] Unlock listeners attached.");
    }

    // --- Core Playback Methods ---
    public static async play(track: BgmTrack, fadeDuration: number = 1000, volume?: number): Promise<void> {
        if (!this.isInitialized) {
            console.error("[BgmPlayer] Play called but not initialized."); return;
        }

        const requestedTrackName = track.name;
        if (this.currentTrackName === requestedTrackName && this.currentAudio && !this.currentAudio.paused && this.currentAudio.currentTime > 0) {
            console.log(`[BgmPlayer] Track "${requestedTrackName}" already playing.`);
            if (volume !== undefined) this.setVolume(volume, fadeDuration);
            return;
        }
        console.log(`[BgmPlayer] Request play: "${requestedTrackName}" (Unlocked: ${this.audioContextUnlocked}, Current: ${this.currentTrackName})`);

        this.stopFade(); // Stop any previous fade FIRST

        const targetVol = volume !== undefined ? Math.max(0, Math.min(1, volume)) : this.targetVolume;
        this.targetVolume = targetVol;

        const oldAudio = this.currentAudio;
        const oldTrackName = this.currentTrackName;
        this.currentAudio = null;
        this.currentTrackName = null;

        console.log(`[BgmPlayer] Fading out old track: "${oldTrackName}" over ${fadeDuration}ms`);
        const fadeOutPromise = this.fadeAudioTo(oldAudio, 0, fadeDuration);

        console.log(`[BgmPlayer] Creating new Audio element for "${requestedTrackName}"`);
        const newAudio = new Audio(track.filePath);
        newAudio.loop = track.loop !== undefined ? track.loop : true;
        newAudio.volume = 0;
        newAudio.addEventListener('error', (e) => {
            console.error(`[BgmPlayer] <audio> error event for "${requestedTrackName}":`, e);
            if (this.currentAudio === newAudio) { this.currentAudio = null; this.currentTrackName = null; }
        });
        newAudio.addEventListener('canplaythrough', () => {
             console.log(`[BgmPlayer] "${requestedTrackName}" can play through.`);
        }, { once: true }); // Log when browser thinks it has enough data


        try {
            console.log(`[BgmPlayer] Waiting for fadeOut of "${oldTrackName}"...`);
            await fadeOutPromise;
            console.log(`[BgmPlayer] FadeOut of "${oldTrackName}" complete.`);
            if (oldAudio) {
                console.log(`[BgmPlayer] Pausing old track "${oldTrackName}" post-fade.`);
                oldAudio.pause();
                oldAudio.removeAttribute('src');
                oldAudio.load();
            }
        } catch (e) {
             console.warn("[BgmPlayer] Error waiting for old track fadeOut:", e);
        }

        // Assign new audio *after* dealing with old one
        console.log(`[BgmPlayer] Assigning new audio "${requestedTrackName}" as current.`);
        this.currentAudio = newAudio;
        this.currentTrackName = requestedTrackName;

        try {
            if (this.currentAudio === newAudio && this.currentTrackName === requestedTrackName) {
                console.log(`[BgmPlayer] Attempting play: "${requestedTrackName}" (Vol: ${this.currentAudio.volume}, Unlocked: ${this.audioContextUnlocked})`);
                await this.currentAudio.play();
                // Play succeeded (or at least didn't throw immediately)
                console.log(`[BgmPlayer] Play promise resolved for "${requestedTrackName}". Starting fade-in to ${targetVol}...`);
                this.fadeAudioTo(this.currentAudio, targetVol, fadeDuration); // Start fade-in
            } else {
                 console.log(`[BgmPlayer] Play request for "${requestedTrackName}" aborted (track changed during setup). Cleaning up new audio.`);
                 newAudio.pause();
                 newAudio.removeAttribute('src');
                 newAudio.load();
                 // Ensure static refs are correctly nulled if the abort happened after assignment
                 if (this.currentAudio === newAudio) {
                     this.currentAudio = null;
                     this.currentTrackName = null;
                 }
            }
        } catch (error: any) {
            console.warn(`[BgmPlayer] Playback blocked for "${requestedTrackName}" (Error: ${error.name} - ${error.message}). Current volume: ${this.currentAudio?.volume}. Waiting for unlock retry.`);
            // Volume remains 0, unlock handler will retry if needed.
        }
    }

    public static async stop(fadeDuration: number = 1000): Promise<void> {
         if (!this.isInitialized) { console.error("[BgmPlayer] Stop called but not initialized."); return; }
         console.log("[BgmPlayer] Request stop.");

         this.stopFade(); // Stop fade FIRST

         const audioToStop = this.currentAudio;
         const trackNameToStop = this.currentTrackName;
         this.currentAudio = null;
         this.currentTrackName = null;

         if (audioToStop) {
             console.log(`[BgmPlayer] Fading out stopped track "${trackNameToStop}" over ${fadeDuration}ms`);
             await this.fadeAudioTo(audioToStop, 0, fadeDuration); // Fade out the captured instance
             console.log(`[BgmPlayer] Pausing track "${trackNameToStop}" post-fade.`);
             audioToStop.pause();
             audioToStop.removeAttribute('src');
             audioToStop.load();
         }
         console.log("[BgmPlayer] Stop process complete.");
    }

    // --- Volume and Fading ---
    public static setVolume(volume: number, fadeDuration: number = 0): void {
        if (!this.isInitialized) { console.error("[BgmPlayer] setVolume called but not initialized."); return; }
        const newTargetVolume = Math.max(0, Math.min(1, volume));
        this.targetVolume = newTargetVolume;
        console.log(`[BgmPlayer] Set targetVolume: ${this.targetVolume}, Duration: ${fadeDuration}`);

        this.stopFade(); // Stop existing fade

        const audio = this.currentAudio;
        if (!audio) {
            console.log("[BgmPlayer] No track playing to set volume.");
            return;
        }

        if (audio.paused || audio.ended) {
            console.log("[BgmPlayer] Track paused/ended, setting volume directly.");
            audio.volume = this.targetVolume;
            return;
        }

        if (fadeDuration <= 0) {
            audio.volume = this.targetVolume;
            console.log(`[BgmPlayer] Volume set directly to: ${this.targetVolume}`);
        } else {
            console.log(`[BgmPlayer] Starting fade to volume: ${this.targetVolume}`);
            this.fadeAudioTo(audio, this.targetVolume, fadeDuration);
        }
    }

    /** Corrected Internal method to handle fading a specific HTMLAudioElement. */
    private static fadeAudioTo(audio: HTMLAudioElement | null, targetVol: number, duration: number): Promise<void> {
        // --- Stop any existing fade globally before starting a new one ---
        // This ensures only one fade runs at a time for simplicity.
        // If crossfades are needed, this logic needs significant change.
        this.stopFade();

        return new Promise((resolve) => {
            if (!audio || duration <= 0) {
                if (audio) {
                    audio.volume = targetVol;
                    console.log(`[BgmPlayer] Fade unnecessary or duration=0. Set volume to ${targetVol}.`);
                    if (targetVol === 0 && !audio.paused) audio.pause(); // Pause if fading out
                }
                resolve();
                return;
            }
             // Additional check: if already at target, resolve immediately
             if (audio.volume === targetVol) {
                 console.log(`[BgmPlayer] Already at target volume ${targetVol}. Fade skipped.`);
                 resolve();
                 return;
             }

            console.log(`[BgmPlayer] Starting fade for ${audio.src.split('/').pop()} from ${audio.volume.toFixed(2)} to ${targetVol.toFixed(2)} over ${duration}ms`);

            const startTime = performance.now();
            const startVol = audio.volume;
            const volDifference = targetVol - startVol;

            // Define the step function
            const step = (timestamp: number) => {
                // Check if the fade was cancelled externally (frameId nulled by stopFade)
                if (this.currentFadeFrameId === null) {
                    console.log("[BgmPlayer] Fade cancelled externally during step.");
                    resolve(); // Resolve promise as fade is over
                    return;
                }

                 // Check if the audio element itself became invalid during the fade
                 if (!audio || audio.paused || audio.ended) {
                     console.log("[BgmPlayer] Audio stopped/paused/ended during fade. Stopping fade.");
                     this.stopFade(); // Cancel the animation frame
                     resolve();
                     return;
                 }

                const elapsedTime = timestamp - startTime;
                const progress = Math.min(1, elapsedTime / duration);
                audio.volume = startVol + volDifference * progress;

                 // Log inside step
                 // console.log(`[BgmPlayer] Fade step: Time=${elapsedTime.toFixed(0)}ms, Progress=${progress.toFixed(2)}, Vol=${audio.volume.toFixed(2)}`);

                if (progress < 1) {
                    // Continue the loop, store the *new* frame ID
                    this.currentFadeFrameId = requestAnimationFrame(step);
                } else {
                    // Fade complete
                    audio.volume = targetVol; // Ensure final value
                     if (targetVol === 0) { // Pause if faded out completely
                         audio.pause();
                         console.log("[BgmPlayer] Paused track after fade out complete.");
                     }
                    this.currentFadeFrameId = null; // Clear the ID
                    console.log(`[BgmPlayer] Fade complete. Volume at ${audio.volume.toFixed(2)}.`);
                    resolve();
                }
            };

            // Start the animation loop and store the first frame's ID
            this.currentFadeFrameId = requestAnimationFrame(step);
            console.log(`[BgmPlayer] requestAnimationFrame initiated, frameId: ${this.currentFadeFrameId}`);
        });
    }

    /** Stops the currently active fade transition animation frame. */
    private static stopFade(): void {
        if (this.currentFadeFrameId !== null) {
            console.log("[BgmPlayer] Stopping active fade frame:", this.currentFadeFrameId);
            cancelAnimationFrame(this.currentFadeFrameId);
            this.currentFadeFrameId = null; // CRITICAL: Null out the ID so step function knows to stop
        }
    }

    // --- Getters ---
    public static getCurrentVolume(): number {
        return this.currentAudio?.volume ?? 0;
    }

    public static getTargetVolume(): number {
        return this.targetVolume;
    }

    public static isPlaying(): boolean {
         return this.currentAudio ? (!this.currentAudio.paused && !this.currentAudio.ended && this.currentAudio.readyState >= 3) : false;
     }

     public static getCurrentTrackName(): string | null {
         return this.currentTrackName;
     }
}