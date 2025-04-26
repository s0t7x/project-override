import * as B from '@babylonjs/core';
import * as BABYLON from '@babylonjs/core';
import { AssetService } from '../services/AssetService';
import { Vector3, TmpVectors, Observer, Nullable, Quaternion, Color3, SubMesh, StandardMaterial, MultiMaterial, Texture, MeshBuilder, Mesh } from '@babylonjs/core';
import { ICharacterCustomization, ICharacterEquipmentVisuals, ICharacterSummary, IColor3 } from '../../../shared/types';

// --- Constants (keep as they are) ---
const SHEET_COLUMNS = 24;
const SHEET_ROWS = 66;
const ANIMATION_DEFINITIONS = {
    'test_up': { startRow: 65, frames: 6, columnOffset: 0, durationMultiplier: 3.0 },
    'test_left': { startRow: 64, frames: 6, columnOffset: 0, durationMultiplier: 3.0 },
    'test_down': { startRow: 63, frames: 6, columnOffset: 0, durationMultiplier: 3.0 },
    'test_right': { startRow: 62, frames: 6, columnOffset: 0, durationMultiplier: 3.0 },
    'walk_up': { startRow: 57, frames: 8, columnOffset: 1, durationMultiplier: 1.0 },
    'walk_left': { startRow: 56, frames: 8, columnOffset: 1, durationMultiplier: 1.0 },
    'walk_down': { startRow: 55, frames: 8, columnOffset: 1, durationMultiplier: 1.0 },
    'walk_right': { startRow: 54, frames: 8, columnOffset: 1, durationMultiplier: 1.0 },
    'idle_up': { startRow: 43, frames: 2, columnOffset: 0, durationMultiplier: 4.0 },
    'idle_left': { startRow: 42, frames: 2, columnOffset: 0, durationMultiplier: 4.0 },
    'idle_down': { startRow: 41, frames: 2, columnOffset: 0, durationMultiplier: 4.0 },
    'idle_right': { startRow: 40, frames: 2, columnOffset: 0, durationMultiplier: 4.0 },
};
type AnimationName = keyof typeof ANIMATION_DEFINITIONS;
const DEFAULT_ANIMATION: AnimationName = 'idle_down';
const BASE_FRAME_DURATION = 120 / 1000;

export enum CharacterDirection {
    Up = 'up',
    Down = 'down',
    Left = 'left',
    Right = 'right'
}
const DEFAULT_DIRECTION = CharacterDirection.Down;

const HueShiftSpriteMaterialSnippet = {
    "tags": null,
    "ignoreAlpha": false,
    "maxSimultaneousLights": 4,
    "mode": 0,
    "forceAlphaBlending": false,
    "id": "node",
    "name": "node",
    "checkReadyOnEveryCall": false,
    "checkReadyOnlyOnce": false,
    "state": "",
    "alpha": 1,
    "backFaceCulling": true,
    "cullBackFaces": true,
    "alphaMode": 2,
    "_needDepthPrePass": false,
    "disableDepthWrite": false,
    "disableColorWrite": false,
    "forceDepthWrite": false,
    "depthFunction": 0,
    "separateCullingPass": false,
    "fogEnabled": true,
    "pointSize": 1,
    "zOffset": 0,
    "zOffsetUnits": 0,
    "pointsCloud": false,
    "fillMode": 0,
    "editorData": {
        "locations": [
            {
                "blockId": 5023,
                "x": 840,
                "y": 140,
                "isCollapsed": false
            },
            {
                "blockId": 5024,
                "x": 600,
                "y": 80,
                "isCollapsed": false
            },
            {
                "blockId": 5025,
                "x": 320,
                "y": 0,
                "isCollapsed": false
            },
            {
                "blockId": 5026,
                "x": 0,
                "y": 0,
                "isCollapsed": false
            },
            {
                "blockId": 5027,
                "x": 0,
                "y": 160,
                "isCollapsed": false
            },
            {
                "blockId": 5028,
                "x": 300,
                "y": 220,
                "isCollapsed": false
            },
            {
                "blockId": 5029,
                "x": 2740,
                "y": 500,
                "isCollapsed": false
            },
            {
                "blockId": 5030,
                "x": 2360,
                "y": -20,
                "isCollapsed": false
            },
            {
                "blockId": 5031,
                "x": 1840,
                "y": 280,
                "isCollapsed": false
            },
            {
                "blockId": 5032,
                "x": 1500,
                "y": 380,
                "isCollapsed": false
            },
            {
                "blockId": 5033,
                "x": 1400,
                "y": 780,
                "isCollapsed": false
            },
            {
                "blockId": 5034,
                "x": 1120,
                "y": 860,
                "isCollapsed": false
            },
            {
                "blockId": 5035,
                "x": 1060,
                "y": 340,
                "isCollapsed": false
            },
            {
                "blockId": 5036,
                "x": 820,
                "y": 340,
                "isCollapsed": false
            },
            {
                "blockId": 5037,
                "x": 400,
                "y": 440,
                "isCollapsed": false
            },
            {
                "blockId": 5038,
                "x": 0,
                "y": 500,
                "isCollapsed": false
            },
            {
                "blockId": 5039,
                "x": 760,
                "y": 840,
                "isCollapsed": false
            },
            {
                "blockId": 5040,
                "x": 300,
                "y": 880,
                "isCollapsed": false
            },
            {
                "blockId": 5041,
                "x": 500,
                "y": 980,
                "isCollapsed": false
            },
            {
                "blockId": 5042,
                "x": 2120,
                "y": -120,
                "isCollapsed": false
            },
            {
                "blockId": 5043,
                "x": 2160,
                "y": -400,
                "isCollapsed": false
            },
            {
                "blockId": 5044,
                "x": 1740,
                "y": -420,
                "isCollapsed": false
            },
            {
                "blockId": 5045,
                "x": 1560,
                "y": -360,
                "isCollapsed": false
            },
            {
                "blockId": 5046,
                "x": 1320,
                "y": -300,
                "isCollapsed": false
            },
            {
                "blockId": 5047,
                "x": 1040,
                "y": -280,
                "isCollapsed": false
            },
            {
                "blockId": 5048,
                "x": 1560,
                "y": -60,
                "isCollapsed": false
            },
            {
                "blockId": 5049,
                "x": 1200,
                "y": 40,
                "isCollapsed": false
            },
            {
                "blockId": 5050,
                "x": 860,
                "y": 600,
                "isCollapsed": false
            },
            {
                "blockId": 5051,
                "x": 400,
                "y": 760,
                "isCollapsed": false
            },
            {
                "blockId": 5052,
                "x": 1840,
                "y": -180,
                "isCollapsed": false
            },
            {
                "blockId": 5146,
                "x": 1860,
                "y": -40,
                "isCollapsed": false
            }
        ],
        "frames": [],
        "x": -529.2652835908264,
        "y": 326.0392125774333,
        "zoom": 0.6657303360494526
    },
    "customType": "BABYLON.NodeMaterial",
    "outputNodes": [
        5023,
        5029
    ],
    "blocks": [
        {
            "customType": "BABYLON.VertexOutputBlock",
            "id": 5023,
            "name": "VertexOutput",
            "comments": "",
            "visibleInInspector": false,
            "visibleOnFrame": false,
            "target": 1,
            "inputs": [
                {
                    "name": "vector",
                    "inputName": "vector",
                    "targetBlockId": 5024,
                    "targetConnectionName": "output",
                    "isExposedOnFrame": true,
                    "exposedPortPosition": -1
                }
            ],
            "outputs": []
        },
        {
            "customType": "BABYLON.TransformBlock",
            "id": 5024,
            "name": "WorldPos * ViewProjectionTransform",
            "comments": "",
            "visibleInInspector": false,
            "visibleOnFrame": false,
            "target": 1,
            "inputs": [
                {
                    "name": "vector",
                    "inputName": "vector",
                    "targetBlockId": 5025,
                    "targetConnectionName": "output",
                    "isExposedOnFrame": true,
                    "exposedPortPosition": -1
                },
                {
                    "name": "transform",
                    "inputName": "transform",
                    "targetBlockId": 5028,
                    "targetConnectionName": "output",
                    "isExposedOnFrame": true,
                    "exposedPortPosition": -1
                }
            ],
            "outputs": [
                {
                    "name": "output"
                },
                {
                    "name": "xyz"
                }
            ],
            "complementZ": 0,
            "complementW": 1
        },
        {
            "customType": "BABYLON.TransformBlock",
            "id": 5025,
            "name": "WorldPos",
            "comments": "",
            "visibleInInspector": false,
            "visibleOnFrame": false,
            "target": 1,
            "inputs": [
                {
                    "name": "vector",
                    "inputName": "vector",
                    "targetBlockId": 5026,
                    "targetConnectionName": "output",
                    "isExposedOnFrame": true,
                    "exposedPortPosition": -1
                },
                {
                    "name": "transform",
                    "inputName": "transform",
                    "targetBlockId": 5027,
                    "targetConnectionName": "output",
                    "isExposedOnFrame": true,
                    "exposedPortPosition": -1
                }
            ],
            "outputs": [
                {
                    "name": "output"
                },
                {
                    "name": "xyz"
                }
            ],
            "complementZ": 0,
            "complementW": 1
        },
        {
            "customType": "BABYLON.InputBlock",
            "id": 5026,
            "name": "position",
            "comments": "",
            "visibleInInspector": false,
            "visibleOnFrame": false,
            "target": 1,
            "inputs": [],
            "outputs": [
                {
                    "name": "output"
                }
            ],
            "type": 8,
            "mode": 1,
            "animationType": 0,
            "min": 0,
            "max": 0,
            "isBoolean": false,
            "matrixMode": 0,
            "isConstant": false,
            "groupInInspector": "",
            "convertToGammaSpace": false,
            "convertToLinearSpace": false
        },
        {
            "customType": "BABYLON.InputBlock",
            "id": 5027,
            "name": "World",
            "comments": "",
            "visibleInInspector": false,
            "visibleOnFrame": false,
            "target": 1,
            "inputs": [],
            "outputs": [
                {
                    "name": "output"
                }
            ],
            "type": 128,
            "mode": 0,
            "systemValue": 1,
            "animationType": 0,
            "min": 0,
            "max": 0,
            "isBoolean": false,
            "matrixMode": 0,
            "isConstant": false,
            "groupInInspector": "",
            "convertToGammaSpace": false,
            "convertToLinearSpace": false
        },
        {
            "customType": "BABYLON.InputBlock",
            "id": 5028,
            "name": "ViewProjection",
            "comments": "",
            "visibleInInspector": false,
            "visibleOnFrame": false,
            "target": 1,
            "inputs": [],
            "outputs": [
                {
                    "name": "output"
                }
            ],
            "type": 128,
            "mode": 0,
            "systemValue": 4,
            "animationType": 0,
            "min": 0,
            "max": 0,
            "isBoolean": false,
            "matrixMode": 0,
            "isConstant": false,
            "groupInInspector": "",
            "convertToGammaSpace": false,
            "convertToLinearSpace": false
        },
        {
            "customType": "BABYLON.FragmentOutputBlock",
            "id": 5029,
            "name": "FragmentOutput",
            "comments": "",
            "visibleInInspector": false,
            "visibleOnFrame": false,
            "target": 2,
            "inputs": [
                {
                    "name": "rgba"
                },
                {
                    "name": "rgb",
                    "inputName": "rgb",
                    "targetBlockId": 5030,
                    "targetConnectionName": "output",
                    "isExposedOnFrame": true,
                    "exposedPortPosition": -1
                },
                {
                    "name": "a",
                    "inputName": "a",
                    "targetBlockId": 5050,
                    "targetConnectionName": "output",
                    "isExposedOnFrame": true,
                    "exposedPortPosition": -1
                },
                {
                    "name": "glow"
                }
            ],
            "outputs": [],
            "convertToGammaSpace": false,
            "convertToLinearSpace": false,
            "useLogarithmicDepth": false
        },
        {
            "customType": "BABYLON.LerpBlock",
            "id": 5030,
            "name": "Lerp",
            "comments": "",
            "visibleInInspector": false,
            "visibleOnFrame": false,
            "target": 4,
            "inputs": [
                {
                    "name": "left",
                    "inputName": "left",
                    "targetBlockId": 5031,
                    "targetConnectionName": "rgb",
                    "isExposedOnFrame": true,
                    "exposedPortPosition": -1
                },
                {
                    "name": "right",
                    "inputName": "right",
                    "targetBlockId": 5042,
                    "targetConnectionName": "rgb",
                    "isExposedOnFrame": true,
                    "exposedPortPosition": -1
                },
                {
                    "name": "gradient",
                    "inputName": "gradient",
                    "targetBlockId": 5048,
                    "targetConnectionName": "output",
                    "isExposedOnFrame": true,
                    "exposedPortPosition": -1
                }
            ],
            "outputs": [
                {
                    "name": "output"
                }
            ]
        },
        {
            "customType": "BABYLON.ColorConverterBlock",
            "id": 5031,
            "name": "ColorConverter",
            "comments": "",
            "visibleInInspector": false,
            "visibleOnFrame": false,
            "target": 4,
            "inputs": [
                {
                    "name": "rgb ",
                    "isExposedOnFrame": true,
                    "exposedPortPosition": -1
                },
                {
                    "name": "hsl ",
                    "inputName": "hsl ",
                    "targetBlockId": 5032,
                    "targetConnectionName": "xyz",
                    "isExposedOnFrame": true,
                    "exposedPortPosition": -1
                }
            ],
            "outputs": [
                {
                    "name": "rgb"
                },
                {
                    "name": "hsl"
                }
            ]
        },
        {
            "customType": "BABYLON.VectorMergerBlock",
            "id": 5032,
            "name": "VectorMerger",
            "comments": "",
            "visibleInInspector": false,
            "visibleOnFrame": false,
            "target": 4,
            "inputs": [
                {
                    "name": "xyzw "
                },
                {
                    "name": "xyz "
                },
                {
                    "name": "xy "
                },
                {
                    "name": "zw "
                },
                {
                    "name": "x",
                    "inputName": "x",
                    "targetBlockId": 5033,
                    "targetConnectionName": "output",
                    "isExposedOnFrame": true,
                    "exposedPortPosition": -1
                },
                {
                    "name": "y",
                    "inputName": "y",
                    "targetBlockId": 5035,
                    "targetConnectionName": "y",
                    "isExposedOnFrame": true,
                    "exposedPortPosition": -1
                },
                {
                    "name": "z",
                    "inputName": "z",
                    "targetBlockId": 5035,
                    "targetConnectionName": "z",
                    "isExposedOnFrame": true,
                    "exposedPortPosition": -1
                },
                {
                    "name": "w"
                }
            ],
            "outputs": [
                {
                    "name": "xyzw"
                },
                {
                    "name": "xyz"
                },
                {
                    "name": "xy"
                },
                {
                    "name": "zw"
                }
            ],
            "xSwizzle": "x",
            "ySwizzle": "y",
            "zSwizzle": "z",
            "wSwizzle": "w"
        },
        {
            "customType": "BABYLON.TrigonometryBlock",
            "id": 5033,
            "name": "Fract",
            "comments": "",
            "visibleInInspector": false,
            "visibleOnFrame": false,
            "target": 4,
            "inputs": [
                {
                    "name": "input",
                    "inputName": "input",
                    "targetBlockId": 5034,
                    "targetConnectionName": "output",
                    "isExposedOnFrame": true,
                    "exposedPortPosition": -1
                }
            ],
            "outputs": [
                {
                    "name": "output"
                }
            ],
            "operation": 14
        },
        {
            "customType": "BABYLON.AddBlock",
            "id": 5034,
            "name": "Add",
            "comments": "",
            "visibleInInspector": false,
            "visibleOnFrame": false,
            "target": 4,
            "inputs": [
                {
                    "name": "left",
                    "inputName": "left",
                    "targetBlockId": 5035,
                    "targetConnectionName": "x",
                    "isExposedOnFrame": true,
                    "exposedPortPosition": -1
                },
                {
                    "name": "right",
                    "inputName": "right",
                    "targetBlockId": 5039,
                    "targetConnectionName": "output",
                    "isExposedOnFrame": true,
                    "exposedPortPosition": -1
                }
            ],
            "outputs": [
                {
                    "name": "output"
                }
            ]
        },
        {
            "customType": "BABYLON.VectorSplitterBlock",
            "id": 5035,
            "name": "VectorSplitter",
            "comments": "",
            "visibleInInspector": false,
            "visibleOnFrame": false,
            "target": 4,
            "inputs": [
                {
                    "name": "xyzw"
                },
                {
                    "name": "xyz ",
                    "inputName": "xyz ",
                    "targetBlockId": 5036,
                    "targetConnectionName": "hsl",
                    "isExposedOnFrame": true,
                    "exposedPortPosition": -1
                },
                {
                    "name": "xy "
                }
            ],
            "outputs": [
                {
                    "name": "xyz"
                },
                {
                    "name": "xy"
                },
                {
                    "name": "zw"
                },
                {
                    "name": "x"
                },
                {
                    "name": "y"
                },
                {
                    "name": "z"
                },
                {
                    "name": "w"
                }
            ]
        },
        {
            "customType": "BABYLON.ColorConverterBlock",
            "id": 5036,
            "name": "ColorConverter",
            "comments": "",
            "visibleInInspector": false,
            "visibleOnFrame": false,
            "target": 4,
            "inputs": [
                {
                    "name": "rgb ",
                    "inputName": "rgb ",
                    "targetBlockId": 5037,
                    "targetConnectionName": "rgb",
                    "isExposedOnFrame": true,
                    "exposedPortPosition": -1
                },
                {
                    "name": "hsl "
                }
            ],
            "outputs": [
                {
                    "name": "rgb"
                },
                {
                    "name": "hsl"
                }
            ]
        },
        {
            "customType": "BABYLON.TextureBlock",
            "id": 5037,
            "name": "diffuseTexture",
            "comments": "",
            "visibleInInspector": false,
            "visibleOnFrame": false,
            "target": 3,
            "inputs": [
                {
                    "name": "uv",
                    "inputName": "uv",
                    "targetBlockId": 5038,
                    "targetConnectionName": "output",
                    "isExposedOnFrame": true,
                    "exposedPortPosition": -1
                },
                {
                    "name": "source"
                },
                {
                    "name": "layer"
                },
                {
                    "name": "lod"
                }
            ],
            "outputs": [
                {
                    "name": "rgba"
                },
                {
                    "name": "rgb"
                },
                {
                    "name": "r"
                },
                {
                    "name": "g"
                },
                {
                    "name": "b"
                },
                {
                    "name": "a"
                },
                {
                    "name": "level"
                }
            ],
            "convertToGammaSpace": false,
            "convertToLinearSpace": false,
            "fragmentOnly": false,
            "disableLevelMultiplication": false
        },
        {
            "customType": "BABYLON.InputBlock",
            "id": 5038,
            "name": "uv",
            "comments": "",
            "visibleInInspector": false,
            "visibleOnFrame": false,
            "target": 1,
            "inputs": [],
            "outputs": [
                {
                    "name": "output"
                }
            ],
            "type": 4,
            "mode": 1,
            "animationType": 0,
            "min": 0,
            "max": 0,
            "isBoolean": false,
            "matrixMode": 0,
            "isConstant": false,
            "groupInInspector": "",
            "convertToGammaSpace": false,
            "convertToLinearSpace": false
        },
        {
            "customType": "BABYLON.DivideBlock",
            "id": 5039,
            "name": "Divide",
            "comments": "",
            "visibleInInspector": false,
            "visibleOnFrame": false,
            "target": 4,
            "inputs": [
                {
                    "name": "left",
                    "inputName": "left",
                    "targetBlockId": 5040,
                    "targetConnectionName": "output",
                    "isExposedOnFrame": true,
                    "exposedPortPosition": -1
                },
                {
                    "name": "right",
                    "inputName": "right",
                    "targetBlockId": 5041,
                    "targetConnectionName": "output",
                    "isExposedOnFrame": true,
                    "exposedPortPosition": -1
                }
            ],
            "outputs": [
                {
                    "name": "output"
                }
            ]
        },
        {
            "customType": "BABYLON.InputBlock",
            "id": 5040,
            "name": "hueShift",
            "comments": "",
            "visibleInInspector": true,
            "visibleOnFrame": false,
            "target": 1,
            "inputs": [],
            "outputs": [
                {
                    "name": "output"
                }
            ],
            "type": 1,
            "mode": 0,
            "animationType": 0,
            "min": 0,
            "max": 0,
            "isBoolean": false,
            "matrixMode": 0,
            "isConstant": false,
            "groupInInspector": "",
            "convertToGammaSpace": false,
            "convertToLinearSpace": false,
            "valueType": "number",
            "value": 120
        },
        {
            "customType": "BABYLON.InputBlock",
            "id": 5041,
            "name": "Float",
            "comments": "",
            "visibleInInspector": false,
            "visibleOnFrame": false,
            "target": 1,
            "inputs": [],
            "outputs": [
                {
                    "name": "output"
                }
            ],
            "type": 1,
            "mode": 0,
            "animationType": 0,
            "min": 0,
            "max": 0,
            "isBoolean": false,
            "matrixMode": 0,
            "isConstant": true,
            "groupInInspector": "",
            "convertToGammaSpace": false,
            "convertToLinearSpace": false,
            "valueType": "number",
            "value": 360
        },
        {
            "customType": "BABYLON.ColorConverterBlock",
            "id": 5042,
            "name": "ColorConverter",
            "comments": "",
            "visibleInInspector": false,
            "visibleOnFrame": false,
            "target": 4,
            "inputs": [
                {
                    "name": "rgb ",
                    "isExposedOnFrame": true,
                    "exposedPortPosition": -1
                },
                {
                    "name": "hsl ",
                    "inputName": "hsl ",
                    "targetBlockId": 5043,
                    "targetConnectionName": "xyz",
                    "isExposedOnFrame": true,
                    "exposedPortPosition": -1
                }
            ],
            "outputs": [
                {
                    "name": "rgb"
                },
                {
                    "name": "hsl"
                }
            ]
        },
        {
            "customType": "BABYLON.VectorMergerBlock",
            "id": 5043,
            "name": "VectorMerger",
            "comments": "",
            "visibleInInspector": false,
            "visibleOnFrame": false,
            "target": 4,
            "inputs": [
                {
                    "name": "xyzw "
                },
                {
                    "name": "xyz "
                },
                {
                    "name": "xy "
                },
                {
                    "name": "zw "
                },
                {
                    "name": "x",
                    "inputName": "x",
                    "targetBlockId": 5044,
                    "targetConnectionName": "x",
                    "isExposedOnFrame": true,
                    "exposedPortPosition": -1
                },
                {
                    "name": "y",
                    "inputName": "y",
                    "targetBlockId": 5052,
                    "targetConnectionName": "output",
                    "isExposedOnFrame": true,
                    "exposedPortPosition": -1
                },
                {
                    "name": "z",
                    "inputName": "z",
                    "targetBlockId": 5146,
                    "targetConnectionName": "output",
                    "isExposedOnFrame": true,
                    "exposedPortPosition": -1
                },
                {
                    "name": "w"
                }
            ],
            "outputs": [
                {
                    "name": "xyzw"
                },
                {
                    "name": "xyz"
                },
                {
                    "name": "xy"
                },
                {
                    "name": "zw"
                }
            ],
            "xSwizzle": "x",
            "ySwizzle": "y",
            "zSwizzle": "z",
            "wSwizzle": "w"
        },
        {
            "customType": "BABYLON.VectorSplitterBlock",
            "id": 5044,
            "name": "VectorSplitter",
            "comments": "",
            "visibleInInspector": false,
            "visibleOnFrame": false,
            "target": 4,
            "inputs": [
                {
                    "name": "xyzw"
                },
                {
                    "name": "xyz ",
                    "inputName": "xyz ",
                    "targetBlockId": 5045,
                    "targetConnectionName": "hsl",
                    "isExposedOnFrame": true,
                    "exposedPortPosition": -1
                },
                {
                    "name": "xy "
                }
            ],
            "outputs": [
                {
                    "name": "xyz"
                },
                {
                    "name": "xy"
                },
                {
                    "name": "zw"
                },
                {
                    "name": "x"
                },
                {
                    "name": "y"
                },
                {
                    "name": "z"
                },
                {
                    "name": "w"
                }
            ]
        },
        {
            "customType": "BABYLON.ColorConverterBlock",
            "id": 5045,
            "name": "ColorConverter",
            "comments": "",
            "visibleInInspector": false,
            "visibleOnFrame": false,
            "target": 4,
            "inputs": [
                {
                    "name": "rgb ",
                    "inputName": "rgb ",
                    "targetBlockId": 5046,
                    "targetConnectionName": "rgb",
                    "isExposedOnFrame": true,
                    "exposedPortPosition": -1
                },
                {
                    "name": "hsl "
                }
            ],
            "outputs": [
                {
                    "name": "rgb"
                },
                {
                    "name": "hsl"
                }
            ]
        },
        {
            "customType": "BABYLON.ColorSplitterBlock",
            "id": 5046,
            "name": "ColorSplitter",
            "comments": "",
            "visibleInInspector": false,
            "visibleOnFrame": false,
            "target": 4,
            "inputs": [
                {
                    "name": "rgba",
                    "inputName": "rgba",
                    "targetBlockId": 5047,
                    "targetConnectionName": "output",
                    "isExposedOnFrame": true,
                    "exposedPortPosition": -1
                },
                {
                    "name": "rgb "
                }
            ],
            "outputs": [
                {
                    "name": "rgb"
                },
                {
                    "name": "r"
                },
                {
                    "name": "g"
                },
                {
                    "name": "b"
                },
                {
                    "name": "a"
                }
            ]
        },
        {
            "customType": "BABYLON.InputBlock",
            "id": 5047,
            "name": "targetColor",
            "comments": "",
            "visibleInInspector": false,
            "visibleOnFrame": false,
            "target": 1,
            "inputs": [],
            "outputs": [
                {
                    "name": "output"
                }
            ],
            "type": 64,
            "mode": 0,
            "animationType": 0,
            "min": 0,
            "max": 0,
            "isBoolean": false,
            "matrixMode": 0,
            "isConstant": false,
            "groupInInspector": "",
            "convertToGammaSpace": false,
            "convertToLinearSpace": false,
            "valueType": "BABYLON.Color4",
            "value": [
                0,
                0,
                0,
                0
            ]
        },
        {
            "customType": "BABYLON.MultiplyBlock",
            "id": 5052,
            "name": "Multiply",
            "comments": "",
            "visibleInInspector": false,
            "visibleOnFrame": false,
            "target": 4,
            "inputs": [
                {
                    "name": "left",
                    "inputName": "left",
                    "targetBlockId": 5044,
                    "targetConnectionName": "y",
                    "isExposedOnFrame": true,
                    "exposedPortPosition": -1
                },
                {
                    "name": "right",
                    "inputName": "right",
                    "targetBlockId": 5035,
                    "targetConnectionName": "y",
                    "isExposedOnFrame": true,
                    "exposedPortPosition": -1
                }
            ],
            "outputs": [
                {
                    "name": "output"
                }
            ]
        },
        {
            "customType": "BABYLON.MultiplyBlock",
            "id": 5146,
            "name": "Multiply",
            "comments": "",
            "visibleInInspector": false,
            "visibleOnFrame": false,
            "target": 4,
            "inputs": [
                {
                    "name": "left",
                    "inputName": "left",
                    "targetBlockId": 5044,
                    "targetConnectionName": "z",
                    "isExposedOnFrame": true,
                    "exposedPortPosition": -1
                },
                {
                    "name": "right",
                    "inputName": "right",
                    "targetBlockId": 5035,
                    "targetConnectionName": "z",
                    "isExposedOnFrame": true,
                    "exposedPortPosition": -1
                }
            ],
            "outputs": [
                {
                    "name": "output"
                }
            ]
        },
        {
            "customType": "BABYLON.DivideBlock",
            "id": 5048,
            "name": "Divide",
            "comments": "",
            "visibleInInspector": false,
            "visibleOnFrame": false,
            "target": 4,
            "inputs": [
                {
                    "name": "left",
                    "inputName": "left",
                    "targetBlockId": 5046,
                    "targetConnectionName": "a",
                    "isExposedOnFrame": true,
                    "exposedPortPosition": -1
                },
                {
                    "name": "right",
                    "inputName": "right",
                    "targetBlockId": 5049,
                    "targetConnectionName": "output",
                    "isExposedOnFrame": true,
                    "exposedPortPosition": -1
                }
            ],
            "outputs": [
                {
                    "name": "output"
                }
            ]
        },
        {
            "customType": "BABYLON.InputBlock",
            "id": 5049,
            "name": "Float2",
            "comments": "",
            "visibleInInspector": false,
            "visibleOnFrame": false,
            "target": 1,
            "inputs": [],
            "outputs": [
                {
                    "name": "output"
                }
            ],
            "type": 1,
            "mode": 0,
            "animationType": 0,
            "min": 0,
            "max": 0,
            "isBoolean": false,
            "matrixMode": 0,
            "isConstant": true,
            "groupInInspector": "",
            "convertToGammaSpace": false,
            "convertToLinearSpace": false,
            "valueType": "number",
            "value": 255
        },
        {
            "customType": "BABYLON.MultiplyBlock",
            "id": 5050,
            "name": "Multiply",
            "comments": "",
            "visibleInInspector": false,
            "visibleOnFrame": false,
            "target": 4,
            "inputs": [
                {
                    "name": "left",
                    "inputName": "left",
                    "targetBlockId": 5037,
                    "targetConnectionName": "a",
                    "isExposedOnFrame": true,
                    "exposedPortPosition": -1
                },
                {
                    "name": "right",
                    "inputName": "right",
                    "targetBlockId": 5051,
                    "targetConnectionName": "output",
                    "isExposedOnFrame": true,
                    "exposedPortPosition": -1
                }
            ],
            "outputs": [
                {
                    "name": "output"
                }
            ]
        },
        {
            "customType": "BABYLON.InputBlock",
            "id": 5051,
            "name": "Material alpha",
            "comments": "",
            "visibleInInspector": false,
            "visibleOnFrame": false,
            "target": 1,
            "inputs": [],
            "outputs": [
                {
                    "name": "output"
                }
            ],
            "type": 1,
            "mode": 0,
            "systemValue": 11,
            "animationType": 0,
            "min": 0,
            "max": 0,
            "isBoolean": false,
            "matrixMode": 0,
            "isConstant": false,
            "groupInInspector": "",
            "convertToGammaSpace": false,
            "convertToLinearSpace": false
        }
    ],
    "uniqueId": 4
}
const HUE_SHIFT_TEXTURE_SAMPLER_NAME = "diffuseTexture";
const HUE_SHIFT_UNIFORM_NAME = "hueShift";

// ---

export class SpriteSheetCharacter {
    private scene: B.Scene;
    private assetService?: AssetService;
    public name: string;
    public plane: B.Mesh;
    private multiMaterial: B.MultiMaterial; // Renamed for clarity

    // Use StandardMaterial as created
    private material_base:          B.NodeMaterial;
    private material_eyes:          B.NodeMaterial;
    private material_hair:          B.NodeMaterial;
    private material_equip_legs:    B.NodeMaterial;
    private material_equip_body:    B.NodeMaterial;

    // Keep separate texture references for each layer
    private texture_base: B.Texture | null = null;
    private texture_eyes: B.Texture | null = null;
    private texture_hair: B.Texture | null = null;
    private texture_equip_legs: B.Texture | null = null;
    private texture_equip_body: B.Texture | null = null;

    // Logical view direction
    public lookDirection: CharacterDirection = DEFAULT_DIRECTION;
    private currentDirection: CharacterDirection = DEFAULT_DIRECTION; // Direction for sprite choice

    // Animation State
    public animationState: string | null = null; // e.g., 'walk', 'idle'
    private currentFullAnimation: AnimationName = DEFAULT_ANIMATION;
    private currentFrameIndex: number = 0;
    private animationTimer: number = 0;
    private currentFrameDuration: number = BASE_FRAME_DURATION;
    private isAnimationPlaying: boolean = true;

    private readonly uvScaleX: number = 1 / SHEET_COLUMNS;
    private readonly uvScaleY: number = 1 / SHEET_ROWS;
    private updateObserver: Nullable<Observer<B.Scene>> = null;

    private static baseHueShiftMaterial: Nullable<B.NodeMaterial> = null;

    public billboard: boolean = false;

    constructor(
        name: string,
        scene: B.Scene,
        assetService?: AssetService,
        initialPosition: B.Vector3 = Vector3.Zero()
    ) {
        this.name = name;
        this.scene = scene;
        this.assetService = assetService;

        if (!SpriteSheetCharacter.baseHueShiftMaterial) {
            const parsedMaterial = B.NodeMaterial.Parse(HueShiftSpriteMaterialSnippet, this.scene)
            parsedMaterial.backFaceCulling = false;
            parsedMaterial.alphaMode = B.Engine.ALPHA_COMBINE;
            // Store the parsed material
            SpriteSheetCharacter.baseHueShiftMaterial = parsedMaterial;
            console.log("[SpriteSheetCharacter] Base hue shift NodeMaterial loaded.");
        }

          // 1. Create the Plane Mesh
        this.plane = B.MeshBuilder.CreatePlane(`${name}_plane`, { size: 2 }, this.scene);
        this.plane.position = initialPosition.clone();
        this.plane.billboardMode = B.Mesh.BILLBOARDMODE_NONE; // Manual rotation
        this.plane.isPickable = false;
        this.plane.rotationQuaternion = Quaternion.Identity(); // Use Quaternion
        this.plane.visibility = 0;

        // 2. Create Individual Materials for Each Layer
        this.material_base = this.createLayerMaterial(`${name}_mat_base`, false);
        this.material_eyes = this.createLayerMaterial(`${name}_mat_eyes`, true);
        this.material_hair = this.createLayerMaterial(`${name}_mat_hair`, true);
        this.material_equip_legs = this.createLayerMaterial(`${name}_mat_equip_legs`, true);
        this.material_equip_body = this.createLayerMaterial(`${name}_mat_equip_body`, true);

        // 3. Create the MultiMaterial
        this.multiMaterial = new B.MultiMaterial(`${name}_multimat`, this.scene);
        this.multiMaterial.subMaterials.push(this.material_base); // Index 0
        this.multiMaterial.subMaterials.push(this.material_eyes); // Index 1
        this.multiMaterial.subMaterials.push(this.material_hair); // Index 2
        this.multiMaterial.subMaterials.push(this.material_equip_legs);
        this.multiMaterial.subMaterials.push(this.material_equip_body);

        // 4. Define SubMeshes
        // A standard plane has 4 vertices and 6 indices (0, 1, 2, 0, 2, 3)
        const vertexCount = 4;
        const indexCount = 6;
        this.plane.subMeshes = []; // Clear default submesh

        // Create a submesh for each material layer, all covering the entire geometry
        new B.SubMesh(0, 0, vertexCount, 0, indexCount, this.plane); // For material_base
        new B.SubMesh(1, 0, vertexCount, 0, indexCount, this.plane); // For material_eyes
        new B.SubMesh(2, 0, vertexCount, 0, indexCount, this.plane); // For material_hair
        new B.SubMesh(3, 0, vertexCount, 0, indexCount, this.plane);
        new B.SubMesh(4, 0, vertexCount, 0, indexCount, this.plane);

        // 5. Assign the MultiMaterial to the Plane
        this.plane.material = this.multiMaterial;

        this.updateObserver = this.scene.onBeforeRenderObservable.add(this.update);
        console.log(`[SpriteSheetCharacter:${this.name}] Initialized with MultiMaterial.`);
    }

    // private createLayerMaterial(name: string, disableDepthWrite: boolean): B.StandardMaterial {
    //     const material = new B.StandardMaterial(name, this.scene);

    //     material.useAlphaFromDiffuseTexture = true;
    //     material.diffuseTexture = null;

    //     // --- Alpha Blending Settings ---
    //     material.alphaMode = B.Engine.ALPHA_COMBINE;

    //     // --- Depth Settings ---
    //     material.disableDepthWrite = disableDepthWrite; 

    //     // --- Other common sprite settings ---
    //     material.backFaceCulling = false;            // Show back face if needed
    //     material.disableLighting = false;             // Sprites often ignore scene lighting

    //     return material;
    // }

    private createLayerMaterial(name: string, disableDepthWrite: boolean): B.NodeMaterial {
        if (!SpriteSheetCharacter.baseHueShiftMaterial) {
            // Handle case where material isn't loaded yet (important!)
            console.error(`[${name}] Base NodeMaterial not ready!`);
            // Return a temporary placeholder or throw error
            // ... (Placeholder logic from previous answer) ...
            const dummyMat = new B.StandardMaterial(name + "_dummy", this.scene);
            dummyMat.emissiveColor = Color3.Magenta();
            return dummyMat as any;
        }

        // <<< CLONE the base material >>>
        const material = SpriteSheetCharacter.baseHueShiftMaterial.clone(name);

        // Apply instance-specific settings
        material.disableDepthWrite = disableDepthWrite;
        material.alpha = 0.0; // Start invisible

        // Initialize texture sampler to null
        const samplerBlock = material.getBlockByName(HUE_SHIFT_TEXTURE_SAMPLER_NAME) as Nullable<B.TextureBlock>;
        if (samplerBlock) {
            samplerBlock.texture = null; // <<< Set the .texture property of the block
        } else {
            console.warn(`[${name}] Sampler block '${HUE_SHIFT_TEXTURE_SAMPLER_NAME}' not found during init.`);
        }

        // Initialize hue shift uniform to 0
        const inputBlock = material.getBlockByName(HUE_SHIFT_UNIFORM_NAME) as Nullable<B.InputBlock>;
        if (inputBlock) {
            inputBlock.value = 0;
        }

        return material;
    }

    // --- Helper function using NodeMaterial specifics ---
    private async loadLayerTexture(
        textureUrl: string | undefined | null,
        material: B.NodeMaterial,
        layerName: string
    ): Promise<Texture | null> {

        const samplerBlock = material.getBlockByName(HUE_SHIFT_TEXTURE_SAMPLER_NAME) as Nullable<B.TextureBlock>;
        if (!samplerBlock) {
            console.error(`[${this.name}] Cannot find sampler block '${HUE_SHIFT_TEXTURE_SAMPLER_NAME}' in material ${material.name}`);
            material.alpha = 0.0;
            return null;
        }
        // We don't necessarily need currentTexture ref here unless managing disposal carefully
        // let currentTexture: Texture | null = samplerBlock.texture ?? null;

        if (textureUrl && textureUrl.length > 0) {
            // --- Texture URL Provided ---
            try {
                let newTexture: B.Texture | null = null;
                let currentTextureInBlock = samplerBlock.texture; // Get texture currently in block
                const needsLoading = !currentTextureInBlock || currentTextureInBlock.url !== textureUrl;

                if (needsLoading) {
                    if (this.assetService) {
                        newTexture = await this.assetService.loadTexture(textureUrl);
                    } else {
                        // Dispose old manually ONLY if it exists and we loaded it (not from asset service)
                        currentTextureInBlock?.dispose();
                        newTexture = new B.Texture(textureUrl, this.scene, false, true, B.Texture.NEAREST_SAMPLINGMODE);
                    }
                } else {
                    newTexture = currentTextureInBlock; // Reuse existing texture
                }

                if (newTexture) {
                    newTexture.hasAlpha = true;
                    // --- CORRECT WAY to assign the texture ---
                    samplerBlock.texture = newTexture; // <<< Assign to the block's .texture property
                    material.alpha = 1.0;
                    console.log(`[SpriteSheetCharacter:${this.name}] ${layerName} Texture updated: ${textureUrl}`);
                    // needsUVUpdate = true; // Flag this in setCharacter if needed
                    return newTexture;
                } else {
                    // Loading failed
                    console.error(`[SpriteSheetCharacter:${this.name}] ${layerName} Texture failed to load: ${textureUrl}`);
                    if (needsLoading && !this.assetService) currentTextureInBlock?.dispose(); // Dispose if manually loaded
                    // --- CORRECT WAY to set null texture ---
                    samplerBlock.texture = null; // <<< Set block's texture to null
                    material.alpha = 0.0;
                    return null;
                } 
            } catch (error) {
                // Error during loading
                console.error(`[SpriteSheetCharacter:${this.name}] Error loading ${layerName} texture: ${textureUrl}`, error);
                // Consider if currentTextureInBlock needs disposal here based on needsLoading/assetService
                // --- CORRECT WAY to set null texture ---
                samplerBlock.texture = null; // <<< Set block's texture to null
                material.alpha = 0.0;
                return null;
            }
        } else {
            // --- No Texture URL Provided ---
            let currentTextureInBlock = samplerBlock.texture;
            if (currentTextureInBlock && !this.assetService) {
                currentTextureInBlock.dispose();
            }
            // --- CORRECT WAY to set null texture ---
            samplerBlock.texture = null; // <<< Set block's texture to null
            material.alpha = 0.0;
            console.log(`[SpriteSheetCharacter:${this.name}] ${layerName} Texture set to null. Material alpha = 0.`);
            return null;
        }
    }

    public async applyCustomization(customization: ICharacterCustomization | null) {
        console.log(`[SpriteSheetCharacter:${this.name}] Updating character customization.`);

        // --- Base Layer ---
        if (customization?.baseSpriteSheet) {
            try {
                const textureUrl = customization.baseSpriteSheet;
                let newTexture: B.Texture | null = await this.loadLayerTexture(customization?.baseSpriteSheet, this.material_base, "Base");
                if (newTexture) {
                    this.texture_base = newTexture;
                    this.texture_base.hasAlpha = true;
                    // this.material_base.diffuseTexture = this.texture_base;
                    // this.material_base.setTexture(HUE_SHIFT_TEXTURE_SAMPLER_NAME, this.texture_base);
                    console.log(`[SpriteSheetCharacter:${this.name}] Base Texture updated.`);
                } else {
                    console.error(`[SpriteSheetCharacter:${this.name}] Base Texture failed to load: ${textureUrl}`);
                    this.texture_base = null;
                    // this.material_base.diffuseTexture = null;
                    // this.material_base.setTexture(HUE_SHIFT_TEXTURE_SAMPLER_NAME, null);
                }
            } catch (error) {
                console.error(`[SpriteSheetCharacter:${this.name}] Error loading base texture: ${customization.baseSpriteSheet}`, error);
                this.texture_base = null;
                // this.material_base.diffuseTexture = null;
                // this.material_base.setTexture(HUE_SHIFT_TEXTURE_SAMPLER_NAME, null);
            }
        } else {
            this.texture_base = null;
            // this.material_base.diffuseTexture = null;
            // this.material_base.setTexture(HUE_SHIFT_TEXTURE_SAMPLER_NAME, null);
            this.texture_base = await this.loadLayerTexture(null, this.material_base, "Base");
        }

        // --- Hair Layer ---
        if (customization?.hairSpriteSheet && customization?.hairSpriteSheet.length > 0) {
            try {
                const textureUrl = customization.hairSpriteSheet;
                let newTexture: B.Texture | null = await this.loadLayerTexture(customization?.hairSpriteSheet, this.material_hair, "Hair");
                if (newTexture) {
                    this.texture_hair = newTexture;
                    this.texture_hair.hasAlpha = true;
                    // this.material_hair.diffuseTexture = this.texture_hair;
                    // this.material_hair.setTexture(HUE_SHIFT_TEXTURE_SAMPLER_NAME, this.texture_hair);
                    console.log(`[SpriteSheetCharacter:${this.name}] Hair Texture updated.`);
                    this.material_hair.alpha = 1.0;
                } else {
                    console.error(`[SpriteSheetCharacter:${this.name}] Hair Texture failed to load: ${textureUrl}`);
                    this.texture_hair = null;
                    // this.material_hair.diffuseTexture = null;
                    // this.material_hair.setTexture(HUE_SHIFT_TEXTURE_SAMPLER_NAME, null);
                    this.material_hair.alpha = 0.0;
                }
            } catch (error) {
                console.error(`[SpriteSheetCharacter:${this.name}] Error loading hair texture: ${customization.hairSpriteSheet}`, error);
                this.texture_hair = null;
                // this.material_hair.diffuseTexture = null;
                // this.material_hair.setTexture(HUE_SHIFT_TEXTURE_SAMPLER_NAME, null);
                this.material_hair.alpha = 0.0;
            }
        } else {
            this.texture_hair = null;
            // this.material_hair.diffuseTexture = null;
            // this.material_hair.setTexture(HUE_SHIFT_TEXTURE_SAMPLER_NAME, null);
            this.material_hair.alpha = 0.0;
            this.texture_hair = await this.loadLayerTexture(null, this.material_hair, "Hair");
        }

        // --- Eyes Layer (Add similarly if needed) ---
        if (customization?.eyesSpriteSheet && customization?.eyesSpriteSheet.length > 0) {
            try {
                const textureUrl = customization.eyesSpriteSheet;
                let newTexture: B.Texture | null = await this.loadLayerTexture(customization?.eyesSpriteSheet, this.material_eyes, "Eyes");
                if (newTexture) {
                    this.texture_eyes = newTexture;
                    this.texture_eyes.hasAlpha = true;
                    // this.material_eyes.diffuseTexture = this.texture_eyes;
                    // this.material_eyes.setTexture(HUE_SHIFT_TEXTURE_SAMPLER_NAME, this.texture_eyes);
                    console.log(`[SpriteSheetCharacter:${this.name}] Eyes Texture updated.`);
                    this.material_eyes.alpha = 1.0;
                } else {
                    console.error(`[SpriteSheetCharacter:${this.name}] Eyes Texture failed to load: ${textureUrl}`);
                    this.texture_eyes = null;
                    // this.material_eyes.diffuseTexture = null;
                    // this.material_eyes.setTexture(HUE_SHIFT_TEXTURE_SAMPLER_NAME, null);
                    this.material_eyes.alpha = 0.0;
                }
            } catch (error) {
                console.error(`[SpriteSheetCharacter:${this.name}] Error loading eyes texture: ${customization.eyesSpriteSheet}`, error);
                this.texture_eyes = null;
                // this.material_eyes.diffuseTexture = null;
                // this.material_eyes.setTexture(HUE_SHIFT_TEXTURE_SAMPLER_NAME, null);
                this.material_eyes.alpha = 0.0;
            }
        } else {
            this.texture_eyes = null;
            // this.material_eyes.diffuseTexture = null;
            // this.material_eyes.setTexture(HUE_SHIFT_TEXTURE_SAMPLER_NAME, null);
            this.material_eyes.alpha = 0.0;
            this.texture_eyes = await this.loadLayerTexture(null, this.material_eyes, "Eyes");
        }

        // Apply hue shift if needed (requires custom shader or node material)
        if (customization) {
            // this.applyHueShift(this.material_base, customization?.baseHue);
            // this.applyHueShift(this.material_eyes, customization?.eyesHue);
            // this.applyHueShift(this.material_hair, customization?.hairHue);
            this.colorizeBase(customization?.baseColor)
            this.colorizeHair(customization?.hairColor)
            this.colorizeEyes(customization?.eyesColor)
        }
    }

    public async applyEquipmentVisuals(equipmentVisuals: ICharacterEquipmentVisuals | null) {
     console.log(`[SpriteSheetCharacter:${this.name}] Updating character equipment visuals.`);
        // -- Body
        if (equipmentVisuals?.bodySpriteSheet) {
            try {
                const textureUrl = equipmentVisuals.bodySpriteSheet;
                let newTexture: B.Texture | null = await this.loadLayerTexture(textureUrl, this.material_equip_body, "Body");
                if (newTexture) {
                    this.texture_equip_body = newTexture;
                    this.texture_equip_body.hasAlpha = true;
                    console.log(`[SpriteSheetCharacter:${this.name}] Equipment Body Texture updated.`);
                } else {
                    console.error(`[SpriteSheetCharacter:${this.name}] Equipment Body Texture failed to load: ${textureUrl}`);
                    this.texture_equip_body = null;
                }
            } catch (error) {
                console.error(`[SpriteSheetCharacter:${this.name}] Error loading Equipment Body texture: ${equipmentVisuals.bodySpriteSheet}`, error);
                this.texture_equip_body = null;
            }
        } else {
            this.texture_equip_body = null;
            this.texture_equip_body = await this.loadLayerTexture(null, this.material_equip_body, "Body");
        }

        if (equipmentVisuals) {
            this.colorize(this.material_equip_body, equipmentVisuals?.bodyColor)
            this.applyHueShift(this.material_equip_body, equipmentVisuals?.bodyHueShift || 0)
            // this.colorizeHair(customization?.hairColor)
            // this.colorizeEyes(customization?.eyesColor)
        }
    }

    public async setCharacter(characterSummary: ICharacterSummary | null, initialAnimation?: AnimationName) {
        // --- Final Setup ---
        if (characterSummary) { // Require at least a base texture to be visible
            // Set initial animation state if provided or default
            await this.applyCustomization(characterSummary.customization || null);
            await this.applyEquipmentVisuals(characterSummary.equipmentVisuals || null);
            if(this.texture_base) {
                this.setAnimationInternal(initialAnimation || this.currentFullAnimation || DEFAULT_ANIMATION, true); // Force UV update
                this.plane.visibility = 1;
                console.log(`[SpriteSheetCharacter:${this.name}] Character setup complete. Visible.`);
                return;
            }
        }
        this.plane.visibility = 0;
        this.stopAnimation();
        console.log(`[SpriteSheetCharacter:${this.name}] No base texture or character summary. Hidden.`);
    }

    private applyHueShift(material: B.NodeMaterial, hue: number): void {
        const inputBlock = material.getBlockByName(HUE_SHIFT_UNIFORM_NAME) as Nullable<B.InputBlock>;
        if (inputBlock) {
            inputBlock.value = hue;
        }
    }

    private colorize(material: B.NodeMaterial, color: IColor3, strength: number = 255.0): void {
        if(!material) return;
        if(color.r + color.g + color.b == 0) return; // it never gets truly black but who the fuck will see anyway :)
        const inputBlock = material.getBlockByName("targetColor") as Nullable<B.InputBlock>;
        if (inputBlock) {
            inputBlock.value = new B.Color4(color.r, color.g, color.b, strength);
        }
    }

    public colorizeBase(color: IColor3, strength: number = 255.0): void {
        if (!this.material_base) return;
        this.colorize(this.material_base, color, strength);
    }

    public colorizeEyes(color: IColor3, strength: number = 255.0): void {
        if (!this.material_eyes) return;
        this.colorize(this.material_eyes, color, strength);
    }

    public colorizeHair(color: IColor3, strength: number = 255.0): void {
        if (!this.material_hair) return;
        this.colorize(this.material_hair, color, strength);
    }

    public stopAnimation(): void { this.isAnimationPlaying = false; }
    public resumeAnimation(): void { this.isAnimationPlaying = true; }
    public setPosition(position: B.Vector3): void { this.plane.position.copyFrom(position); }
    public getPosition(): B.Vector3 { return this.plane.position; }
    public hasTexture(): boolean { return this.texture_base !== null; } // Check base texture

    private update = (): void => {
        // Only update if visible and has a base texture
        if (this.plane.visibility === 0 || !this.texture_base) {
            return;
        }

        this.updateCurrentDirection();

        // Sprite Animation
        this.updateAnimationName(); // Determine correct animation based on state and direction
        this.advanceAnimationFrame(); // Advance frame if playing
    }

    // --- Direction Logic (Keep as is, seems fine) ---
    private updateCurrentDirection(): void {
        const cam = this.scene.activeCamera;
        const charPos = this.plane.position;

        if (!cam || !cam.getViewMatrix() || !this.plane.rotationQuaternion) return;

        // Use temporary vectors from the pool
        const viewDirectionXZ = TmpVectors.Vector3[0]; // Use index 0
        cam.getForwardRay(999, undefined, charPos).direction.scaleToRef(-1, viewDirectionXZ); // More direct way to get view dir towards point
        viewDirectionXZ.y = 0; // Project onto XZ plane


        if (viewDirectionXZ.lengthSquared() < 0.001) {
            // Camera is directly above or below, use lookDirection
            SpriteSheetCharacter.getDirectionVector(this.lookDirection, viewDirectionXZ);
            if (viewDirectionXZ.lengthSquared() < 0.001) { viewDirectionXZ.set(0, 0, -1); } // Ultimate fallback if lookDirection is zero?
        }
        viewDirectionXZ.normalize(); // Vector FROM character TOWARDS camera (on XZ plane)

        const cameraAngle = Math.atan2(viewDirectionXZ.x, viewDirectionXZ.z);

        // --- Rotation ---
        if (this.billboard) {
            // Simple billboard (face camera directly on Y axis)
            const angleToCamera = cameraAngle + Math.PI
            Quaternion.RotationYawPitchRollToRef(angleToCamera, 0, 0, this.plane.rotationQuaternion);
        } else {
            const targetAngle = Math.round(cameraAngle / (Math.PI / 2)) * (Math.PI / 2) + Math.PI;
            Quaternion.RotationYawPitchRollToRef(targetAngle, 0, 0, this.plane.rotationQuaternion); // Directly set rotation based on lookDirection
        }

        const characterLookVector = TmpVectors.Vector3[1]; // Use index 1
        SpriteSheetCharacter.getDirectionVector(this.lookDirection, characterLookVector);

        // Calculate angle between where character is looking and the camera direction
        const dot = Vector3.Dot(characterLookVector, viewDirectionXZ);
        const crossY = characterLookVector.z * viewDirectionXZ.x - characterLookVector.x * viewDirectionXZ.z; // Cross product Y component
        let relativeAngle = Math.atan2(crossY, dot); // Angle from characterLookVector to viewDirectionXZ (-PI to PI)

        const PI_4 = Math.PI / 4;
        const PI_34 = 3 * Math.PI / 4;
        let newSpriteDirection = this.currentDirection;

        // Determine sprite based on camera relative angle
        if (relativeAngle >= -PI_4 && relativeAngle < PI_4) {
            newSpriteDirection = CharacterDirection.Down; // Camera is in front
        } else if (relativeAngle >= PI_4 && relativeAngle < PI_34) {
            newSpriteDirection = CharacterDirection.Right; // Camera is to the right
        } else if (relativeAngle >= PI_34 || relativeAngle < -PI_34) {
            newSpriteDirection = CharacterDirection.Up;   // Camera is behind
        } else { // angle >= -PI_34 && angle < -PI_4
            newSpriteDirection = CharacterDirection.Left;  // Camera is to the left
        }


        // Only trigger animation change if the sprite direction changes
        if (newSpriteDirection !== this.currentDirection) {
            this.currentDirection = newSpriteDirection;
            // Don't call _updateUVs directly here, let updateAnimationName handle it
            this.updateAnimationName(true); // Force update if direction changes animation
        }
    }

    public applyAssetService(assetService: AssetService) {
        this.assetService = assetService;
        // Potentially reload textures if needed, or just use it for future loads
    }
    public turnAtCamera(): void {
        const cam = this.scene.activeCamera;
        const charPos = this.plane.position;

        if (!cam || !cam.getViewMatrix()) return;

        const viewDirectionXZ = TmpVectors.Vector3[4]; // Use a spare tmp vector
        cam.globalPosition.subtractToRef(charPos, viewDirectionXZ);
        viewDirectionXZ.y = 0;
        if (viewDirectionXZ.lengthSquared() < 0.001) return;

        viewDirectionXZ.normalize();

        const dot = Vector3.Dot(this.plane.forward, viewDirectionXZ);
        const crossY = this.plane.forward.z * viewDirectionXZ.x - this.plane.forward.x * viewDirectionXZ.z;
        let relativeAngle = Math.atan2(crossY, dot); // Angle from characterLookVector to viewDirectionXZ (-PI to PI)

        if (this.plane.rotationQuaternion)
            Quaternion.RotationYawPitchRollToRef(relativeAngle, 0.1, 0, this.plane.rotationQuaternion);

    }

    public lookAtCamera(): void {
        const cam = this.scene.activeCamera;
        const charPos = this.plane.position;

        if (!cam || !cam.getViewMatrix()) return;

        const viewDirectionXZ = TmpVectors.Vector3[4]; // Use a spare tmp vector
        cam.globalPosition.subtractToRef(charPos, viewDirectionXZ);
        viewDirectionXZ.y = 0;
        if (viewDirectionXZ.lengthSquared() < 0.001) return;

        viewDirectionXZ.normalize();

        // Convert direction vector to closest cardinal enum
        const angle = Math.atan2(viewDirectionXZ.x, viewDirectionXZ.z);

        const PI_4 = Math.PI / 4;
        let newDirection: CharacterDirection;

        if (angle >= -PI_4 && angle < PI_4) {
            newDirection = CharacterDirection.Up;
        } else if (angle >= PI_4 && angle < 3 * PI_4) {
            newDirection = CharacterDirection.Right;
        } else if (angle >= -3 * PI_4 && angle < -PI_4) {
            newDirection = CharacterDirection.Left;
        } else {
            newDirection = CharacterDirection.Down;
        }

        this.lookDirection = newDirection;
    }

    public static getDirectionVector(direction: CharacterDirection, resultVector?: Vector3): B.Vector3 {
        const vec = resultVector || TmpVectors.Vector3[3]; // Use temp or provided vector
        switch (direction) {
            case CharacterDirection.Up: vec.set(0, 0, 1); break;  // World +Z
            case CharacterDirection.Down: vec.set(0, 0, -1); break; // World -Z
            case CharacterDirection.Left: vec.set(-1, 0, 0); break; // World -X
            case CharacterDirection.Right: vec.set(1, 0, 0); break;  // World +X
            default: vec.set(0, 0, -1); // Default to Down/-Z
        }
        return vec;
    }

    public static inverseDirection(direction: CharacterDirection): CharacterDirection {
        switch (direction) {
            case CharacterDirection.Up: return CharacterDirection.Down;
            case CharacterDirection.Down: return CharacterDirection.Up;
            case CharacterDirection.Left: return CharacterDirection.Right;
            case CharacterDirection.Right: return CharacterDirection.Left;
            default: return DEFAULT_DIRECTION;
        }
    }

    public static getAngleFromDirection(direction: CharacterDirection): number {
        switch (direction) {
            case CharacterDirection.Up: return 0;          // Face +Z
            case CharacterDirection.Down: return Math.PI;      // Face -Z
            case CharacterDirection.Left: return -Math.PI / 2; // Face -X
            case CharacterDirection.Right: return Math.PI / 2;  // Face +X
            default: return Math.PI;
        }
    }

    private updateAnimationName(forceUpdateUV: boolean = false): void {
        // Determine the correct animation name based on the current state (e.g., 'walk') and sprite direction (e.g., 'left')
        const prefix = this.animationState || 'idle';
        const newAnimationName = `${prefix}_${this.currentDirection}` as AnimationName;

        // Update the animation only if the name actually changes, or if forced
        this.setAnimationInternal(newAnimationName, forceUpdateUV);
    }

    private setAnimationInternal(name: AnimationName, forceUpdateUV: boolean = false): void {
        // Find the animation definition
        let animDef = ANIMATION_DEFINITIONS[name];
        if (!animDef) {
            console.warn(`[SpriteSheetCharacter:${this.name}] Animation definition not found for "${name}". Falling back to default.`);
            name = DEFAULT_ANIMATION;
            animDef = ANIMATION_DEFINITIONS[name];
            if (!animDef) {
                console.error(`[SpriteSheetCharacter:${this.name}] Default animation ${DEFAULT_ANIMATION} definition missing! Cannot set animation.`);
                this.stopAnimation();
                return;
            }
        }

        const nameChanged = this.currentFullAnimation !== name;

        // If the animation name hasn't changed and we're not forcing an update,
        // just ensure it's playing (if it wasn't already).
        if (!nameChanged && !forceUpdateUV) {
            if (!this.isAnimationPlaying) {
                this.resumeAnimation();
            }
            return;
        }

        // console.log(`[DEBUG Anim] SetAnimInternal: UPDATING Animation from ${this.currentFullAnimation} to ${name}`);
        this.currentFullAnimation = name;
        this.currentFrameDuration = (animDef.durationMultiplier || 1.0) * BASE_FRAME_DURATION;

        // Reset frame index and timer only if the base animation type changes (e.g., 'walk' to 'idle')
        const currentPrefix = this.currentFullAnimation.split('_')[0];
        if (this.animationState !== currentPrefix) {
            this.currentFrameIndex = 0;
            this.animationTimer = 0;
            // No need to set this.animationState here, it's set externally
        } else {
            // If only direction changed (e.g., 'walk_left' to 'walk_right'),
            // keep the current frame index if it's valid for the new direction's animation
            // This prevents animation "jumps" when turning while walking.
            if (this.currentFrameIndex >= animDef.frames) {
                this.currentFrameIndex = 0; // Reset if index is out of bounds for the new direction
                this.animationTimer = 0;
            }
        }


        this.resumeAnimation(); // Ensure animation plays
        this._updateUVs(); // Update UVs immediately for the new animation/frame
    }


    private advanceAnimationFrame(): void {
        if (!this.isAnimationPlaying || !this.currentFullAnimation || !this.scene) return;

        // Check if we have textures to animate
        if (!this.texture_base && !this.texture_eyes && !this.texture_hair) {
            return;
        }

        const animDef = ANIMATION_DEFINITIONS[this.currentFullAnimation];
        if (!animDef || animDef.frames <= 1) { // No animation if definition missing or only 1 frame
            // If it's a single frame animation, ensure the UVs are set correctly once
            if (this.currentFrameIndex !== 0) {
                this.currentFrameIndex = 0;
                this._updateUVs();
            }
            this.stopAnimation(); // Stop timer for single-frame "animations"
            return;
        }


        const deltaTime = this.scene.getEngine().getDeltaTime() / 1000.0;
        this.animationTimer += deltaTime;

        if (this.animationTimer >= this.currentFrameDuration) {
            // Use while loop in case delta time is very large / frame rate very low
            while (this.animationTimer >= this.currentFrameDuration) {
                this.animationTimer -= this.currentFrameDuration;
                this.currentFrameIndex = (this.currentFrameIndex + 1) % animDef.frames;
            }
            this._updateUVs(); // Update UVs only when the frame actually changes
        }
    }


    // Corrected UV Update
    private _updateUVs(): void {
        const animDef = ANIMATION_DEFINITIONS[this.currentFullAnimation];
        // Ensure we have an animation definition and at least one texture exists
        if (!animDef || (!this.texture_base && !this.texture_eyes && !this.texture_hair)) {
            // console.warn(`[SpriteSheetCharacter:${this.name}] Cannot update UVs. AnimDef: ${!!animDef}, BaseTex: ${!!this.texture_base}`);
            return;
        }

        // Ensure frame index is valid
        const frameIndexInSequence = this.currentFrameIndex % animDef.frames;

        const column = animDef.columnOffset + frameIndexInSequence;
        const row = animDef.startRow; // Assuming row is constant for the animation sequence

        // Calculate UV coordinates (bottom-left corner of the frame)
        const uOffset = column * this.uvScaleX;
        // V coordinate needs care: Texture origin (0,0) is often bottom-left, but UV origin is top-left for meshes.
        // If your sprite sheet rows count from top (0) to bottom (SHEET_ROWS - 1):
        // const vOffset = (SHEET_ROWS - 1 - row) * this.uvScaleY;
        // If your sprite sheet rows count from bottom (0) to top (SHEET_ROWS - 1) **OR**
        // if you are using Texture InvertY=true (default for many loaders), then:
        const vOffset = row * this.uvScaleY;


        // Apply the same UV offset and scale to all *existing* layer textures
        if (this.texture_base) {
            this.texture_base.uOffset = uOffset;
            this.texture_base.vOffset = vOffset;
            this.texture_base.uScale = this.uvScaleX;
            this.texture_base.vScale = this.uvScaleY;
        }
        if (this.texture_eyes) {
            this.texture_eyes.uOffset = uOffset;
            this.texture_eyes.vOffset = vOffset;
            this.texture_eyes.uScale = this.uvScaleX;
            this.texture_eyes.vScale = this.uvScaleY;
        }
        if (this.texture_hair) {
            this.texture_hair.uOffset = uOffset;
            this.texture_hair.vOffset = vOffset;
            this.texture_hair.uScale = this.uvScaleX;
            this.texture_hair.vScale = this.uvScaleY;
        }
        if (this.texture_equip_body) {
            this.texture_equip_body.uOffset = uOffset;
            this.texture_equip_body.vOffset = vOffset;
            this.texture_equip_body.uScale = this.uvScaleX;
            this.texture_equip_body.vScale = this.uvScaleY;
        }
        // console.log(`[UV Update ${this.name}] Anim: ${this.currentFullAnimation}, Frame: ${this.currentFrameIndex}, UVs: (${uOffset.toFixed(2)}, ${vOffset.toFixed(2)}), Scale: (${this.uvScaleX.toFixed(2)}, ${this.uvScaleY.toFixed(2)})`);
    }


    public dispose(): void {
        console.log(`[SpriteSheetCharacter:${this.name}] Disposing...`);
        if (this.updateObserver) {
            this.scene.onBeforeRenderObservable.remove(this.updateObserver);
            this.updateObserver = null;
        }
        // Dispose mesh and materials
        this.plane.dispose(false, true); // Dispose geometry and children, but not materials yet
        this.multiMaterial.dispose(true); // Dispose multimaterial and its submaterials
        // this.material_base.dispose(); // Already disposed by multiMaterial.dispose(true)
        // this.material_eyes.dispose();
        // this.material_hair.dispose();

        // Dispose textures if not managed by AssetService
        if (!this.assetService) {
            this.texture_base?.dispose();
            this.texture_eyes?.dispose();
            this.texture_hair?.dispose();
        }
        this.texture_base = null;
        this.texture_eyes = null;
        this.texture_hair = null;


        // if (this.debugArrow) this.debugArrow.dispose(); // Dispose debug arrow if used

        console.log(`[SpriteSheetCharacter:${this.name}] Disposed.`);
    }
}