import { Animated, BleepsOnAnimator, Text, useBleeps } from "@arwes/react";
import { Window } from "../components/common/Window";
import { FormEvent, useEffect, useState } from "react";
import { FloatingHeader } from "../components/common/FloatingHeader";
import { useGameContext } from "../contexts/GameContext";
import { useGameStore } from "../state/gameStore";
import { Button } from "../components/common/Button";
import { Input } from "../components/common/Input";
import { ChatWindow } from "../components/ChatWindow";
import { IRoomListing } from "shared";

// UI component for LoginUI.
export function WorldLobbyUI() {

    const { roomState, setCurrentScreen, globalChatRoom, selectedCharacter } = useGameStore();
    const { sceneDirector, networkService } = useGameContext();

    const [ publicRooms, setPublicRooms ] = useState<IRoomListing[] | null>(null);

    useEffect(() => {
        const characterPreview = sceneDirector.getActiveScene()?.metadata?.characterPreview;
        // characterPreview.updateCharacterTexture(texture);
        console.log('Selected character', selectedCharacter)
        console.log(characterPreview)
        characterPreview.setCharacter(selectedCharacter);
        characterPreview.lookAtCamera();
    }, [])

    useEffect(() => {
        if (roomState) {
            setPublicRooms(roomState.publicRooms);
        }
    }, [roomState]);

    const handleJoin = async (roomId: string) => {
        networkService.joinRoom('game', { roomId: roomId, characterId: selectedCharacter?.id }, false, false).then(() => {
            setCurrentScreen("game");
        });
    }

    const handleBack = () => {
        globalChatRoom?.leave().then(() => {
            sceneDirector.getActiveScene()?.metadata?.characterPreview?.setCharacter(null);
            setCurrentScreen("charSelect");
        });
    }

    return (
        <>
            <ChatWindow />
            <Window title="WorldLobby" x="50%" y="70%" width={300} height={350} className="login-window">
                <form style={{ marginTop: '15px', display: "flex", flexDirection: "column", height: "95%" }}>
                    {publicRooms && Array.from(publicRooms.values()).map((room) => (
                        <Button type='button' key={room.roomId} className="room-listing" onClick={() => handleJoin(room.roomId)}>
                            <Text>{room.name}</Text>
                        </Button>
                    ))}
                    <Button type='button' style={{ marginTop: 'auto' }} onClick={handleBack}>
                        <Text>Back</Text>
                    </Button>
                </form>
            </Window>
        </>
    );
}