import * as BABYLON from '@babylonjs/core';
import { BaseScene } from './BaseScene';
import { useGeneralStore } from '@/stores/GeneralStore';

export class EntryScene extends BaseScene {
	constructor(engine: BABYLON.Engine) {
		super(engine);
		this.createDefaultCameraOrLight(true, true, true);

		// Graphical boot up here

		this.onReadyObservable.addOnce(() => {
			console.log('Entry scene loaded');
			setTimeout(() => {
				useGeneralStore.getState().gameEngine?.changeScene('test');
			}, 1000);
		});
	}
}
