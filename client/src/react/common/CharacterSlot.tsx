// React integration of `createFrameNefrexSettings`.
import { Animator } from '@arwes/react'
import { FrameHeader, FrameLines } from '@arwes/react'
import { Illuminator } from '@arwes/react'
import { BleepsOnAnimator, styleFrameClipOctagon } from '@arwes/react';
import { ICharacterSummary } from '@project-override/shared/core/CharacterSummary';
import { useState } from 'react';

const SLOT_WIDTH = '300px';
const SLOT_HEIGHT = '400px';

interface CharacterSlotProps {
    character?: ICharacterSummary;
    className?: string;
    onClick?: (character?: ICharacterSummary) => void;
    style?: React.CSSProperties;
}

type BleepsNames = 'hover' | 'click' | 'assemble' | 'type'

export const CharacterSlot: React.FC<CharacterSlotProps> = ({ character = undefined, className = '', onClick = undefined, style = {}}) => {

    const [isHovered, setIsHovered] = useState<boolean>(false);

    const handleMouseLeave = () => {
        setIsHovered(false);
    }

    const handleMouseOver = () => {
        setIsHovered(true);
    }

    const handleClick = () => {
        if(onClick) onClick(character)
    }

    return (
        <Animator>
            <div onClick={handleClick} onMouseOver={handleMouseOver} onMouseLeave={handleMouseLeave} style={{ position: 'relative', width: SLOT_WIDTH, height: SLOT_HEIGHT, padding: 10, pointerEvents: 'all',userSelect:'auto', border: 0, filter: `drop-shadow(0px 0px ${isHovered ? '10px' : '100px'} white)`, clipPath: character ? 'polygon(0% 0%, 0% 100%, 30% 100%, 30% 18%, 70% 18%, 70% 55%, 30% 55%, 30% 100%, 100% 100%, 100% 0%)' : '', transform: isHovered ? 'scale(1.02,1.02)' : '', cursor: 'pointer'}} className={className} >
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
                    size={Number(SLOT_WIDTH)}
                />
                <div style={{ position: 'relative', display: "flex", justifyContent: 'start', width: '100%', height: character ? 70 : 32, alignItems: 'start'}}>
                    { character ? <>
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
                        <div className="title" style={{ position: 'relative', color: 'var(--main-color)', fontWeight: 'bolder', letterSpacing: 2, textTransform: 'uppercase', textShadow: 'rgb(from var(--background-color) r g b / 50%) 0px 0px 10px', paddingTop: 2, paddingLeft: 2 }}>{character.name}</div>
                        { /**  @ts-expect-error */ }
                        <marquee className="title-bg"style={{ position: 'absolute',  color: 'var(--main-color)', fontWeight: 'bolder', letterSpacing: 20, textTransform: 'uppercase', marginLeft: -10, marginRight: -10, width: 'calc(100% + 20px)', maxWidth: 'calc(100% + 20px)' }}>
                            <div>{character.name}</div>
                        { /**  @ts-expect-error */ }
                        </marquee>
                    </div> </> : <></>}
                </div>
                <div style={{ zIndex: 20, marginTop: -32, paddingLeft: 8, paddingRight: 8, paddingTop: 0, color: 'var(--main-color)', height: 'calc(100% - (45px/2))', width: '100%', ...style, textShadow: 'var(--background-color) 0px 0px 5px' }}>   
                    { character ? <div style={{marginLeft: '0%'}}>
                        <span>Level: {character.level}</span>
                    </div> : <div style={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}} >
                        <div style={{ fontSize: 26}}>+</div>
                        <div style={{opacity: 0.5}}>Create Character</div>
                    </div>}
                </div>
            </div>
        </Animator>
    )
}