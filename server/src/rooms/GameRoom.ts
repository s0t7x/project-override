// The core ProjectOverride gameplay room. Requires JWT auth. Manages the game loop (`setSimulationInterval`), holds instances of EntityManager & AmmoPhysicsEngine. 
// Handles player input ('playerInput', 'combatAction'), game logic messages ('editBlock', 'interact', 'tradeRequest'),
// updates entities/physics, and synchronizes GameRoomState. Uses services for persistence.