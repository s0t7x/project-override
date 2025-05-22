import { BaseScreen } from '@/react/screens/BaseScreen';
export class UiDirector {
	private currentScreens: BaseScreen[] = [];

	public push(screen: BaseScreen): void {
		this.currentScreens.push(screen);
	}

	public pop(): void {
		const curScreen = this.getActiveScreen();
		if (curScreen) {
			// curScreen.dispose();
		}
		this.currentScreens.pop();
	}

	public getActiveScreen(): BaseScreen | null {
		return this.currentScreens.length > 0 ? this.currentScreens[this.currentScreens.length - 1] || null : null;
	}

	public initialize(): void {
		console.log('[UI] Initializing...');
	}
}
