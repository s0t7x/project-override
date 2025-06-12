import { useEffect, useState } from "react";
import { Window } from "../common/Window";
import { BaseScreen } from "./BaseScreen";
import { Button } from "../common/Button";
import { useServices } from "@/context/Services";
import { Spinner } from "../common/Spinner";
import { useGameEngine } from "@/context/GameEngine";
import { Text } from "@arwes/react";

const styles: { [key: string]: React.CSSProperties } = {
    form: {
        paddingTop: '1.75rem',
        paddingBottom: '0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        width: '100%',
        maxWidth: '400px',
    },
    title: {
        margin: '0 0 1rem 0',
        fontSize: '1.5rem',
        textAlign: 'center',
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.2em',
    },
    label: {
        fontWeight: 100,
        fontFamily: 'Monospace',
    },
    input: {
        padding: '0.3em',
        border: '1px solid #ccc',
        fontSize: '1rem',
    },
    button: {
    },
};

export const LoginScreen: BaseScreen = () => {

    const [username, setUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const { uiDirector } = useGameEngine()
    const { steamworks } = useServices();

    const [authTicket, setAuthTicket] = useState<any>(null)

    useEffect(() => {
        (async () => {
            const steamId = steamworks.client.localplayer.getSteamId().steamId64;
            const authTicket = await steamworks.client.auth.getSessionTicketWithSteamId(steamId);
            if (authTicket) {
                setAuthTicket(authTicket);
                uiDirector.showAlert('Connected', `Got AuthTicket (${Buffer.from(authTicket.getBytes(), 'binary').toString('hex').substring(0, 16) + '...'}) for SteamId64: ${steamId}`, undefined, undefined, { y: '75%'})
            }
        })();
    }, []);

    // --- Event Handling ---
    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        // Prevent the default browser behavior of reloading the page on submit.
        event.preventDefault();

        // Here is where you would handle the form data, e.g., send it to an API.
        console.log('Submitting with:', { username, password });
        alert(`Login attempt for: ${username}`);
    };

    return <>
        {(steamworks && !authTicket) ?
            <Window title='' y='75%'>
                <form style={styles.form}>
                    <Spinner text='Authenticating with Steam...' />
                </form>
            </Window>
            :
            (authTicket ? <></> :
                <Window title='' y='75%'>
                    <form onSubmit={handleSubmit} style={styles.form}>
                        <div style={styles.inputGroup}>
                            <label htmlFor="username" style={styles.label}>
                                Username
                            </label>
                            <input
                                type="text"
                                id="username"
                                name="username"
                                required
                                autoComplete="username"
                                value={username} // Controlled component: value is driven by state
                                onChange={(e) => setUsername(e.target.value)} // Update state on change
                                style={styles.input}
                            />
                        </div>

                        {/* Password Field */}
                        <div style={styles.inputGroup}>
                            <label htmlFor="password" style={styles.label}>
                                Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                required
                                autoComplete="current-password"
                                value={password} // Controlled component: value is driven by state
                                onChange={(e) => setPassword(e.target.value)} // Update state on change
                                style={styles.input}
                            />
                        </div>

                        {/* Submit Button */}
                        <Button type="submit" style={styles.button}>
                            Log In
                        </Button>
                    </form>
                </Window>)
        }
    </>
}