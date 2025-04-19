import { BleepsOnAnimator, Text } from "@arwes/react";
import { Window } from "../components/common/Window";
import { FormEvent, useEffect, useRef, useState } from "react";
import { FloatingHeader } from "../components/common/FloatingHeader";
import { useGameContext } from "../contexts/GameContext";
import { useGameStore } from "../state/gameStore";
import { ICharacterSummary } from "shared";
import { Button } from "../components/common/Button";
import { Texture } from "@babylonjs/core";
import { SpriteSheetFactory } from "../babylon/SpriteSheetFactory";

export function CharacterSelectUI() {
    const { networkService, sceneDirector, assetService } = useGameContext(); // Get the network service from context
    const { setCurrentScreen, resetAuth, roomState, selectedCharacterId, setSelectedCharacter } = useGameStore();

    const [characterList, setCharacterList] = useState<any>(null);
    const [ spriteSheetFactory ] = useState(new SpriteSheetFactory);

    useEffect(() => {
        if (roomState && roomState.characters) {
            const chars: any[] = [];
            roomState.characters.forEach((e: any) => {
                console.log(e)
                chars.push(e);
            })
            setCharacterList(chars);
        }
    }, [roomState]);

    const handleSelectCharacter = async (charId: string) => {
        console.log('Handle select char', charId);
        setSelectedCharacter(charId);
        const characterPreview = sceneDirector.getActiveScene()?.metadata?.characterPreview;
        let texture;
        if(charId == 'cm9hdv5jx00020cl42kgm7tu1') {
                const cacheKey = spriteSheetFactory.generateCacheKey([
                    { url: '/assets/sprites/char_test.png', hueShift: 120 },
                    { url: '/assets/sprites/char_test_cloth.png' }]);
                texture = await assetService.loadTextureFromCache(cacheKey)
                if(!texture) {
                    const comp = await spriteSheetFactory.createComposite([
                        { url: '/assets/sprites/char_test.png', hueShift: 120 },
                        { url: '/assets/sprites/char_test_cloth.png' }]);
                    texture = await assetService.loadTextureFromComposition(comp);
                }
        } else texture = await assetService.loadTexture('/assets/sprites/char_test.png');
        characterPreview.updateCharacterTexture(texture);
        characterPreview.lookAtCamera();
    };

    const handleBack = () => {
        resetAuth();
        setCurrentScreen('login');
        networkService.joinRoom("auth");
    }

    return (
        <>
            {/* <FloatingHeader title="Project Override" width={350} height={50} x={175} y={10}></FloatingHeader> */}
            {/* <Window title="Characters" width={'100%'} height={'100%'} x={'50%'} className="login-window">  */}
            <Window title="Characters" width={300} height={'100%'} x={'calc(100vw - 150px)'} className="login-window">
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'start', gap: '5px', paddingTop: '20px', height: '100%', width: '100%' }}>
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {characterList && characterList.map((char: any) => {
                            const isSelected = char.id === selectedCharacterId;
                            return (
                                // Use character ID as the unique key for React reconciliation
                                <Button id={`btn-${char.id}`} key={char.id} className={`char-list-item ${isSelected ? 'selected' : ''}`} style={{ width: '100%' }} onClick={() => handleSelectCharacter(char.id)}>
                                    {/* Display character info */}
                                    <div style={{ padding: 10, backgroundColor: 'rgba(1,1,1,0.1)' }}>
                                        <div className="char-info" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 10 }}>
                                            <span className="char-name">{char.name}</span>
                                            <span className="char-level">Lv. {char.level}</span>
                                            {/* Add appearance preview later */}
                                        </div>
                                    </div>
                                </Button>
                            )
                        })}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '5px', paddingTop: '20px', width: '100%' }}>
                        <Button type="submit" style={{ marginTop: '15px' }}>
                            <Text>New Character</Text>
                        </Button>
                        {/* <Button type="submit" className="secondary" style={{ lineHeight: '0'}}>
                            <Text>Register</Text>
                            </Button> */}
                        <Button type="Button" onClick={handleBack} className="danger" style={{ lineHeight: '0' }}>
                            <Text>Log Out</Text>
                        </Button>
                    </div>
                </div>
            </Window>
        </>
    );
}