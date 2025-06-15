import { useEffect, useState } from "react";
import { Window } from "../common/Window";
import { BaseScreen } from "./BaseScreen";
import { Button } from "../common/Button";
import { useServices } from "@/context/Services";
import { Spinner } from "../common/Spinner";
import { useGameEngine } from "@/context/GameEngine";
import { useAuthStore } from "@/stores/AuthStore";
import { AuthLoginResponse, AuthMessageTypeEnum } from "@project-override/shared/messages/Auth";
import { TitleScreenScene } from "@/babylon/scenes/TitleScreenScene";
import { AnimationUtils } from "@/babylon/utils/AnimationUtils";

function parseJwt(token: string): any {
  try {
    const payloadBase64 = token.split('.')[1];
    const payloadJson = atob(payloadBase64);
    return JSON.parse(payloadJson);
  } catch (e) {
    console.error("Invalid JWT", e);
    return null;
  }
}

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
    const { uiDirector, sceneDirector } = useGameEngine()
    const { steamworks, networkService } = useServices();
    const [username, setUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    
    const {authTokens} = useAuthStore();
    
    const [triedSteam, setTriedSteam] = useState<boolean>(false);
    const [tryLogin, setTryLogin] = useState<boolean>(false);
    const [connected, setConnected] = useState<boolean>(false);
    const [hasSteamAuthTicket, setHasSteamAuthTicket] = useState<boolean>(false);
    const [hasError, setHasError] = useState<boolean>(false);

    useEffect(() => {
        networkService.initialize();
        networkService.joinRoom('auth', undefined, true).then((room) => {
            if(room) {
                setConnected(true);
                networkService.addErrorListener(null, (data) => {
                    setTryLogin(false);
                    setHasError(true);
                    const ts = triedSteam
                    uiDirector.showAlert("Error", data.message, () => {
                        console.log(ts)
                        if(ts) {
                            uiDirector.pop();
                            sceneDirector.changeScene('titleScreen');
                        } else {
                            setHasError(false);
                            setTriedSteam(true);
                        }
                    }, null, { y: '75%'});
                });
                networkService.onMessageOnce(null, AuthMessageTypeEnum.AuthLoginResponse, (response: AuthLoginResponse) => {
                    setTryLogin(false);
                    useAuthStore.setState({
                        authTokens: {
                            accessToken: response.accessToken,
                            refreshToken: response.refreshToken
                        },
                        payload: parseJwt(response.accessToken),
                        isAuthenticated: true
                    });
                    const scene = sceneDirector.getActiveScene() as TitleScreenScene;
                    if(scene) {
                        AnimationUtils.fadeAlpha(scene, scene._mainContainer, 0, 1).then(() => {
                            // sceneDirector.changeScene('test');
                            uiDirector.pop();
                            uiDirector.push('characterSelection');
                        });
                    }
                });
            }
        }, () => {
            uiDirector.showAlert("Error", 'No connection to server', () => {
                uiDirector.pop();
                sceneDirector.changeScene('titleScreen');
            }, null, { y: '75%'});
            setHasError(true);
        })
    }, []);

    useEffect(() => {
        if(connected)
            (async () => {
                let authTicket = null;
                if(steamworks?.client) {
                    const steamId = steamworks.client.localplayer.getSteamId().steamId64;
                    authTicket = await steamworks.client.auth.getSessionTicketWithSteamId(steamId);
                }
                if (authTicket) {
                    setHasSteamAuthTicket(true);
                    networkService.sendMessage(null, AuthMessageTypeEnum.AuthSteamLoginRequest, { authTicket: Buffer.from(authTicket.getBytes(), 'binary').toString('hex') })
                }
            })();
    }, [connected]);

    // --- Event Handling ---
    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        // Prevent the default browser behavior of reloading the page on submit.
        event.preventDefault();

        setTryLogin(true);
        networkService.sendMessage(null, AuthMessageTypeEnum.AuthLoginRequest, { username, password })
    };

    return <>
        {((steamworks.client && !hasSteamAuthTicket) && !authTokens && !hasError) || tryLogin ?
            <Window title='' y='75%'>
                <form style={styles.form}>
                    <Spinner text={connected ? (tryLogin ? 'Authenticating with Account...' : 'Authenticating with Steam...') : 'Connecting...'} />
                </form>
            </Window>
            :
            (authTokens || hasError || !triedSteam ? <></> :
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