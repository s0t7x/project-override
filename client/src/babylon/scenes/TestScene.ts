import * as BABYLON from '@babylonjs/core';
import { BaseScene } from './BaseScene';
import { useGeneralStore } from '@/stores/GeneralStore';

export class TestScene extends BaseScene {
	constructor(engine: BABYLON.Engine) {
		super(engine);

		// Light
		new BABYLON.HemisphericLight('light', new BABYLON.Vector3(1, 1, 0), this);

		// Camera
		const camera = new BABYLON.ArcRotateCamera('cam', Math.PI / 2, Math.PI / 4, 5, BABYLON.Vector3.Zero(), this);
		camera.attachControl(true);
		this.activeCamera = camera;

		// Mesh
		const sphere = BABYLON.MeshBuilder.CreateSphere('sphere', { diameter: 2 }, this);
		sphere.position = BABYLON.Vector3.Zero();

		// Material
		const mat = new BABYLON.StandardMaterial('mat', this);
		mat.diffuseColor = new BABYLON.Color3(0, 0, 1);
		sphere.material = mat;

		this.clearColor = new BABYLON.Color4(0.5, 0.5, 0.5, 1); // Light gray background
		console.log('Test scene loaded');

		this.onReadyObservable.addOnce(() => {
			const uiDirector = useGeneralStore.getState().gameEngine?.uiDirector;
			if (!uiDirector) return;
			uiDirector.showToast('Test toast lul!', 3000, 'bottom-right');

			uiDirector.showAlert(
				'Dev Build',
				`This is not even alpha.
Expect Bugs and thank you for testing!

Have Fun!`,
				() => {
					window.location.reload();
				}
			);

			// Example Toasts
			uiDirector.showToast('Welcome to the Test Scene!', 4000, 'top-left');
			setTimeout(() => {
				uiDirector.showToast('This toast is in the bottom-left corner and lasts 7 seconds.', 7000, 'bottom-left');
			}, 1000);
			console.log(uiDirector);
		});
	}
}
