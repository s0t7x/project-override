import { useEffect, useState } from "react";
import { Window } from "../common/Window";
import { BaseScreen } from "./BaseScreen";
import { Button } from "../common/Button";
import { useServices } from "@/context/Services";
import { useGameEngine } from "@/context/GameEngine";
import { useNetworkStore } from "@/stores/NetworkStore";
import { ICharactersRoomState } from "@project-override/shared/states/CharactersRoomState";
import { CharacterSlot } from "../common/CharacterSlot";
import { ICharacterSummary } from "@project-override/shared/core/CharacterSummary";

export const CharacterSelectionScreen: BaseScreen = () => {
    const { networkService } = useServices();
    const { primaryRoomState } = useNetworkStore();
    const { sceneDirector, uiDirector } = useGameEngine();
    
    const [charactersRoomState, setCharactersRoomState] = useState<ICharactersRoomState | undefined>();

    useEffect(() => {
        networkService.joinRoom('characters', undefined, true);
    }, []);

    useEffect(() => {
        if(primaryRoomState)
            setCharactersRoomState(primaryRoomState as ICharactersRoomState);
    }, [primaryRoomState]);

    const maxCharacterCount = (primaryRoomState as ICharactersRoomState)?.maxCharacterCount ?? 0;

    const handleCharacterClick = (character?: ICharacterSummary) => {
        if(!character) {
            alert('should go to character creation')
        } else {
            uiDirector?.pop();
            sceneDirector?.changeScene('test');
        }
    }

    const handleSettingsClick = () => {
        uiDirector?.push('settings')
    }

    return <>
        <div style={{ paddingTop:'10%', display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: '10px', marginTop: '10px', alignContent: 'center'}}>
            {[...Array(maxCharacterCount)].map((_, index) => (
                <CharacterSlot key={index} character={charactersRoomState?.characterSummaries[index] || undefined} onClick={handleCharacterClick} />
            ))}
        </div>
        <Window title='' y='75%' width='50%' style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                <Button style={{ width: '20%'}}>Exit</Button>
                <Button style={{ width: '20%'}} onClick={handleSettingsClick}>Settings</Button>
        </Window>
    </>
}