import * as BABYLON from '@babylonjs/core';
import { BaseScene } from './BaseScene';
import { useGeneralStore } from '@/stores/GeneralStore';
import { useNetworkStore } from '@/stores/NetworkStore';
import { useServices } from '@/context/Services';

export class EntryScene extends BaseScene {
	constructor(engine: BABYLON.Engine) {
		super(engine);
		this.createDefaultCameraOrLight(true, true, true);

		// Graphical boot up here

		this.onReadyObservable.addOnce(() => {
			console.log('Entry scene loaded');
			(async () => {
				useServices().networkService.initialize();
				useNetworkStore.
				useGeneralStore.getState().gameEngine?.changeScene('test');
			})();
		});
	}
}
