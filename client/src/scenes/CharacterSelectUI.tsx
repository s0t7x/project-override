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
    const { currentScreen, setCurrentScreen, resetAuth, roomState, selectedCharacterId, setSelectedCharacter, characterList, userId } = useGameStore();

    useEffect(() => {
        if(selectedCharacterId && selectedCharacterId.length > 1)
            handleSelectCharacter(selectedCharacterId || '');
    }, [characterList])

    const handleSelectCharacter = async (charId: string) => {
        console.log('Handle select char', charId);

        const char = characterList.find((char: any) => char.id == charId);
        if (!char) return;
        
        setSelectedCharacter(charId);

        console.log(char)

        const characterPreview = sceneDirector.getActiveScene()?.metadata?.characterPreview;
        // characterPreview.updateCharacterTexture(texture);
        characterPreview.setCharacter(char)
        characterPreview.lookAtCamera();
    };

    const handleNewCharacter = () => {
        setCurrentScreen('charCreation');
    }

    const handleBack = () => {
        resetAuth();
        setCurrentScreen('login');
        networkService.joinRoom("auth");
    }

    const handleJoin = () => {

    }

    const handleDelete = () => {
        (async () => {
            networkService.onMessageOnce('INFO_MESSAGE', (payload: any) => {
                if(payload.message?.endsWith('deleted!')) {
                    sceneDirector.getActiveScene()?.metadata?.characterPreview?.setCharacter(null);
                    setSelectedCharacter(null);
                }
            })

            networkService.sendMessage('deleteCharacter', {
                characterId: selectedCharacterId,
            })
        })();
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
                                <>
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
                                </>
                            )
                        })}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '5px', paddingTop: '20px', width: '100%' }}>
                        <pre>{userId}</pre>
                        <Button type="button" onClick={handleNewCharacter} style={{ marginTop: '15px' }}>
                            <Text>New Character</Text>
                        </Button>
                        <Button type="button" onClick={handleBack} className="danger" style={{ lineHeight: '0' }}>
                            <Text>Log Out</Text>
                        </Button>
                    </div>
                </div>
            </Window>
            { selectedCharacterId && 
            <Window title={characterList.find((char: any) => char.id == selectedCharacterId).name} width={300} height={140} x={'calc(50vw - 150px)'} y={'70vh'}  className="login-window">
                <Button type="button" onClick={handleJoin} style={{ marginTop: '15px' }}>
                    <Text>Join Server</Text>
                </Button>
                <Button type="button" onClick={handleDelete} className="danger" style={{ lineHeight: '0' }}>
                    <Text>Delete</Text>
                </Button>
                <pre>{selectedCharacterId}</pre>
            </Window>
            }
            
        </>
    );
}