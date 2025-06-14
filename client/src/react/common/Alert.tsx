// React integration of `createFrameNefrexSettings`.
import { useGameEngine } from '@/context/GameEngine';
import { Window } from './Window';
import { Text } from '@arwes/react';
import { Button } from './Button';

export interface AlertProps {
    title?: string;
    x?: number | string;
    y?: number | string;
    message: string;
    callback?: (() => void) | Map<string, () => void>;
    className?: string;
    children?: React.ReactNode;
}

export const Alert: React.FC<AlertProps> = ({ children, title = 'Unknown', x='50%', y='50%', message = '', callback = undefined, className = '' }) => {

    const { gameEngine } = useGameEngine();
    

    const handleCallback = () => {
        if(typeof callback === 'function') callback();
        gameEngine.uiDirector?.closeAlert(title);
    }


    return (
        <Window title={title} className={className} x={x} y={y} width={300} height={200} style={{display:'flex', flexDirection:'column'}}>
            <Text>{message}</Text>
            {children}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '10px', marginTop: 'auto', flex: 1}}>
                {callback ? typeof callback === 'function' ?
                    <Button onClick={handleCallback}>OK</Button>
                :
                    [...(callback as Map<string, () => void>).entries()].map(([name, callback]) => {
                        return <Button key={name} onClick={callback}>{name}</Button>
                    })
                : <></>}
            </div>
        </Window>
    )
}