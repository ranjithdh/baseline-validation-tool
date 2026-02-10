import React, { useState, useEffect } from 'react';
import { userService, type User } from '../services/userService';

interface UserSearchProps {
    onUserSelect?: (user: User) => void;
}

const UserSearch: React.FC<UserSearchProps> = ({ onUserSelect }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadUsers = async () => {
            try {
                // Fetch users once on mount. The service handles caching.
                const data = await userService.fetchUsers();
                setUsers(data);
                // Initialize filteredUsers as empty until search
                setFilteredUsers([]);
            } catch (err) {
                console.error('Failed to load users');
            } finally {
                setLoading(false);
            }
        };
        loadUsers();
    }, []);

    const [showDropdown, setShowDropdown] = useState(false);

    useEffect(() => {
        if (!searchTerm) {
            setFilteredUsers([]);
            setShowDropdown(false);
        } else {
            const lowerTerm = searchTerm.toLowerCase();
            const filtered = users.filter(user => {
                const name = (user.name || '').toLowerCase();
                const userId = (user.user_id || '').toLowerCase();
                const email = (user.email || '').toLowerCase();
                const mobile = (user.mobile || '').toLowerCase();

                return name.includes(lowerTerm) ||
                    userId.includes(lowerTerm) ||
                    email.includes(lowerTerm) ||
                    mobile.includes(lowerTerm);
            });

            // Sort results: exact name matches first, then partial matches
            const sorted = filtered.sort((a, b) => {
                const aName = (a.name || '').toLowerCase();
                const bName = (b.name || '').toLowerCase();

                const aExactMatch = aName === lowerTerm;
                const bExactMatch = bName === lowerTerm;

                // Exact matches come first
                if (aExactMatch && !bExactMatch) return -1;
                if (!aExactMatch && bExactMatch) return 1;

                // Then prioritize matches that start with the search term
                const aStartsWith = aName.startsWith(lowerTerm);
                const bStartsWith = bName.startsWith(lowerTerm);

                if (aStartsWith && !bStartsWith) return -1;
                if (!aStartsWith && bStartsWith) return 1;

                // Otherwise maintain original order
                return 0;
            });

            setFilteredUsers(sorted);
            setShowDropdown(true);
        }
    }, [searchTerm, users]);

    console.log('UserSearch render:', { loading, usersCount: users.length, filteredCount: filteredUsers.length });

    return (
        <div style={{ marginBottom: '2rem', padding: '1.5rem', background: '#111', borderRadius: '12px', border: '1px solid #333', position: 'relative', zIndex: 100 }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem' }}>Search Users</h3>

            <div style={{ position: 'relative' }}>
                <input
                    type="text"
                    placeholder="Search by Name, User ID, or Email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: '#000',
                        border: '1px solid #333',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '1rem',
                        outline: 'none',
                    }}
                />

                {showDropdown && (
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '0.5rem',
                        background: '#1a1a1a',
                        border: '1px solid #333',
                        borderRadius: '8px',
                        maxHeight: '300px',
                        overflowY: 'auto',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                        zIndex: 1000
                    }}>
                        {loading ? (
                            <div style={{ padding: '1rem', color: '#888', textAlign: 'center' }}>Loading users...</div>
                        ) : filteredUsers.length === 0 ? (
                            <div style={{ padding: '1rem', color: '#888', textAlign: 'center' }}>No users found</div>
                        ) : (
                            filteredUsers.map(user => (
                                <div
                                    key={user.user_id}
                                    style={{
                                        padding: '1rem',
                                        borderBottom: '1px solid #333',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = '#2a2a2a'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                    onClick={() => {
                                        setSearchTerm(''); // Clear search to close dropdown
                                        setShowDropdown(false);
                                        if (onUserSelect) {
                                            onUserSelect(user);
                                        }
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 'bold', color: '#fff' }}>{user.name || 'Unknown Name'}</div>
                                        <div style={{ fontSize: '0.875rem', color: '#888' }}>
                                            <span style={{ marginRight: '1rem' }}>ID: {user.user_id.substring(0, 8)}...</span>
                                            <span>{user.email}</span>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: '#888' }}>{user.mobile}</div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Display total loaded users count quietly */}
            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#666', textAlign: 'right' }}>
                {users.length} users loaded
            </div>
        </div>
    );
};

export default UserSearch;
