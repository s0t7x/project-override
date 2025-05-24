import * as BABYLON from '@babylonjs/core';
import { BaseScene } from './BaseScene';
import { useGeneralStore } from '@/stores/GeneralStore';
import { useNetworkStore } from '@/stores/NetworkStore';
import { NetworkService } from '@/services/NetworkService';
import { useServiceStore } from '@/stores/ServiceStore';

export class EntryScene extends BaseScene {
	constructor(engine: BABYLON.Engine) {
		super(engine);
		this.createDefaultCameraOrLight(true, true, true);

		// Graphical boot up here

		this.onReadyObservable.addOnce(() => {
			console.log('Entry scene loaded');
			(async () => {
				useServiceStore.getState().networkService?.initialize();
				if(useNetworkStore.getState().networkService?.isInitialized()) {
					useGeneralStore.getState().gameEngine?.changeScene('test');
				}
			})();
		});
	}
}
