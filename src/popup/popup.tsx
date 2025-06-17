import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import Papa from 'papaparse';
import './popup.scss';

interface GameLibrary {
  title: string;
  platform: string;
}

function Popup() {
  const [libraries, setLibraries] = useState<GameLibrary[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState('');

  useEffect(() => {
    loadLibraries();
  }, []);

  const loadLibraries = async () => {
    try {
      const result = await chrome.storage.local.get(['gameLibraries']);
      if (result.gameLibraries) {
        setLibraries(result.gameLibraries);
      } else {
        setLibraries([]);
      }
    } catch (error) {
      console.error('Error loading libraries:', error);
    }
  };

  const handleFileImport = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (!file) return;

    setIsImporting(true);
    setImportStatus('Importing...');

    try {
      // Check if chrome.storage is available
      if (!chrome || !chrome.storage) {
        throw new Error('Chrome storage API not available');
      }

      const text = await file.text();

      // Use papaparse to properly handle CSV parsing
      const parseResult = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        delimiter: '', // Auto-detect delimiter
        transformHeader: (header: string) => header.toLowerCase().trim()
      });

      if (parseResult.errors.length > 0) {
        console.warn('CSV parsing errors:', parseResult.errors);
      }

      const data = parseResult.data as Record<string, string>[];
      // CSV data parsed successfully

      // Check if required columns exist
      if (data.length === 0) {
        throw new Error('No data found in CSV file.');
      }

      const firstRow = data[0];
      const hasTitle = 'title' in firstRow;
      const hasPlatformList = 'platformlist' in firstRow;

      // Validate required columns exist

      if (!hasTitle) {
        throw new Error('Could not find title column in CSV. Expected "title" column.');
      }

      if (!hasPlatformList) {
        console.warn('Could not find platformlist column. Available columns:', Object.keys(firstRow));
      }

      const gameLibraries: GameLibrary[] = [];

      for (const row of data) {
        const title = row.title?.trim();
        if (!title) continue;

        // Handle platform list - can contain multiple platforms separated by tabs or commas
        let platforms = ['Unknown'];
        if (hasPlatformList && row.platformlist) {
          const platformField = row.platformlist.trim();

          // Split by tab or comma and clean up
          platforms = platformField
            .split(/[\t,]/)
            .map(p => p.trim())
            .filter(p => p && p !== '');

          if (title === '911 Operator') {
            // Process platform field
          }

          if (platforms.length === 0) {
            platforms = ['Unknown'];
          }
        }

        // Create a separate entry for each platform
        for (const platform of platforms) {
          const game: GameLibrary = {
            title: title,
            platform: platform,
          };
          gameLibraries.push(game);

          // Debug specific game
          if (title === '911 Operator') {
            // Add game entry
          }
        }
      }

      // Use Promise-based approach for better error handling
      await new Promise<void>((resolve, reject) => {
        chrome.storage.local.set({ gameLibraries }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });

      setLibraries(gameLibraries);
      setImportStatus(`Successfully imported ${gameLibraries.length} games`);

      // Force a reload of libraries to ensure state is in sync
      await loadLibraries();
    } catch (error) {
      console.error('Error importing CSV:', error);
      setImportStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsImporting(false);
      target.value = '';
    }
  };

  const clearLibraries = async () => {
    await chrome.storage.local.remove(['gameLibraries']);
    setLibraries([]);
    setImportStatus('Libraries cleared');
  };

  return (
    <div className="popup">
      <div className="popup__header">
        <h1 className="popup__title">Stop Before You Buy</h1>
        <p className="popup__subtitle">Game Library Tracker</p>
      </div>

      <div className="popup__content">
        <div className="popup__import-section">
          <label className="popup__file-input">
            <input type="file" accept=".csv" onChange={handleFileImport} disabled={isImporting} />
            <span className="popup__file-button">
              {isImporting ? 'Importing...' : 'Import CSV File'}
            </span>
          </label>

          {importStatus && (
            <p
              className={`popup__status ${importStatus.includes('Error') ? 'popup__status--error' : 'popup__status--success'}`}
            >
              {importStatus}
            </p>
          )}
        </div>

        <div className="popup__stats">
          <p className="popup__library-count">
            <strong>{libraries.length}</strong> games in your libraries
          </p>

          {libraries.length > 0 && (
            <button className="popup__clear-button" onClick={clearLibraries}>
              Clear All Libraries
            </button>
          )}
        </div>

        {libraries.length > 0 && (
          <div className="popup__library-preview">
            <h3>Recent Games:</h3>
            <ul className="popup__game-list">
              {libraries.slice(0, 5).map((game, index) => (
                <li key={index} className="popup__game-item">
                  <span className="popup__game-title">{game.title}</span>
                  <span className="popup__game-platform">{game.platform}</span>
                </li>
              ))}
            </ul>
            {libraries.length > 5 && (
              <p className="popup__more-games">...and {libraries.length - 5} more</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

render(<Popup />, document.getElementById('root')!);
