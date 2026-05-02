"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiClient = exports.ApiError = void 0;
class ApiError extends Error {
    status;
    body;
    constructor(message, status, body) {
        super(message);
        this.status = status;
        this.body = body;
        this.name = 'ApiError';
    }
}
exports.ApiError = ApiError;
class ApiClient {
    baseUrl;
    constructor(opts) {
        this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
    }
    async request(method, path, body) {
        const url = `${this.baseUrl}${path}`;
        let response;
        try {
            response = await fetch(url, {
                method,
                headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
                body: body !== undefined ? JSON.stringify(body) : undefined,
            });
        }
        catch (err) {
            const cause = err instanceof Error ? err.message : String(err);
            throw new Error(`Failed to reach ${url}: ${cause}. Is the server running?`);
        }
        const text = await response.text();
        let parsed = null;
        if (text.length > 0) {
            try {
                parsed = JSON.parse(text);
            }
            catch {
                parsed = text;
            }
        }
        if (!response.ok) {
            let message = `HTTP ${response.status}`;
            if (parsed &&
                typeof parsed === 'object' &&
                'error' in parsed &&
                typeof parsed.error === 'string') {
                message = parsed.error;
            }
            throw new ApiError(message, response.status, parsed);
        }
        return parsed;
    }
    get(path) {
        return this.request('GET', path);
    }
    post(path, body) {
        return this.request('POST', path, body);
    }
    put(path, body) {
        return this.request('PUT', path, body);
    }
}
exports.ApiClient = ApiClient;
//# sourceMappingURL=client.js.map