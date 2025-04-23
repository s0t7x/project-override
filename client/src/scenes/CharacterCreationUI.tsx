import { BleepsOnAnimator, Text } from "@arwes/react";
import { Window } from "../components/common/Window";
import { FormEvent, useEffect, useRef, useState } from "react";
import { FloatingHeader } from "../components/common/FloatingHeader";
import { useGameContext } from "../contexts/GameContext";
import { useGameStore } from "../state/gameStore";
import { ICharacterSummary } from "shared";
import { Button } from "../components/common/Button";
import { Texture, Color3 } from "@babylonjs/core";
import { SpriteSheetFactory } from "../babylon/SpriteSheetFactory";
import { Input } from "../components/common/Input";
import { IColor3 } from "../../../shared/types";

const characterCustomization_Body: string[] = [
    "/assets/sprites/char_base_a.png",
    "/assets/sprites/char_base_b.png"
]

const characterCustomization_Eyes: string[] = [

]

const characterCustomization_Hair: string[] = [
    "",
    "/assets/sprites/char_hair_a.png"
]

export function CharacterCreationUI() {
    const { networkService, sceneDirector, assetService } = useGameContext(); // Get the network service from context
    const { setCurrentScreen, resetAuth, roomState, selectedCharacterId, setSelectedCharacter } = useGameStore();

    const [characterCustomization, setCharacterCustomization] = useState<any>(null);
    const [currentBodyIndex, setCurrentBodyIndex] = useState<number>(0);
    const [currentEyesIndex, setCurrentEyesIndex] = useState<number>(0);
    const [currentHairIndex, setCurrentHairIndex] = useState<number>(0);
    const [ name, setName ] = useState<string>('');
    const [spriteSheetFactory, setSpriteSheetFactory] = useState<SpriteSheetFactory | null>(null);

    const defaultBodyColor = '#E4B8A0'
    const defaultHairColor = "#7D4513"

    const [currentBodyColor, setCurrentBodyColor] = useState(defaultBodyColor);
    const [currentHairColor, setCurrentHairColor] = useState(defaultHairColor);

    useEffect(() => {
        setSpriteSheetFactory(new SpriteSheetFactory());
        setCharacterCustomization({
            baseSpriteSheet: characterCustomization_Body[0],
            baseColor: ({r: 228 /255, g: 189/255, b: 167/255} as IColor3),
            eyesSpriteSheet: "",
            eyesColor: ({r: 0, g: 0, b: 0} as IColor3),
            hairSpriteSheet: "",
            hairColor: ({r: 1, g: 133/255, b: 26/255} as IColor3),
        })
    }, [])

    useEffect(() => {
        if (!spriteSheetFactory) return;
        (async () => {
            if (!characterCustomization) return;
    
            const characterPreview = sceneDirector.getActiveScene()?.metadata?.characterPreview;
            // characterPreview.updateCharacterTexture(texture);
            characterPreview.setCharacter({ customization: characterCustomization })
            characterPreview.lookAtCamera();
        })();
    }, [characterCustomization])

    const nextBody = () => {
        let next = currentBodyIndex + 1;
        if (next >= characterCustomization_Body.length)
            next = 0
        setCurrentBodyIndex(next)
        setCharacterCustomization({ ...characterCustomization, baseSpriteSheet: characterCustomization_Body[next] })
    }

    const previousBody = () => {
        let next = currentBodyIndex - 1;
        if (next < 0)
            next = characterCustomization_Body.length - 1;
        setCurrentBodyIndex(next)
        setCharacterCustomization({ ...characterCustomization, baseSpriteSheet: characterCustomization_Body[next] })
    }

    const nextEyes = () => {
        let next = currentEyesIndex + 1;
        if (next >= characterCustomization_Eyes.length)
            next = 0
        setCurrentEyesIndex(next)
        setCharacterCustomization({ ...characterCustomization, eyesSpriteSheet: characterCustomization_Eyes[next] })
    }

    const previousEyes = () => {
        let next = currentEyesIndex - 1;
        if (next < 0)
            next = characterCustomization_Eyes.length - 1;
        setCurrentEyesIndex(next)
        setCharacterCustomization({ ...characterCustomization, eyesSpriteSheet: characterCustomization_Eyes[next] })
    }

    const nextHair = () => {
        let next = currentHairIndex + 1;
        if (next >= characterCustomization_Hair.length)
            next = 0
        setCurrentHairIndex(next)
        setCharacterCustomization({ ...characterCustomization, hairSpriteSheet: characterCustomization_Hair[next] })
    }

    const previousHair = () => {
        let next = currentHairIndex - 1;
        if (next < 0)
            next = characterCustomization_Hair.length - 1;
        setCurrentHairIndex(next)
        setCharacterCustomization({ ...characterCustomization, hairSpriteSheet: characterCustomization_Hair[next] })
    }

    const handleCreate = () => {
        (async () => {
            networkService.onMessageOnce('INFO_MESSAGE', (payload: any) => {
                if(payload.message?.endsWith('created!')) {
                    sceneDirector.getActiveScene()?.metadata?.characterPreview?.setCharacter(null);
                    if(payload.characterId) setSelectedCharacter(payload.characterId)
                    setTimeout(() => setCurrentScreen("charSelect"), 200)
                }
            })

            networkService.sendMessage('createCharacter', {
                name: name,
                customization: characterCustomization
            })
        })();
    }

    const handleBack = () => {
        sceneDirector.getActiveScene()?.metadata?.characterPreview?.setCharacter(null);
        setCurrentScreen("charSelect");
    }

    const handleColorizeBase = (event: any) => {
        setCurrentBodyColor(event.target.value)
        setCharacterCustomization({ ...characterCustomization, baseColor: Color3.FromHexString(event.target.value) })
    }

    const handleColorizeHair = (event: any) => {
        setCurrentHairColor(event.target.value)
        setCharacterCustomization({ ...characterCustomization, hairColor: Color3.FromHexString(event.target.value) })
    }

    return (
        <>
            {/* <FloatingHeader title="Project Override" width={350} height={50} x={175} y={10}></FloatingHeader> */}
            {/* <Window title="Characters" width={'100%'} height={'100%'} x={'50%'} className="login-window">  */}
            <Window title="New Character" width={300} height={'100%'} x={'calc(100vw - 150px)'} className="login-window">
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'start', gap: '5px', paddingTop: '20px', height: '100%', width: '100%' }}>
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-evenly', alignItems: 'center' }}>
                                <Button onClick={previousBody} style={{ maxWidth: 25, maxHeight: 25 }}>&lt;</Button><Text style={{ flexGrow: 1, textAlign: "center" }}>Body</Text><Button onClick={nextBody} style={{ maxWidth: 25, maxHeight: 25 }}>&gt;</Button>
                            </div>
                            <input type="color" style={{ height: 50, position: "relative", marginTop: -10 }} value={currentBodyColor} onChange={handleColorizeBase} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-evenly', alignItems: 'center' }}>
                                <Button onClick={previousEyes} style={{ maxWidth: 25, maxHeight: 25 }}>&lt;</Button><Text style={{ flexGrow: 1, textAlign: "center" }}>Eyes</Text><Button onClick={nextEyes} style={{ maxWidth: 25, maxHeight: 25 }}>&gt;</Button>
                            </div>

                        </div>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-evenly', alignItems: 'center' }}>
                                <Button onClick={previousHair} style={{ maxWidth: 25, maxHeight: 25 }}>&lt;</Button><Text style={{ flexGrow: 1, textAlign: "center" }}>Hair</Text><Button onClick={nextHair} style={{ maxWidth: 25, maxHeight: 25 }}>&gt;</Button>
                            </div>
                            <input type="color" style={{ height: 50, position: "relative", marginTop: -10 }} value={currentHairColor} onChange={handleColorizeHair} />
                        </div>
                        <div style={{ marginTop: 'auto' }}>
                            <div className="input-group">
                            <Text as="label" htmlFor="name-input" style={{ display: 'block', marginBottom: '5px' }}>
                                Character Name:
                            </Text>
                            <Input
                                id="name-input"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '5px', paddingTop: '20px', width: '100%' }}>
                        <Button type="button" onClick={handleCreate} style={{ marginTop: '15px' }}>
                            <Text>Finish Character</Text>
                        </Button>
                        {/* <Button type="submit" className="secondary" style={{ lineHeight: '0'}}>
                            <Text>Register</Text>
                            </Button> */}
                        <Button type="button" onClick={handleBack} className="danger" style={{ lineHeight: '0' }}>
                            <Text>Cancel</Text>
                        </Button>
                    </div>
                </div>
            </Window>
        </>
    );
}