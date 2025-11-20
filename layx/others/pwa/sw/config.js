export const CONFIG = {
    version: '1.0.0',
    navigationPreload: true,
    debug: {
        enabled: false,
        level: 'debug', // 'error' | 'warn' | 'info' | 'debug'
        logToServer: false,
        serverEndpoint: '/api/logs'
    },

    caches: {
        offline: {
            name: 'offline-cache',
            version: 1,
            urls: [],
            priority: 'reliability'
        },
        static: {
            name: 'static-cache',
            version: 1,
            urls: ['/pages/static/*', '/assets/static/*'],
            types: ['image', 'font'],
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            maxItems: 100,
            maxSize: 100 * 1024 * 1024, // 100MB
            priority: 'speed',
            exclude: {
                urls: ['/api/*', '/dynamic/*'],
                types: ['video', 'audio'],
                patterns: [/\.(php|aspx)$/]
            }
        },
        runtime: {
            enabled: true,
            name: 'runtime-cache',
            version: 1,
            exclude: {
                types: ['video', 'audio']
            },
            maxItems: 200,
            maxAge: 3 * 24 * 60 * 60 * 1000, // 3 days
            maxSize: 500 * 1024 * 1024, // 500MB
            priority: 'balance',
            cleanupStrategy: 'lru' // 'lru' | 'fifo' | 'size'
        }
    },

    api: {
        endpoints: ['/api/*'],
        version: 'v1',
        cacheStrategy: 'network-first',
        timeout: 5000,
        retryAttempts: 3,
        retryDelay: 1000,
        errorHandling: {
            retry4xx: false,
            retry5xx: true,
            retryTimeout: true,
            fallbackToCache: true
        },
        headers: {
            'X-API-Version': 'v1',
            'X-Client-Type': 'pwa'
        }
    }
};