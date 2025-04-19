import { Animator } from '@arwes/react-animator'
import { FrameHeader, FrameUnderline } from '@arwes/react-frames'

interface FloatingHeaderProps {
    title?: string;
    x?: number | string;
    y?: number | string;
    width?: number | string;
    height?: number | string;
    className?: string;
    children?: React.ReactNode;
}

export const FloatingHeader: React.FC<FloatingHeaderProps> = ({ children, title = 'Unknown', x = '50%', y = '50%', width = 300, height = 'auto', className = '' }) => {
    return (
        <Animator>
            <div style={{ position: 'absolute', left: x, top: y, transform: 'translate(-25%, -25%) scale(1.5,1.5)', width: width, height: height, padding: 15, pointerEvents: 'auto', zIndex: 10 }} className={className}>
                <FrameUnderline
                    style={{
                        // @ts-expect-error css variables
                        '--arwes-frames-bg-color': 'hsla(180, 75%, 10%, 0.4)',
                        '--arwes-frames-line-color': 'var(--main-color)',
                        '--arwes-frames-deco-color': 'var(--main-color)',
                        zIndex: -1,
                    }}
                />
                <div style={{ position: 'relative', display: "flex", justifyContent: 'start', width: '100%', height: height, alignItems: 'start' }}>
                    <FrameHeader
                    style={{
                        // @ts-expect-error css variables
                        '--arwes-frames-line-color': 'var(--main-color)',
                        '--arwes-frames-deco-color': 'var(--main-color)',
                        paddingTop: 10,
                        marginTop: -25,
                    }}
                    contentLength={250}
                    />
                    <div style={{ width: '75%', display: 'flex', justifyContent: 'start', alignItems: 'center', paddingTop: 5 }}>
                        <div className='title' style={{ position: 'relative', color: 'var(--main-color)', fontWeight: 'bolder', letterSpacing: 3, textTransform: 'uppercase', textShadow: '0px 0px 20px' }}>{title}</div>
                    </div>
                </div>
                <div style={{ zIndex: 1, marginTop: -45, padding: 5 }}>
                    {children}
                </div>
            </div>
        </Animator>
    )
}