import * as BABYLON from '@babylonjs/core';
import { BaseScene } from './BaseScene';
import { useGeneralStore } from '@/stores/GeneralStore';
import { useServiceStore } from '@/stores/ServiceStore';

export class FirstTimeSetupScene extends BaseScene {
	constructor(engine: BABYLON.Engine) {
		super(engine);

		// Light
		new BABYLON.HemisphericLight('light', new BABYLON.Vector3(1, 1, 0), this);

		// Camera
		const camera = new BABYLON.ArcRotateCamera('cam', Math.PI / 2, Math.PI / 4, 5, BABYLON.Vector3.Zero(), this);
		camera.attachControl(true);
		this.activeCamera = camera;

		this.clearColor = new BABYLON.Color4(0, 0, 0, 1);

		this.onReadyObservable.addOnce(() => {
			const uiDirector = useGeneralStore.getState().gameEngine?.uiDirector;
			if (!uiDirector) return;

			const localStorage = useServiceStore.getState().localStorageService;
			if (localStorage) {
				const eulaAccepted = localStorage.getItem<boolean>('eulaAccepted');
				if (eulaAccepted) {
					useGeneralStore.getState().gameEngine?.changeScene('titleScreen');
					return;
				}
			}
			this.showEula(uiDirector);
		});
	}

	showEula(uiDirector: any) {
		uiDirector.showAlert(
				'EULA',
				`Bla bla bla! Some EULA lorem ipsum you blindly accept when pressing CONTINUE and playing this game.`,
				new Map([[
						'ACCEPT & CONTINUE',
						() => {
							const localStorage = useServiceStore.getState().localStorageService;
							if (localStorage) {
								localStorage.setItem('eulaAccepted', true);
							}
							uiDirector.closeAlert('EULA');
							useGeneralStore.getState().gameEngine?.changeScene('titleScreen');
						}
					]]
			))
	}
}
