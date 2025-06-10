import { BleepsProviderSettings } from '@arwes/react';
import AudioSettings from './Audio';

export type BleepsNames = 'hover' | 'click' | 'assemble' | 'type' | 'intro' | 'error';
export const BleepsSettings: BleepsProviderSettings<BleepsNames> = {
	master: { volume: AudioSettings.master.volume * AudioSettings.ui.volume },
	categories: {
		background: { volume: 0.5 },
		transition: { volume: 0.5 },
		interaction: { volume: 0.75 },
		notification: { volume: 1 },
	},
	bleeps: {
		hover: {
			category: 'background',
			sources: [
				{ src: 'https://next.arwes.dev/assets/sounds/hover.webm', type: 'audio/webm' },
				{ src: 'https://next.arwes.dev/assets/sounds/hover.mp3', type: 'audio/mpeg' },
			],
		},
		click: {
			category: 'interaction',
			sources: [
				{ src: 'https://next.arwes.dev/assets/sounds/click.webm', type: 'audio/webm' },
				{ src: 'https://next.arwes.dev/assets/sounds/click.mp3', type: 'audio/mpeg' },
			],
		},
		assemble: {
			category: 'transition',
			sources: [
				{ src: 'https://next.arwes.dev/assets/sounds/assemble.webm', type: 'audio/webm' },
				{ src: 'https://next.arwes.dev/assets/sounds/assemble.mp3', type: 'audio/mpeg' },
			],
		},
		type: {
			category: 'transition',
			sources: [
				{ src: 'https://next.arwes.dev/assets/sounds/type.webm', type: 'audio/webm' },
				{ src: 'https://next.arwes.dev/assets/sounds/type.mp3', type: 'audio/mpeg' },
			],
		},
		intro: {
			category: 'notification',
			sources: [
				{ src: 'https://next.arwes.dev/assets/sounds/intro.webm', type: 'audio/webm' },
				{ src: 'https://next.arwes.dev/assets/sounds/intro.mp3', type: 'audio/mpeg' },
			],
		},
		error: {
			category: 'notification',
			sources: [
				{ src: 'https://next.arwes.dev/assets/sounds/error.webm', type: 'audio/webm' },
				{ src: 'https://next.arwes.dev/assets/sounds/error.mp3', type: 'audio/mpeg' },
			],
		},
	},
};
