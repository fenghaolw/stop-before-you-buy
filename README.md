# Stop Before You Buy

A Chrome extension that helps prevent duplicate game purchases by tracking your game libraries across multiple platforms (Steam, Epic Games, GOG) and warning you when you're about to buy a game you already own.

## Installation

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

## Usage

### 1. Import Your Game Libraries

1. Click the extension icon in your Chrome toolbar
2. Click "Import CSV File"
3. Select a CSV file containing your game library

#### CSV Format

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

### 2. Browse Game Stores

Once your libraries are imported, simply browse:

- Steam Store (`store.steampowered.com`)
- Epic Games Store (`store.epicgames.com`)
- GOG (`gog.com`)

The extension will automatically check if you already own the game and show a warning if you do.

### 3. Manage Your Libraries

- View your imported games in the popup
- See the total count of games in your libraries
- Clear all libraries if needed

## Privacy

- All game library data is stored locally in your browser
- No data is sent to external servers
- The extension only reads page content to detect games

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

### Platform Support
- **TODO**: Add support for additional gaming platforms
- **TODO**: Improve platform-specific game detection logic

**Current Limitation**: The extension currently only supports English game titles and may not work correctly with games in other languages.

---

**Note**: This extension is not affiliated with Steam, Epic Games, GOG, or any other gaming platform.
