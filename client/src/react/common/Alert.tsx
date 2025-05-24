// React integration of `createFrameNefrexSettings`.
import { useGameEngine } from '@/context/GameEngine';
import { Window } from './Window';
import { Text } from '@arwes/react';

export interface AlertProps {
    title?: string;
    message: string;
    callback?: () => void;
    className?: string;
    children?: React.ReactNode;
}

export const Alert: React.FC<AlertProps> = ({ children, title = 'Unknown', message = '', callback = () => { }, className = '' }) => {

    const { gameEngine } = useGameEngine();
    

    const handleCallback = () => {
        callback();
        gameEngine.uiDirector?.closeAlert(title);
    }


    return (
        <Window title={title} className={className} x='50%' y='50%' width={300} height={200}>
            <Text>{message}</Text>
            {children}
            <button onClick={handleCallback}>OK</button>
        </Window>
    )
}