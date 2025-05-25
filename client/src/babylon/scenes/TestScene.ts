import * as BABYLON from '@babylonjs/core';
import { BaseScene } from './BaseScene';
import { useGeneralStore } from '@/stores/GeneralStore';
import { useServiceStore } from '@/stores/ServiceStore';
import { Button } from '@/react/common/Button';
import { WorldMeshBuilder } from '../utils/WorldMeshBuilder';
import { IWorldBlock } from '@project-override/shared/core/WorldBlock';
import { BlockDefinition } from '../utils/BlockDefinition';

import DEV_TESTMAP from '@/data/dev_TestMap.json'
import blockDefinitionsData from '@/data/DT_BlockDefinitions.json'

export class TestScene extends BaseScene {
	constructor(engine: BABYLON.Engine) {
		super(engine);

		// Light
		new BABYLON.HemisphericLight('light', new BABYLON.Vector3(1, 2, 0), this);

		// Camera
		const camera = new BABYLON.ArcRotateCamera('cam', Math.PI / 2, Math.PI / 4, 5, BABYLON.Vector3.Zero(), this);
		camera.attachControl(true);
		this.activeCamera = camera;

		this.clearColor = new BABYLON.Color4(0,0,0, 1); // Light gray background
		console.log('Test scene loaded');

		const worldBuilder = new WorldMeshBuilder(this, blockDefinitionsData);

		// Example world data (mimicking IGameRoomState.worldBlocks)
		const exampleInitialWorld: IWorldBlock[] = DEV_TESTMAP;

		worldBuilder.loadInitialWorld(exampleInitialWorld);

		this.onReadyObservable.addOnce(() => {
			const uiDirector = useGeneralStore.getState().gameEngine?.uiDirector;
			const bgmService = useServiceStore.getState().bgmService;
			if (!uiDirector || !bgmService) return;

			bgmService.play({ name: "menu_theme",
            filePath: "/assets/audio/bgm/MainframeOfTheForgottenRealm.mp3",
            loop: true,
            volume: 0.1}, 0);

			setTimeout(() => {
				uiDirector.showToast('Bitte klaue nicht meine Kicks!', 5000, 'bottom-left');
			}, 1000);
			// setTimeout(() => {
			// 	uiDirector.showToast('You`re running Dev Build #2483-2025-05-25', 5000, 'bottom-left');
			// }, 2000);
			console.log(uiDirector);
		});
	}
}
