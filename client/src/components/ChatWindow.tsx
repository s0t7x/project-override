import { Animated, BleepsOnAnimator, Text, useBleeps } from "@arwes/react";
import { Window } from "../components/common/Window";
import { FormEvent, useEffect, useState } from "react";
import { FloatingHeader } from "../components/common/FloatingHeader";
import { useGameContext } from "../contexts/GameContext";
import { useGameStore } from "../state/gameStore";
import { Button } from "../components/common/Button";
import { Input } from "../components/common/Input";
import { Room } from "colyseus.js";

// UI component for LoginUI.
export function ChatWindow() {
    const { networkService } = useGameContext();
    const { globalChatRoom } = useGameStore();

    const [ lastMessages, setLastMessages ] = useState<any[]>([])
    const [ chatInput, setChatInput ] = useState<string>('')

    const chatElement = ({sender, message}: {sender: any, message: any}) => (
        <div>
            <span>[{sender.character.name}]</span><span> </span>
            <span>{message}</span>
        </div>
    )

    useEffect(() => {
        document.getElementById('chatMessages')?.scrollTo(0, document.getElementById('chatMessages')?.scrollHeight || 0)
    }, [lastMessages])

    const messageHandler = (data: any) => {
        console.log('[GlobalChatWindow] Message received', data)
        setLastMessages((prev) => {
            if(prev.length > 16) 
                prev.shift()
            return [...prev, chatElement(data)]
        })
    }

    useEffect(() => {
        if(!globalChatRoom) return;
        console.log('[GlobalChatWindow] Assigning message handler');
        (globalChatRoom as Room).removeAllListeners();
        networkService.addMessageListenerRx(globalChatRoom, 'chat', messageHandler);
    }, [globalChatRoom])

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if(!globalChatRoom) return;
        setChatInput('')
        networkService.sendMessageTx(globalChatRoom, 'chat', chatInput)
    }

    return (
        <>
            <Window title="Chat" x={200} y="calc(100% - 125px)" width={400} height={250} className="login-window">
                <div id='chatMessages' style={{ display: 'flex', flexDirection: 'column', justifyContent: 'start', minHeight: 'calc(100% - 30px)', maxHeight: 'calc(100% - 30px)', paddingBottom: '5px', overflow: 'none', overflowY: 'hidden' }}>
                    { lastMessages }
                </div>
                <div>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', width: "100%", paddingRight: 25, flexDirection: 'row', justifyContent: 'stretch', position: 'absolute' }}>
                        <Input style={{flex: 1, flexGrow: 1}} value={chatInput} onChange={e => setChatInput(e.target.value)}/>
                        <Button type="submit" style={{maxWidth: 64}}>Send</Button>
                    </form>
                </div>
            </Window>
        </>
    );
}