import { AlertProps } from '@/react/common/Alert';
import { ToastProps, ToastCorner } from '@/react/common/Toast'; // Import ToastProps and ToastCorner
import { BaseScreen } from '@/react/screens/BaseScreen';

export class UiDirector {
	public currentScreens: string[] = [];
	public currentAlerts: Map<string, AlertProps> = new Map(); // Maps title to AlertProps
	public currentToasts: Map<string, ToastProps> = new Map(); // Maps ID to ToastProps
	private onStateChangeCallback: (() => void) | null = null;
	private toastIdCounter = 0;

	public setOnStateChange(callback: () => void): void {
		this.onStateChangeCallback = callback;
	}

	private notifyStateChange(): void {
		this.onStateChangeCallback?.();
	}

	public push(screen: string): void {
		this.currentScreens.push(screen);
		this.notifyStateChange();
	}

	public pop(): void {
		const curScreen = this.getActiveScreen();
		if (curScreen) {
			// curScreen.dispose();
		}
		if (this.currentScreens.pop()) {
			this.notifyStateChange();
		}
	}

	public getActiveScreen(): string | null {
		return this.currentScreens.length > 0 ? this.currentScreens[this.currentScreens.length - 1] || null : null;
	}

	public initialize(): void {
		console.log('[UI] Initializing...');
	}

	public showAlert(title: string, message: string, callback?: (() => void) | Map<string, () => void>, children?: any, props?: any) {
		this.currentAlerts.set(title, {title, message, callback, children, ...props});
		this.notifyStateChange();
	}

	public closeAlert(title: string) {
		if (this.currentAlerts.delete(title)) {
			this.notifyStateChange();
		}
	}

	public showErrorAlert(message: string, callback: () => void) {
		this.showAlert('Error', message, callback);
		// No need to call notifyStateChange here as showAlert already does it.
	}

	public getAlerts(): AlertProps[] {
		return Array.from(this.currentAlerts.values());
	}

	// --- Toast Management ---

	public showToast(message: string, duration: number = 5000, corner: ToastCorner = 'top-right', children?: any): string {
		const id = `toast-${this.toastIdCounter++}`;
		const toastProps: ToastProps = { id, message, duration, corner, children };
		this.currentToasts.set(id, toastProps);
		this.notifyStateChange();
		return id;
	}

	public removeToast(id: string): void {
		if (this.currentToasts.delete(id)) {
			this.notifyStateChange();
		}
	}

	public getToasts(): ToastProps[] {
		return Array.from(this.currentToasts.values());
	}
}
