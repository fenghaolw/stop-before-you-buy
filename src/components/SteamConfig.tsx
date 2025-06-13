import { useState, useEffect } from 'preact/hooks';

export const SteamConfig = () => {
    const [apiKey, setApiKey] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [steamId, setSteamId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // Check if user is already authenticated
        chrome.storage.sync.get(['steamApiKey', 'steamId'], (data) => {
            if (data.steamApiKey) {
                setApiKey(data.steamApiKey);
            }
            if (data.steamId) {
                setSteamId(data.steamId);
                setIsAuthenticated(true);
            }
        });
    }, []);

    const handleAuthenticate = async () => {
        if (!apiKey.trim()) {
            setError('Please set your Steam API key first');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            chrome.runtime.sendMessage(
                { action: 'authenticateWithSteam' },
                (response) => {
                    if (response.success) {
                        setSteamId(response.steamId);
                        setIsAuthenticated(true);
                        console.log('Steam authentication successful');
                    } else {
                        setError(response.error || 'Authentication failed');
                    }
                    setIsLoading(false);
                }
            );
        } catch (err) {
            setError('Authentication failed');
            setIsLoading(false);
        }
    };

    const handleClearAuth = async () => {
        setIsLoading(true);

        try {
            chrome.runtime.sendMessage(
                { action: 'clearSteamAuth' },
                (response) => {
                    if (response.success) {
                        setIsAuthenticated(false);
                        setSteamId('');
                        console.log('Steam authentication cleared');
                    } else {
                        setError(response.error || 'Failed to clear authentication');
                    }
                    setIsLoading(false);
                }
            );
        } catch (err) {
            setError('Failed to clear authentication');
            setIsLoading(false);
        }
    };

    return (
        <div className="steam-config">
            <h3>Steam Configuration</h3>
            <div className="config-section">
                <h4>Authentication Status</h4>
                {isAuthenticated ? (
                    <div className="auth-status authenticated">
                        <span className="status-indicator">✅ Authenticated</span>
                        <p>Steam ID: {steamId}</p>
                        <button
                            onClick={handleClearAuth}
                            disabled={isLoading}
                            className="clear-auth-btn"
                        >
                            Clear Authentication
                        </button>
                    </div>
                ) : (
                    <div className="auth-status not-authenticated">
                        <span className="status-indicator">❌ Not Authenticated</span>
                        <button
                            onClick={handleAuthenticate}
                            disabled={isLoading || !apiKey.trim()}
                            className="auth-btn"
                        >
                            Authenticate with Steam
                        </button>
                    </div>
                )}
            </div>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {isLoading && (
                <div className="loading-indicator">
                    Loading...
                </div>
            )}

            <style jsx>{`
                .steam-config {
                    padding: 20px;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    margin: 10px 0;
                }

                .config-section {
                    margin-bottom: 20px;
                }

                .api-key-input {
                    display: flex;
                    gap: 8px;
                    margin: 8px 0;
                }

                .api-key-input input {
                    flex: 1;
                    padding: 8px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                }

                .save-btn, .auth-btn, .clear-auth-btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: 500;
                }

                .save-btn {
                    background-color: #007cba;
                    color: white;
                }

                .auth-btn {
                    background-color: #4CAF50;
                    color: white;
                }

                .clear-auth-btn {
                    background-color: #f44336;
                    color: white;
                }

                .save-btn:disabled, .auth-btn:disabled, .clear-auth-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .help-text {
                    color: #666;
                    font-size: 12px;
                }

                .help-text a {
                    color: #007cba;
                    text-decoration: none;
                }

                .help-text a:hover {
                    text-decoration: underline;
                }

                .auth-status {
                    padding: 12px;
                    border-radius: 4px;
                    margin: 8px 0;
                }

                .auth-status.authenticated {
                    background-color: #e8f5e8;
                    border: 1px solid #4CAF50;
                }

                .auth-status.not-authenticated {
                    background-color: #ffeaea;
                    border: 1px solid #f44336;
                }

                .status-indicator {
                    font-weight: 500;
                    display: block;
                    margin-bottom: 8px;
                }

                .error-message {
                    background-color: #ffeaea;
                    color: #d32f2f;
                    padding: 8px;
                    border-radius: 4px;
                    margin: 8px 0;
                    font-size: 14px;
                }

                .loading-indicator {
                    text-align: center;
                    color: #666;
                    font-style: italic;
                }
            `}</style>
        </div>
    );
}; 