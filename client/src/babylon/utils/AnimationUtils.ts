import * as BABYLON from '@babylonjs/core';
import * as GUI from '@babylonjs/gui';

/**
 * A utility class for common animation tasks in Babylon.js.
 */
export class AnimationUtils {

    /**
     * Animates the alpha property of a GUI control.
     * 
     * @param scene The scene to run the animation in.
     * @param control The GUI control to animate.
     * @param toAlpha The target alpha value (0.0 to 1.0).
     * @param durationSeconds The duration of the animation in seconds.
     * @returns A promise that resolves when the animation is complete.
     */
    public static fadeAlpha(
        scene: BABYLON.Scene,
        control: GUI.Control,
        toAlpha: number,
        durationSeconds: number
    ): Promise<void> {
        return new Promise<void>((resolve) => {
            const currentAlpha = control.alpha;
            const frameRate = 60; // Standard frame rate for animations
            const totalFrames = durationSeconds * frameRate;

            const animation = new BABYLON.Animation(
                `guiAlphaFade_${control.name || "UnnamedControl"}_${Date.now()}`,
                "alpha",
                frameRate,
                BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );

            animation.setKeys([
                { frame: 0, value: currentAlpha },
                { frame: totalFrames, value: toAlpha }
            ]);
            
            // beginDirectAnimation returns an Animatable, which we can use to get an onAnimationEnd callback.
            const animatable = scene.beginDirectAnimation(
                control,
                [animation],
                0,
                totalFrames,
                false,
                1.0,
                () => {
                    // Ensure the final value is set precisely on completion.
                    control.alpha = toAlpha;
                    resolve();
                }
            );

            if (!animatable) {
                console.error(`AnimationUtils: Failed to begin direct animation for ${control.name || "UnnamedControl"}. Resolving promise to prevent hanging.`);
                // If animation fails to start, set final alpha and resolve immediately.
                control.alpha = toAlpha;
                resolve();
            }
        });
    }
}