import { Animated, BleepsOnAnimator, Text, useBleeps } from "@arwes/react";
import { Window } from "../components/common/Window";
import { FormEvent, useEffect, useState } from "react";
import { FloatingHeader } from "../components/common/FloatingHeader";
import { useGameContext } from "../contexts/GameContext";
import { useGameStore } from "../state/gameStore";
import { Button } from "../components/common/Button";
import { Input } from "../components/common/Input";
import { ChatWindow } from "../components/ChatWindow";

// UI component for LoginUI.
export function WorldLobbyUI() {
    return (
        <>
            <ChatWindow />
            <Window title="WorldLobby" x="50%" y="70%" width={300} height={350} className="login-window">
                <form>
                    <Button type="submit" style={{ marginTop: '15px' }}>
                        <Text>lel</Text>
                    </Button>
                </form>
            </Window>
        </>
    );
}