import config from "@colyseus/tools";
import { monitor } from "@colyseus/monitor";
import { playground } from "@colyseus/playground";
import dotenv from 'dotenv';
import prisma from '../db/client';

/**
 * Import your Room files
*/
import { EntryRoom } from "../rooms/EntryRoom";
import { AuthRoom } from "../rooms/AuthRoom";
import { CharacterSelectRoom } from "../rooms/CharacterSelectionRoom";
import { WorldLobbyRoom } from "../rooms/WorldLobbyRoom";
import { GlobalChatRoom } from "../rooms/GlobalChatRoom";


export default config({

    initializeGameServer: (gameServer) => {
        /**
         * Define your room handlers:
         */
        gameServer.define('entry', EntryRoom)
        gameServer.define('auth', AuthRoom);
        gameServer.define('character_select', CharacterSelectRoom);
        gameServer.define('worldLobby', WorldLobbyRoom);
        gameServer.define('globalChat', GlobalChatRoom);
    },

    initializeExpress: (app) => {
        /**
         * Bind your custom express routes here:
         * Read more: https://expressjs.com/en/starter/basic-routing.html
         */
        app.get("/bingo", (req: any, res: any) => {
            res.send("bongo");
        });

        /**
         * Use @colyseus/playground
         * (It is not recommended to expose this route in a production environment)
         */
        if (process.env.NODE_ENV !== "production") {
            app.use("/", playground());
        }

        /**
         * Use @colyseus/monitor
         * It is recommended to protect this route with a password
         * Read more: https://docs.colyseus.io/tools/monitor/#restrict-access-to-the-panel-using-a-password
         */
        app.use("/monitor", monitor());
    },


    beforeListen: () => {
        /**
         * Before before gameServer.listen() is called.
         */

        // Load .env file from the server's root directory
        dotenv.config();

        // Validate essential variables (add more as needed)
        if (!process.env.JWT_SECRET) {
            console.error("FATAL ERROR: JWT_SECRET is not defined in .env file.");
            process.exit(1);
        }
        if (!process.env.DATABASE_URL) {
            console.error("FATAL ERROR: DATABASE_URL is not defined in .env file.");
            process.exit(1);
        }

        // Connect to the database
        prisma.$connect()
            .then(() => {
                console.log('✅ Connected to database successfully.');
            })
            .catch((err: any) => {
                console.error('[Prisma] Failed to connect to database:', err);
                process.exit(1);
            })
    }
});