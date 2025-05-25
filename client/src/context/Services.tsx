import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { NetworkService } from '../services/NetworkService';
import { BgmService } from '../services/BgmService';
import { InputService } from '../services/InputService';
import { AssetService } from '../services/AssetService';
import { LocalStorageService } from '../services/LocalStorageService';
import { useServiceStore } from '@/stores/ServiceStore';

interface IContext {
	networkService: NetworkService;
	bgmService: BgmService;
	inputService: InputService;
	assetService: AssetService;
	localStorageService: LocalStorageService;
	steamworks: any

	servicesInitialized: boolean; // To indicate when services are ready
}

const ServicesContext = createContext<IContext | undefined>(undefined);

export const useServices = (): IContext => {
	const context = useContext(ServicesContext);
	if (context === undefined) {
		throw new Error('useServices must be used within a ServiceProvider');
	}
	return context;
};

interface ServiceProviderProps {
	children: React.ReactNode;
}

export const ServiceProvider: React.FC<ServiceProviderProps> = ({ children }) => {
	const networkServiceRef = useRef<NetworkService | null>(null);
	const bgmServiceRef = useRef<BgmService | null>(null);
	const inputServiceRef = useRef<InputService | null>(null);
	const assetServiceRef = useRef<AssetService | null>(null);
	const localStorageServiceRef = useRef<LocalStorageService | null>(null);

	const [servicesInitialized, setServicesInitialized] = useState(false);

	useEffect(() => {
		console.log('Initializing services...');
		const network = new NetworkService();
		const bgm = new BgmService();
		const input = new InputService();
		const asset = new AssetService();
		const localStorage = new LocalStorageService();

		networkServiceRef.current = network;
		bgmServiceRef.current = bgm;
		inputServiceRef.current = input;
		assetServiceRef.current = asset;
		localStorageServiceRef.current = localStorage;

		bgm.initialize();

		setServicesInitialized(true);
		console.log('Services initialized.');

		useServiceStore.setState({
			networkService: network,
			bgmService: bgm,
			inputService: input,
			assetService: asset,
			localStorageService: localStorage,
			steamworks: (window as any).steamworks || null
		});

		return () => {
			console.log('Disposing services...');

			// Clean Up
			bgm.stop();
			// network.disconnect();
			// sceneDirector.dispose();
			// uiDirector.dispose();
		};
	}, []);

	const services: IContext | undefined = servicesInitialized
		? {
				networkService: networkServiceRef.current!,
				bgmService: bgmServiceRef.current!,
				inputService: inputServiceRef.current!,
				assetService: assetServiceRef.current!,
				localStorageService: localStorageServiceRef.current!,
				servicesInitialized: true,
				steamworks: (window as any).steamworks || null
			}
		: undefined;

	return <ServicesContext.Provider value={services}>{servicesInitialized ? children : <div>Booting services...</div>}</ServicesContext.Provider>;
};
