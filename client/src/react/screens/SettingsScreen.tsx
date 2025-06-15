import { Window } from "../common/Window";
import { BaseScreen } from "./BaseScreen";
import { Button } from "../common/Button";
import { useGameEngine } from "@/context/GameEngine";

export const SettingsScreen: BaseScreen = () => {
    const { uiDirector } = useGameEngine();

    const handleBackClick = () => {
        uiDirector?.pop()
    }

    return <>
        <Window title='Settings' style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                <Button style={{ width: '20%'}} onClick={handleBackClick}>Back</Button>
        </Window>
    </>
}