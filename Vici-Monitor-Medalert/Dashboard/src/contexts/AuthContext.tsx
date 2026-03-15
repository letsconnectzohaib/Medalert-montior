
import React, { createContext, useState, useContext, useEffect } from 'react';

interface User {
    username: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (userData: User) => void;
    logout: () => void;
    checkUser: () => void; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Initialize user from localStorage on mount
    useEffect(() => {
        const initializeAuth = () => {
            const storedUser = localStorage.getItem('user');
            const storedToken = localStorage.getItem('token');
            
            if (storedUser && storedToken) {
                try {
                    const parsedUser = JSON.parse(storedUser);
                    setUser(parsedUser);
                    setIsLoading(false);
                } catch (error) {
                    console.error('Failed to parse stored user:', error);
                    localStorage.removeItem('user');
                    localStorage.removeItem('token');
                    setUser(null);
                    setIsLoading(false);
                }
            } else {
                // No stored auth, try to verify with token
                checkUser();
            }
        };

        initializeAuth();
    }, []);

    const checkUser = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setUser(null);
                setIsLoading(false);
                return;
            }
            
            const apiUrl = import.meta.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            
            const response = await fetch(`${apiUrl}/api/auth/verify`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }); 
            if (response.ok) {
                const data = await response.json();
                if(data.user) {
                    setUser(data.user);
                    localStorage.setItem('user', JSON.stringify(data.user));
                } else {
                    setUser(null);
                    localStorage.removeItem('user');
                    localStorage.removeItem('token');
                }
            } else {
                setUser(null);
                localStorage.removeItem('user');
                localStorage.removeItem('token');
            }
            setIsLoading(false);
        } catch (error) {
            setUser(null);
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            setIsLoading(false);
        }
    };

    const login = (userData: User) => {
        setUser(userData);
    };

    const logout = async () => {
        try {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            const apiUrl = import.meta.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            
            await fetch(`${apiUrl}/api/auth/logout`);
            setUser(null);
        } catch(error) {
            console.error("Logout failed", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, checkUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
