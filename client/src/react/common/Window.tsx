// React integration of `createFrameNefrexSettings`.
import { Animator } from '@arwes/react'
import { FrameHeader, FrameNefrex } from '@arwes/react'
import { Illuminator } from '@arwes/react'
import { BleepsOnAnimator, styleFrameClipOctagon } from '@arwes/react';

interface WindowProps {
    title?: string;
    x?: number | string;
    y?: number | string;
    width?: number | string;
    height?: number | string;
    className?: string;
    style?: React.CSSProperties;
    children?: React.ReactNode;
}

type BleepsNames = 'hover' | 'click' | 'assemble' | 'type'

export const Window: React.FC<WindowProps> = ({ children, title = 'Unknown', x = '50%', y = '50%', width = 300, height = 'auto', className = '', style = {}}) => {
    return (
        <Animator>
            <div style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)', width: width, height: height, padding: 10, pointerEvents: 'all', color: 'white',userSelect:'auto'}} className={className} >
                <FrameNefrex
                    style={{
                        // @ts-expect-error css variables
                        '--arwes-frames-bg-color': 'hsla(180, 75%, 10%, 0.7)',
                        '--arwes-frames-line-color': 'var(--main-color)',
                        '--arwes-frames-deco-color': 'var(--main-color)',
                        zIndex: -1,
                    }}
                />
                <BleepsOnAnimator<BleepsNames> transitions={{ entering: 'assemble' }} />
                <Illuminator
                    style={{ clipPath: styleFrameClipOctagon({ squareSize: 20, leftBottom: false, rightTop: false }),pointerEvents: 'none' }}
                    color="hsl(180 50% 50% / 10%)"
                    size={Number(width)}
                />
                <div style={{ position: 'relative', display: "flex", justifyContent: 'start', width: '100%', height: 70, alignItems: 'start'}}>
                    <FrameHeader
                    style={{
                        // @ts-expect-error css variables
                        '--arwes-frames-line-color': 'var(--main-color)',
                        '--arwes-frames-deco-color': 'var(--main-color)',
                        transform: 'scale(-1,-1)',
                        paddingTop: 10,
                    }}
                    contentLength={60}
                    />
                    <div style={{ maxWidth: '75%', display: 'flex', justifyContent: 'start', alignItems: 'center', paddingTop: 5}}>
                        <div className="title" style={{ position: 'relative', color: 'var(--main-color)', fontWeight: 'bolder', letterSpacing: 3, textTransform: 'uppercase', textShadow: '0px 0px 20px' }}>{title}</div>
                        { /**  @ts-expect-error */ }
                        <marquee className="title-bg"style={{ position: 'absolute', color: 'var(--main-color)', fontWeight: 'bolder', letterSpacing: 3, textTransform: 'uppercase'}}>
                            <div>{title}</div>
                        { /**  @ts-expect-error */ }
                        </marquee>
                    </div>
                </div>
                <div style={{ zIndex: 20, marginTop: -45, padding: 5, height: 'calc(100% - (45px/2))', width: '100%', ...style }}>
                    {children}
                </div>
            </div>
        </Animator>
    )
}