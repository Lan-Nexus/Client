<div align="center">
  <img src="client/resources/logo.png" alt="Lan Nexus Logo" width="200"/>
</div>

# Lan Nexus

A cross-platform LAN game launcher that allows you to play games with your friends over a local network. This application is a desktop client (Electron app) for game management and launching.

## Overview

Lan Nexus is designed to facilitate LAN gaming by providing:
- **Game Management**: Add, organize, and manage games from various sources (archives, Steam)
- **Network Discovery**: Automatic server discovery on the local network
- **Game Key Management**: Handle game keys for multiplayer sessions
- **Script Automation**: Custom install, uninstall, and play scripts for games
- **Auto-Updates**: Automatic client updates via GitHub releases

## Architecture

### Client Application
- **Technology**: Electron + Vue 3 + TypeScript + Tailwind CSS
- **Features**:
  - Cross-platform desktop application (Windows, macOS, Linux)
  - Game library management and launching
  - Network server discovery
  - Auto-update functionality
  - Game installation from archives

## Prerequisites

- Node.js v22.17.0 or higher
- npm or yarn

## Installation & Setup

### Quick Start

1. **Clone the repository**:
   ```bash
   git clone https://github.com/samdems/Lan-Nexus.git
   cd Lan-Nexus/client
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Development mode**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   # Windows
   npm run build:win

   # macOS
   npm run build:mac

   # Linux
   npm run build:linux
   ```


### Game Types

#### Archive Games
- Add ZIP/archive files containing game files
- Custom install/uninstall/play scripts
- Support for game keys and multiplayer coordination

#### Steam Games
- Import games from Steam library
- Automatic metadata and artwork fetching
- Direct Steam protocol launching


## Development

### Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
```

## Scripts and Automation

### Game Scripts

Games support three types of custom scripts:

1. **Install Script**: Executed when installing a game
2. **Uninstall Script**: Executed when uninstalling a game
3. **Play Script**: Executed when launching a game

#### Available Variables
- `GAME_KEY`: Reserved game key (if applicable)
- `GAME_ID`: Unique game identifier
- `GAME_NAME`: Game display name
- `GAME_EXECUTABLE`: Path to game executable

#### Example Play Script
```javascript
// Launch the game executable
await run(GAME_EXECUTABLE);

// Custom launch with parameters
await run(GAME_EXECUTABLE, ['-windowed', '-nosound']);
```

## Network Protocol

The application uses a custom UDP discovery protocol on port 50000 for automatic server detection:

- **Discovery Request**: `lanlauncher://get_ip`
- **Server Response**: JSON with protocol and port information

## Auto-Updates

The client application supports automatic updates via GitHub releases:

1. **Versioning**: Use semantic versioning (e.g., v1.0.0)
2. **Release Creation**: Tag releases trigger automatic builds
3. **Distribution**: Built executables are automatically uploaded to GitHub releases
4. **Client Updates**: Users receive automatic update notifications

### Creating a Release

```bash
git tag v1.0.1
git push origin v1.0.1
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and support:
1. Check the [GitHub Issues](https://github.com/samdems/Lan-Nexus/issues)
2. Create a new issue with detailed information
3. Include logs and system information when reporting bugs
