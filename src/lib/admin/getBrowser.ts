type BrowserName =
    | 'chrome'
    | 'edge'
    | 'firefox'
    | 'safari'
    | 'opera'
    | 'brave';

interface BrowserConfig {
    name: BrowserName;
    engine: 'chromium' | 'gecko' | 'webkit';
}

export function getBrowser(name: BrowserName = 'chrome'): BrowserConfig {
    switch (name) {
        case 'chrome':
        case 'edge':
        case 'opera':
        case 'brave':
            return { name, engine: 'chromium' };

        case 'firefox':
            return { name, engine: 'gecko' };

        case 'safari':
            return { name, engine: 'webkit' };

        default:
            throw new Error(`Unsupported browser: ${name}`);
    }
}