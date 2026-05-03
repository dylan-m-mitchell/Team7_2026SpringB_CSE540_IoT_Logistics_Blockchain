export interface ApiClientOptions {
    baseUrl: string;
}

export class ApiError extends Error {
    constructor(
        message: string,
        public readonly status: number,
        public readonly body: unknown,
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

export class ApiClient {
    private readonly baseUrl: string;

    constructor(opts: ApiClientOptions) {
        this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
    }

    private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
        const url = `${this.baseUrl}${path}`;
        let response: Response;
        try {
            response = await fetch(url, {
                method,
                headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
                body: body !== undefined ? JSON.stringify(body) : undefined,
            });
        } catch (err) {
            const cause = err instanceof Error ? err.message : String(err);
            throw new Error(`Failed to reach ${url}: ${cause}. Is the server running?`);
        }

        const text = await response.text();
        let parsed: unknown = null;
        if (text.length > 0) {
            try {
                parsed = JSON.parse(text);
            } catch {
                parsed = text;
            }
        }

        if (!response.ok) {
            let message = `HTTP ${response.status}`;
            if (
                parsed &&
                typeof parsed === 'object' &&
                'error' in parsed &&
                typeof (parsed as { error: unknown }).error === 'string'
            ) {
                message = (parsed as { error: string }).error;
            }
            throw new ApiError(message, response.status, parsed);
        }

        return parsed as T;
    }

    get<T>(path: string): Promise<T> {
        return this.request<T>('GET', path);
    }

    post<T>(path: string, body?: unknown): Promise<T> {
        return this.request<T>('POST', path, body);
    }

    put<T>(path: string, body?: unknown): Promise<T> {
        return this.request<T>('PUT', path, body);
    }
}
