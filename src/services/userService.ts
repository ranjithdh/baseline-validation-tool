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



const API_URL = 'https://api.stg.dh.deepholistics.com/v4/human-token/users';

let cachedUsers: User[] | null = null;

export const userService = {
    async fetchUsers(forceRefresh = false): Promise<User[]> {
        if (cachedUsers && !forceRefresh) {
            console.log('Returning cached users');
            return cachedUsers;
        }

        const token = localStorage.getItem('access_token');
        try {
            const response = await fetch(API_URL, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'access_token': token || '',
                    'client_id': 'qXsGPcHJkb9MTwD5fNFpzRrngjtvy4dW',
                    'user_timezone': 'Asia/Calcutta',
                }
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
