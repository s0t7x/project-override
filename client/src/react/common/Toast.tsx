import { Animator, FrameNefrex, FrameNero, Text } from '@arwes/react';
import React, { useEffect } from 'react';

export type ToastCorner = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

export interface ToastProps {
    id: string;
    message: string;
    duration?: number; // in milliseconds
    corner?: ToastCorner;
    noBackground: boolean;
    // Optional: type?: 'info' | 'success' | 'warning' | 'error'; // For different styling
}

// Props for the component itself, including the onDismiss callback
interface InternalToastComponentProps extends ToastProps {
    onDismiss: (id: string) => void;
}

const Toast: React.FC<InternalToastComponentProps> = ({
    id,
    message,
    duration = 5000, // Default duration 5 seconds
    noBackground = false,
    // corner is used for positioning by UiOverlay, not directly by Toast style here
    onDismiss,
}) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss(id);
        }, duration);

        return () => {
            clearTimeout(timer);
        };
    }, [onDismiss]);

    return (
            <div>
        <Animator key={id}>
                <div
                    style={{
                        padding: '0px 12px 0px 12px',
                        fontSize: '0.9em',
                        pointerEvents: 'auto', // To allow potential future interactions like manual close
                        maxWidth: '300px', // Prevent toasts from being too wide
                        height: 'auto',
                        wordBreak: 'break-word'
                    }}
                >
                    <FrameNero
                        key={id}
                        styled={true}
                        positioned={true}
                        style={{
                            // @ts-expect-error css variables
                            '--arwes-frames-bg-color': noBackground ? 'hsla(180, 75%, 10%, 0)' : 'hsla(180, 75%, 10%, 0.7)',
                            '--arwes-frames-line-color': 'var(--main-color)',
                            '--arwes-frames-deco-color': 'var(--main-color)',
                            zIndex: -1
                        }}
                    />
                    <Text>
                        {message}
                    </Text>
            </div>
        </Animator>
                </div>
    );
};

export default Toast;
