# WebSocket Game Session Integration

This directory contains the WebSocket service that enables real-time communication between the client and server for game session tracking.

## Overview

The WebSocket integration allows the client to notify the server when games are started and stopped, enabling real-time tracking of active game sessions across all connected clients.

## Files

### `websocketService.ts`

The main WebSocket service that handles:
- Connection management with automatic reconnection
- Game session start/end events
- Real-time event listening
- Error handling and retry logic

## Usage

### Basic Integration

The WebSocket service is automatically initialized when the game store is created:

```typescript
import { websocketService } from '../services/websocketService.js';

// The service connects automatically when the game store initializes
// Manual connection (if needed):
await websocketService.connect();
```

### Game Session Tracking

Sessions are automatically managed through the game store:

```typescript
// Starting a game session (called automatically when playing a game)
const success = await websocketService.startGameSession(gameId);

// Ending a game session (called automatically when game stops)
const success = await websocketService.endGameSession();

// Check current session status
const isActive = websocketService.isSessionActive();
const session = websocketService.getCurrentSession();
```

### Testing WebSocket Functionality

The game store provides test methods for debugging:

```typescript
import { useGameStore } from '../stores/useGameStore.js';

const gameStore = useGameStore();

// Test connection
const connected = await gameStore.testWebSocketConnection();

// Test session start/end
const started = await gameStore.testStartSession(gameId);
const ended = await gameStore.testEndSession();

// Get session info
const info = gameStore.getCurrentSessionInfo();
```

## Events

### Client to Server Events

- `game_session_started` - Sent when a game begins
- `game_session_ended` - Sent when a game stops

### Server to Client Events

- `session_started` - Broadcast when any session starts
- `session_ended` - Broadcast when any session ends
- `session_updated` - Broadcast when session data changes
- `active_sessions_updated` - Broadcast with current active sessions
- `session_error` - Error notifications

## Data Structure

```typescript
interface GameSessionData {
  id?: number;          // Server-assigned session ID
  clientId: string;     // Unique client identifier
  gameId: number;       // Game ID being played
  startTime: string;    // ISO timestamp of session start
  endTime?: string;     // ISO timestamp of session end (when ended)
  isActive: number;     // 1 = active, 0 = ended
  durationSeconds?: number; // Total session duration
}
```

## Connection Management

The service includes robust connection management:

- **Automatic Reconnection**: Uses exponential backoff with a maximum of 5 attempts
- **Connection Monitoring**: Checks connection status every 30 seconds
- **Error Handling**: Graceful degradation when WebSocket is unavailable
- **Session Persistence**: Maintains session state across reconnections

## Backend Integration

The server handles WebSocket events and:
- Saves sessions to the database
- Broadcasts events to all connected clients
- Manages active session tracking
- Provides session analytics data

## Troubleshooting

### Connection Issues

1. **Check Server Address**: Ensure the server address is properly configured
2. **Network Connectivity**: Verify the client can reach the server
3. **Protocol Mismatch**: Ensure HTTP/HTTPS is properly converted to WS/WSS

### Session Tracking Issues

1. **Game Detection**: Check if `watchIfGameStopped()` is properly detecting game state
2. **Client ID**: Verify the client ID is being generated correctly
3. **Database**: Check server logs for database connection issues

### Debug Logging

Enable debug logging by checking the browser console for messages prefixed with `[websocketService]` or `[useGameStore]`.

## Security Considerations

- Client ID is generated from machine ID for consistency
- No sensitive data is transmitted through WebSocket events
- Session data is validated on the server side
- Connection is automatically terminated if authentication fails

## Performance

- Minimal bandwidth usage (only session start/end events)
- Automatic cleanup of inactive sessions
- Efficient reconnection strategy to avoid overwhelming the server
- Local session state caching to reduce server requests