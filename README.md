# Stop Before You Buy

A Chrome extension that helps prevent duplicate game purchases by tracking your game libraries across multiple platforms (Steam, Epic Games, GOG) and warning you when you're about to buy a game you already own.

## How to Use

The extension works by checking the games you are Browse on popular online game stores against a local copy of your game library. When it detects that you already own the game, it will display a notification, warning you that you are about to purchase a game you already own.

To build its database, "Stop Before You Buy" relies on a one-time import of a CSV file generated from your GOG Galaxy client. GOG Galaxy is a free application that allows you to connect and manage all your games from different platforms like Steam, Epic Games Store, Ubisoft Connect, and more, all in one place.

To import your game library, follow these steps:

1. Sync Your Game Libraries with GOG Galaxy:
   - Download and install GOG Galaxy if you haven't already.
   - Open GOG Galaxy and connect your various gaming platform accounts (e.g., Steam, Epic Games Store, etc.). This will allow GOG Galaxy to create a unified view of all your games.
2. Export Your Game Library as a CSV File
   - You will need to use the "GOG-Galaxy-Export-Script" to export your library. You can find this tool on GitHub: https://github.com/AB1908/GOG-Galaxy-Export-Script
   - Follow the instructions on the GitHub page to download and run the script. This will generate a .csv file containing a list of all your games.
3. Import Your Library into "Stop Before You Buy"
   - Install the "Stop Before You Buy" extension from the Chrome Web Store.
   - Click on the extension's icon in your browser's toolbar.
   - Select "Import CSV File" and choose the file you exported from GOG Galaxy.

That's it! The extension will now have a local record of your game library and will alert you whenever you are on a store page for a game you already own.

### Development Setup

1. Clone this repository:

   ```bash
   git clone <repository-url>
   cd stop-before-you-buy
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Build the extension:

   ```bash
   npm run build
   ```

4. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the `dist` folder

### CSV Format

The extension expects a tab-separated CSV file with the following columns:

- **title** (required): The name of the game
- **platformList** (required): The platform(s) where you own the game (Steam, GOG, Epic Games Store, etc.)

The `platformList` column can contain multiple platforms separated by commas or tabs.

Example CSV format:

```csv
title	platformList
Cyberpunk 2077	Steam
The Witcher 3: Wild Hunt	GOG
Hades	Epic Games Store
Control	Epic Games Store, Steam
Metro Exodus	Steam, Epic Games Store
```

Note: The extension automatically detects whether your CSV uses tab or comma separation.

## Privacy

"Stop Before You Buy" is designed with your privacy in mind.

- The extension stores your game library information locally on your own computer.
- This data is not transmitted, sold, or shared with the developers or any third parties.
- The extension only communicates with the websites you are Browse to check for game titles and display ownership notifications.

## TODO - Future Improvements

### Multi-Language Support

- **TODO**: Add support for multiple locales and languages
- **TODO**: Implement language-aware game title matching for non-English titles
- **TODO**: Support for localized game store pages (Steam in different languages, etc.)
- **TODO**: Handle character normalization for different writing systems (Cyrillic, CJK, etc.)
- **TODO**: Add configuration options for preferred language/locale settings

### Enhanced Matching

- **TODO**: Improve fuzzy matching algorithms for better accuracy
- **TODO**: Add support for alternative game titles and translations
- **TODO**: Handle regional variations in game naming conventions
- **TODO**: Add support in wishlist page

### Platform Support

- **TODO**: Add support for additional gaming platforms
- **TODO**: Improve platform-specific game detection logic

**Current Limitation**: The extension currently only supports English game titles and may not work correctly with games in other languages.

---

**Note**: This extension is not affiliated with Steam, Epic Games, GOG, or any other gaming platform.
