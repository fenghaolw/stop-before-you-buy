import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/preact';
import { afterEach } from 'vitest';
import { vi } from 'vitest';

// Mock Chrome API
const mockChrome = {
    storage: {
        local: {
            get: vi.fn(),
            set: vi.fn(),
        },
    },
    runtime: {
        sendMessage: vi.fn(),
        onMessage: {
            addListener: vi.fn(),
        },
    },
    tabs: {
        create: vi.fn(),
        onUpdated: {
            addListener: vi.fn(),
            removeListener: vi.fn(),
        },
    },
};

// @ts-expect-error - Mocking Chrome API
global.chrome = mockChrome;

// Clean up after each test
afterEach(() => {
    cleanup();
    vi.clearAllMocks();
}); 