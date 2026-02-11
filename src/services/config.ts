export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function getCommonHeaders(token: string | null): HeadersInit {
    return {
        'accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'access_token': token || '',
        'client_id': import.meta.env.VITE_API_CLIENT_ID,
        'user_timezone': 'Asia/Calcutta',
        'origin': import.meta.env.VITE_API_ORIGIN,
        'referer': import.meta.env.VITE_API_REFERER,
    };
}
