import { Text } from "@arwes/react";
import { Window } from "../components/common/Window";
import { FormEvent, useEffect, useState } from "react";
import { FloatingHeader } from "../components/common/FloatingHeader";
import { useGameContext } from "../contexts/GameContext";
import { Spinner } from "../components/common/Spinner";
import { useGameStore } from "../state/gameStore";
import { BgmPlayer } from "../services/BgmPlayer";
import * as B from "@babylonjs/core";
import { useWorldStore } from "../state/worldStore";

// UI component for EntryUI.
export function EntryUI() {
    // State to hold username and password input values
    const { networkService, sceneDirector, assetService } = useGameContext(); // Get the network service from context
    const { roomState } = useGameStore();

    useEffect(() => {
        (async ()=>{
            await networkService.joinRoom("entry");
        })();
        BgmPlayer.play({
            name: "menu_theme",
            filePath: "/assets/music/menu_theme.mp3",
            loop: true,
            volume: 0.1
       }, 2000); // 2 second fade
    }, []);

    const { connectionStatus, setCurrentScreen } = useGameStore();
    useEffect(() => {
        // console.log(connectionStatus, networkService.currentRoom?.name)
        // if(connectionStatus == 'connected' && networkService.currentRoom?.name == 'entry') {
        //     sceneDirector.setupEntryScene();
        //     sceneDirector.getActiveScene()?.executeWhenReady(async () => {
        //         await networkService.joinRoom("auth");
        //         setCurrentScreen('login');
        //     })
        // }
    }, [connectionStatus]);

    useEffect(() => {
            if(roomState && roomState.mapDataJson) {
                const mapData = JSON.parse(roomState.mapDataJson)
                useWorldStore.setState({ mapChunks: mapData.blockData})
                sceneDirector.setupEntryScene(assetService);
                sceneDirector.getActiveScene()?.executeWhenReady(async () => {
                    await networkService.joinRoom("auth");
                    setCurrentScreen('login');
                })
            }
        }, [roomState]);

    return (
        <>
            {/* <FloatingHeader title="Project Override" width={350} height={50} x={175} y={10}></FloatingHeader> */}
            <Window title="Connecting..." x="50%" y="70%" width={300} height={300} className="login-window">
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        paddingTop: '100px',
                        }}>
                        <Spinner />
                    </div>
            </Window>
        </>
    );
}