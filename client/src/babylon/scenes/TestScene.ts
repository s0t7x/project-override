import * as BABYLON from '@babylonjs/core';
import { BaseScene } from './BaseScene';

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
	}
}
