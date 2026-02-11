export interface User {
    id: string | null;
    user_id: string;
    name: string;
    email: string;
    mobile: string;
    gender: string;
    dob: string;
    lead_id: string;
}



import { API_BASE_URL, getCommonHeaders } from './config';

const API_URL = `${API_BASE_URL}/v4/human-token/users`;

let cachedUsers: User[] | null = null;

export const userService = {
    async fetchUsers(forceRefresh = false): Promise<User[]> {
        if (cachedUsers && !forceRefresh) {
            console.log('Returning cached users');
            return cachedUsers;
        }

        const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYWNjNzhlYTktNDQ0Mi00OTAxLTlhZTEtMmViY2I4ZTk1ZGM2Iiwic2Vzc2lvbl9pZCI6ImRhOTNhZDg5LTYwYTYtNDUxYS1iNWU5LTBlOTA0ZDhkMmY1ZSIsInVzZXJfaW50X2lkIjoiMTQ3IiwicHJvZmlsZV9pZCI6IjE0MyIsImxlYWRfaWQiOiI3MTg0ZGE5NC0zYjk0LTQ3MjAtYmNlOS0yMWNmMjY3Nzk5MzAiLCJyb2xlIjpbIkFETUlOIl0sImlhdCI6MTc3MDgwNzcxMSwiZXhwIjoxNzcxNDEyNTExfQ.FwZ6lv0s7yDvSS05yTX6yhEF45MCjCUeRX92DEdNgyk\n";

        try {
            const response = await fetch(API_URL, {
                method: 'GET',
                headers: getCommonHeaders(token)
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Failed to fetch users: ${response.status} ${text}`);
            }

            const data: any = await response.json();
            console.log('FULL RAW USERS RESPONSE:', data); // CRITICAL DEBUG LOG

            // Check various possible structures
            let userList: User[] = [];

            if (Array.isArray(data)) {
                userList = data;
            } else if (Array.isArray(data?.data?.users)) {
                userList = data.data.users; // THIS WAS THE MISSING CASE
            } else if (Array.isArray(data?.data?.data)) {
                userList = data.data.data;
            } else if (Array.isArray(data?.data)) {
                userList = data.data;
            } else if (Array.isArray(data?.users)) {
                userList = data.users;
            }

            if (userList.length > 0) {
                // Sanitize user list: Ensure valid IDs and string fields
                cachedUsers = userList.map((user: any, index) => ({
                    ...user,
                    id: user.id ? String(user.id) : (user.user_id || String(index)),
                    name: user.name || '',
                    email: user.email || '',
                    mobile: user.mobile || '',
                    user_id: user.user_id || ''
                }));
                console.log('Users found:', cachedUsers.length);
                return cachedUsers;
            } else {
                console.warn('Could not find user array in response:', data);
                return [];
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            // Return cache if fetch fails as partial fallback, or empty array
            return cachedUsers || [];
        }
    },

    clearCache() {
        cachedUsers = null;
    }
};
