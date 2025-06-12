// React integration of `createFrameNefrexSettings`.
import { Animator } from '@arwes/react'
import { FrameHeader, FrameNefrex, FrameLines } from '@arwes/react'
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
            <div style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)', width: width, height: height, padding: 10, pointerEvents: 'all',userSelect:'auto', border: 0, boxShadow: 'rgb(from var(--background-color) r g b / 20%) 1px 3px 50px'}} className={className} >
                <FrameLines
                    style={{
                        // @ts-expect-error css variables
                        '--arwes-frames-bg-color': 'rgb(from var(--background-color) r g b / 10%)',
                        '--arwes-frames-line-color': 'rgb(from var(--background-color) r g b / 60%)',
                        '--arwes-frames-deco-color': 'rgb(from var(--main-color) r g b / 120%)',
                        zIndex: -1,
                    }}
                />
                <BleepsOnAnimator<BleepsNames> transitions={{ entering: 'assemble' }} />
                <Illuminator
                    style={{ clipPath: styleFrameClipOctagon({ squareSize: 20, leftBottom: false, rightTop: false, leftTop: false, rightBottom: false }),pointerEvents: 'none' }}
                    color="hsl(180 50% 50% / 10%)"
                    size={Number(width)}
                />
                <div style={{ position: 'relative', display: "flex", justifyContent: 'start', width: '100%', height:  title.length > 0 ? 70 : 32, alignItems: 'start'}}>
                    { title.length > 0 ? <>
                    <FrameHeader
                    style={{
                        // @ts-expect-error css variables
                        '--arwes-frames-line-color': 'rgb(from var(--main-color) r g b / 30%)',
                        '--arwes-frames-deco-color': 'rgb(from var(--background-color) r g b / 60%)',
                        transform: 'scale(-1,-1)',
                        paddingTop: 10,
                    }}
                    contentLength={60}
                    />
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'start', alignItems: 'center'}}>
                        <div className="title" style={{ position: 'relative', color: 'var(--main-color)', fontWeight: 'bolder', letterSpacing: 2, textTransform: 'uppercase', textShadow: 'rgb(from var(--background-color) r g b / 50%) 0px 0px 10px', paddingTop: 2, paddingLeft: 2 }}>{title}</div>
                        { /**  @ts-expect-error */ }
                        <marquee className="title-bg"style={{ position: 'absolute',  color: 'var(--main-color)', fontWeight: 'bolder', letterSpacing: 20, textTransform: 'uppercase', marginLeft: -10, marginRight: -10, width: 'calc(100% + 20px)', maxWidth: 'calc(100% + 20px)' }}>
                            <div>{title}</div>
                        { /**  @ts-expect-error */ }
                        </marquee>
                    </div> </> : <></>}
                </div>
                <div style={{ zIndex: 20, marginTop: -50, paddingLeft: 8, paddingRight: 8, paddingTop: 0, color: 'var(--main-color)', height: 'calc(100% - (45px/2))', width: '100%', ...style, textShadow: 'var(--background-color) 0px 0px 5px' }}>
                    {children}
                </div>
            </div>
        </Animator>
    )
}