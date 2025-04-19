import { Animated, BleepsOnAnimator, Text, useBleeps } from "@arwes/react";
import { Window } from "../components/common/Window";
import { FormEvent, useEffect, useState } from "react";
import { FloatingHeader } from "../components/common/FloatingHeader";
import { useGameContext } from "../contexts/GameContext";
import { useGameStore } from "../state/gameStore";
import { Button } from "../components/common/Button";
import { Input } from "../components/common/Input";

// UI component for LoginUI.
export function LoginUI() {
    // State to hold username and password input values
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { networkService } = useGameContext(); // Get the network service from context
    const { authStatus, errorMessage, setCurrentScreen} = useGameStore();

    const [awaitingResponse, setAwaitingResponse] = useState(false);

    // Handle form submission
    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault(); // Prevent default browser form submission (page reload)
        // onLoginSubmit({ username, password }); // Call the passed-in function
        // Clear fields after submission attempt (optional)
        useGameStore.getState().setError(null);
        setAwaitingResponse(true);
        networkService.sendMessage('login', { username, password });
        // setUsername('');
        // setPassword('');
    };

    useEffect(() => {
        if(authStatus == 'authenticated')
            (async ()=> {
                // await networkService.leaveRoom();
                await networkService.joinRoom('character_select');
                setCurrentScreen('charSelect');
            })();
    }, [authStatus])

    const bleeps = useBleeps()
    useEffect(() => {
        if(errorMessage)
            bleeps.error?.play();
    }, [errorMessage])


    const handleExit = () => {
        // Handle exit logic here
        console.log("Exit Button clicked");
        // You can also close the window or redirect the user
        window.close(); // This will close the current window
    }

    const Spinner = () => (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
        }}>
            <div className="sci-fi-spinner" />
        </div>
    );

    // networkService.joinRoom("entry");

    return (
        <>
            <FloatingHeader title="Project Override" width={350} height={50} x={175} y={10}></FloatingHeader>
            <Window title="authenticate" x="50%" y="70%" width={300} height={350} className="login-window">
                {!awaitingResponse || errorMessage ?
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '5px', paddingTop: '20px' }}>
                        <div className="input-group">
                            <Text as="label" htmlFor="username-input" style={{ display: 'block', marginBottom: '5px' }}>
                                Username:
                            </Text>
                            <Input
                                id="username-input"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>

                        <div className="input-group">
                            <Text as="label" htmlFor="password-input" style={{ display: 'block', marginBottom: '5px' }}>
                                Password:
                            </Text>
                            <Input
                                id="password-input"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        { errorMessage ? <Animated as='span' className="danger" style={{ height: '1em', maxHeight: '1em'}}>{errorMessage?.split(':').slice(1)[0]?.slice(1)}</Animated> : <span style={{height: '1em', maxHeight: '1em'}}></span> }

                        <Button type="submit" style={{ marginTop: '15px' }}>
                            <Text>Log In</Text>
                        </Button>
                        {/* <Button type="submit" className="secondary" style={{ lineHeight: '0'}}>
                        <Text>Register</Text>
                    </Button> */}
                        <Button type="button" onClick={handleExit} className="danger" style={{ lineHeight: '0' }}>
                            <Text>Exit</Text>
                        </Button>
                    </form> :
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        paddingTop: '100px',
                        }}>
                        <Spinner />
                    </div>
                }
            </Window>
        </>
    );
}