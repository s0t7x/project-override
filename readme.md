# project-override

## Current State

The project is currently in an active development phase, with core systems for real-time multiplayer, player interaction, and basic game mechanics in place.

## Core Technical Features & How They Work

### 1. Overall Architecture

- **Monorepo with PNPM Workspaces**: The project is organized as a monorepo using PNPM workspaces. This structure houses the `client`, `server`, `shared` (for code used by both client and server), and `tools` packages in a single repository, simplifying dependency management and cross-package development.
- **TypeScript**: The entire codebase (client, server, shared) is written in TypeScript, providing static typing for better code quality, maintainability, and developer experience.

### 2. Backend Systems

- **Runtime & Framework**: The server is built with Node.js and uses the Express.js framework to handle HTTP requests, primarily for authentication and serving initial client files.
- **Real-time Multiplayer Engine**:
    - **How it works**: Colyseus is the backbone for real-time communication. It manages game rooms, WebSocket connections, and state synchronization.
    - `Room` classes on the server define the game's lifecycle and processes messages from clients.
- **Database (PostgreSQL & Prisma ORM)**:
    - **How it works**: PostgreSQL is used as the relational database for persistent storage.
    - Prisma acts as the Object-Relational Mapper (ORM). The database schema is defined in `prisma/schema.prisma`. Prisma Client is used by repositories in the server-side code (e.g., for authentication) to interact with the database in a safe way.
- **Authentication**:
    - **How it works**: It implements a local strategy (username/password) for registration and login. Passwords are hashed using `bcryptjs`.
        - Upon successful login, a JSON Web Token (JWT) is generated and sent to the client.
        - This JWT is then used by the client to authenticate with Rooms, ensuring only logged-in users can join.
- **Server-Authoritative Game Logic**:
    - **How it works**: The server has the final say on game state.
        - Clients send data to the server.
        - The server's Room processes these data, updating the player within the server-side `Player` schema.
        - A server-side game loop (`update` method) periodically updates the game state
        - These state changes (diff only) are then automatically broadcast to all clients. This model helps prevent cheating.

### 3. Frontend Systems (Client)

- **Rendering Engine**:
- **UI Framework (React & Zustand)**:
    - **How it works**: React is used for building user interface elements that overlay or sit alongside the game canvas (e.g., chat, login forms, player lists).
    - Zustand, a lightweight state management library, is used to manage the state of React UI components (e.g., auth status, chat messages).
- **Networking**:
    - **How it works**: The Colyseus JavaScript client connects to the server, joins a room and handles sending/receiving real-time messages and state updates.
- **Build Tool (Vite)**:
    - **How it works**: Vite is used as the build tool for the client, offering a fast development server and optimized production builds.

### 4. Shared Code

- A dedicated `shared` workspace contains TypeScript types, interfaces, and potentially utility functions that are used by both the client and server. This ensures consistency, especially for data structures passed over the network.

## How Key Systems Interact: A Quick Flow

1.  **User Authentication**:

    - Client joins `AuthRoom` and sends `Auth.LoginRequest` to the server
    - Server's `AuthService` validates the user.
    - An Access and a Refresh JWT are returned to the client upon success.

2.  **Joining the Game**:
    - Client stores the JWT.
    - Client uses the Colyseus SDK to attempt to join the `CharactersRoom`, sending the JWT for authentication.
    - Server's `AuthService` validates the JWT. If valid, characters are fetched from DB and synchronized to the client.

## Getting Started

### Prerequisites

- Node.js (v22 or later)
- PNPM (package manager)

### Installation

1.  **Clone the repository**:

    ```bash
    git clone <your-repository-url>
    cd <your-project-directory>
    ```

2.  **Install dependencies**:

    ```bash
    pnpm install
    ```

3.  **Create .env**
    `server/.env`
    ```
    DATABASE_URL="postgresql://username:password@127.0.0.1:5432/po_v1?schema=template_0"
    SERVER_HOST=0.0.0.0
    SERVER_PORT=2567
    JWT_SECRET="your-very-strong-and-long-secret-key"
    JWT_REFRESH_SECRET="another-very-strong-and-long-refresh-secret-key"
    JWT_ACCESS_TOKEN_EXPIRATION="15d"
    JWT_REFRESH_TOKEN_EXPIRATION="7d"
    USER_REGISTRATION_ALLOWED=true
    USER_PASSWORD_MIN_LENGTH=8
    USER_PASSWORD_SALT_ROUNDS=10
    ```

### Running the Development Environment

    pnpm dev
