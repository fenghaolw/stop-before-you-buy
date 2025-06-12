# Stop Before You Buy

A Chrome extension that helps you avoid duplicate game purchases across Steam, Epic Games, and GOG platforms.

## Features

- Connect your game libraries from Steam, Epic Games, and GOG
- Automatic detection of games you already own
- Warning notifications when viewing games you already own
- Purchase confirmation prompts to prevent accidental duplicate purchases
- Clean and modern user interface
- Automatic library synchronization

## Installation

1. Clone this repository or download the ZIP file
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory

## Usage

1. Click the extension icon in your Chrome toolbar
2. Connect your game libraries by clicking the respective platform buttons
3. The extension will automatically sync your libraries
4. When browsing game stores, you'll see warnings if you already own the game on another platform

## Supported Platforms

- Steam Store
- Epic Games Store
- GOG.com

## Development

### Project Structure

- `manifest.json` - Extension configuration
- `popup.html` - Extension popup interface
- `popup.js` - Popup logic and UI interactions
- `background.js` - Background service worker for API calls
- `content.js` - Content script for store page detection
- `styles.css` - Extension styling

### API Integration

The extension currently uses mock data for demonstration purposes. To implement actual API integration:

1. Steam: Requires Steam Web API key and user authentication
2. Epic Games: Requires Epic Games authentication
3. GOG: Requires GOG authentication

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - feel free to use this project for your own purposes.

## Disclaimer

This extension is not officially affiliated with Steam, Epic Games, or GOG. Use at your own risk. 