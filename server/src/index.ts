import { listen } from "@colyseus/tools";
import app from "./colyseus/app.config";

import { Encoder } from "@colyseus/schema";
Encoder.BUFFER_SIZE = 256 * 1024; // 256 KB

// Suppress console.log output during server startup
const originalConsoleLog = console.log;
console.log = () => {}

listen(app).then((gameServer) => {  
    console.log = originalConsoleLog; // Restore console.log
    console.log(`ℹ️  Server version: ${process.env.npm_package_version}`);
    console.log(`ℹ️  Server PID: ${process.pid}`);
});