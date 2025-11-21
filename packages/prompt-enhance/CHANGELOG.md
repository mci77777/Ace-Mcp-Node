# Changelog

All notable changes to Prompt Enhance will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial Electron desktop application
- Embedded Web UI (no browser required)
- Debug page at `/debug` for troubleshooting
- Detailed diagnostic logging
- Automatic port detection (8090-8099)
- Cross-platform support (Windows, macOS, Linux)

### Fixed
- Fixed blank Web UI after packaging
- Improved static resource path resolution
- Enhanced template file loading in asar environment

### Changed
- Migrated from browser-based UI to native Electron window
- Improved error messages with detailed diagnostics

## [0.1.0] - 2025-11-17

### Added
- Initial release
- Prompt enhancement service
- Project file scanning
- Multi-model support
- Real-time log viewing
- Configuration management interface
- Web-based management UI
- MCP protocol integration

### Features
- ✅ Native desktop application
- ✅ Embedded Web UI
- ✅ Automatic port detection
- ✅ Prompt enhancement service
- ✅ Project file scanning
- ✅ Multi-model support
- ✅ Real-time log viewing
- ✅ Configuration management

### Technical Details
- Built with Electron 39.2.1
- Node.js 18+ required
- TypeScript 5.9+
- Express web server
- WebSocket for real-time logs

---

## Release Notes Format

### Added
- New features

### Changed
- Changes in existing functionality

### Deprecated
- Soon-to-be removed features

### Removed
- Removed features

### Fixed
- Bug fixes

### Security
- Security fixes
