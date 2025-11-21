import { CacheManager } from './modules/cache_manager.js';
import { RequestHandler } from './handlers/request_handler.js';
import { CONFIG } from './config.js';

class ServiceWorkerApp {
    constructor() {
        this.cache = new CacheManager(CONFIG.caches, console);
        this.requestHandler = new RequestHandler(this.cache, CONFIG, console);
        this.init();
    }

    init() {
        // Register core event listeners
        self.addEventListener('install', e => this.handleInstall(e));
        self.addEventListener('activate', e => this.handleActivate(e));
        self.addEventListener('fetch', e => this.handleFetch(e));
    }

    async handleInstall(event) {
        console.log('Installing Service Worker...');
        event.waitUntil(
            Promise.all([
                this.cache.precache(event),
                self.skipWaiting()
            ])
        );
    }

    async handleActivate(event) {
        console.log('Activating Service Worker...');
        event.waitUntil(
            Promise.all([
                this.cache.cleanup(),
                self.clients.claim(),
                this.enableNavigationPreload()
            ])
        );
    }

    async handleFetch(event) {
        const request = event.request;

        try {
            // Handle API requests
            if (this.isApiRequest(request)) {
                event.respondWith(this.requestHandler.handleApi(event));
                return;
            }


            // Handle asset requests
            event.respondWith(this.requestHandler.handleAsset(event));
        } catch (error) {
            console.error('Fetch handling failed:', error);
            event.respondWith(Response.error());
        }
    }

    isApiRequest(request) {
        return CONFIG.api.endpoints.some(endpoint => 
            request.url.includes(endpoint.replace('*', '')));
    }

    async enableNavigationPreload() {
        if (self.registration.navigationPreload) {
            await self.registration.navigationPreload.enable();
        }
    }

}

// Initialize Service Worker with error handling
try {
    const sw = new ServiceWorkerApp();
    self.__SW__ = sw; // For debugging purposes
} catch (error) {
    console.error('Failed to initialize Service Worker:', error);
}
