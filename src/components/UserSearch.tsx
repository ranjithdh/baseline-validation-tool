import React, { useState, useEffect, useRef } from 'react';
import { userService, type User } from '../services/userService';

interface UserSearchProps {
    onUserSelect?: (user: User) => void;
}

const UserSearch: React.FC<UserSearchProps> = ({ onUserSelect }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const searchRef = useRef<HTMLDivElement>(null);

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
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (!searchTerm) {
            setFilteredUsers([]);
            setShowDropdown(false);
        } else {
            const lowerTerm = searchTerm.toLowerCase();
            const filtered = users.filter(user => {
                const name = (user.name || '').toLowerCase();
                const userId = (user.user_id || '').toLowerCase();
                const internalId = (user.id || '').toLowerCase();
                const email = (user.email || '').toLowerCase();
                const mobile = (user.mobile || '').toLowerCase();

                return name.includes(lowerTerm) ||
                    userId.includes(lowerTerm) ||
                    internalId.includes(lowerTerm) ||
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
        <div ref={searchRef} className="card" style={{ position: 'relative', zIndex: 100, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                <div style={{ fontSize: '1.25rem', opacity: 0.8 }}>🔍</div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Search</h3>
            </div>

            <div style={{ position: 'relative' }}>
                <input
                    type="text"
                    placeholder="Search by Name, User ID, or Email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => { if (filteredUsers.length > 0) setShowDropdown(true); }}
                    style={{
                        width: '100%',
                        padding: '1rem 1.25rem',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        color: 'white',
                        fontSize: '1rem',
                        outline: 'none',
                        transition: 'all 0.2s ease',
                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)'
                    }}
                />

                {showDropdown && (
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '0.75rem',
                        background: 'var(--bg-card)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '16px',
                        maxHeight: '400px',
                        overflowY: 'auto',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                        zIndex: 1000,
                        padding: '0.5rem'
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
                                        padding: '1rem 1.25rem',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s ease',
                                        marginBottom: '2px'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                    onClick={() => {
                                        setSearchTerm(''); // Clear search to close dropdown
                                        setShowDropdown(false);
                                        if (onUserSelect) {
                                            onUserSelect(user);
                                        }
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '50%',
                                            background: 'rgba(255,255,255,0.05)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '1.2rem'
                                        }}>
                                            👤
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, color: '#fff', fontSize: '1rem' }}>{user.name || 'Unknown Name'}</div>
                                            <div style={{ fontSize: '0.75rem', marginTop: '4px', display: 'flex', gap: '0.75rem' }} className="text-secondary">
                                                <span style={{ color: 'var(--primary)' }}>ID: {user.id}</span>
                                                <span>{user.email}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{user.mobile}</div>
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
