import React, { createContext, useState, useContext, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const defaultUser: User = {
  id: '1',
  name: 'John Doe',
  email: 'john.doe@example.com',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John'
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check if user is logged in from localStorage
    const storedUser = localStorage.getItem('user');
    const storedAuth = localStorage.getItem('isAuthenticated');
    
    if (storedUser && storedAuth === 'true') {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
    
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Simulate API call
    setLoading(true);
    
    // Simple validation - in a real app, this would be an API call
    return new Promise((resolve) => {
      setTimeout(() => {
        // For demo purposes, any email with a password length > 5 will work
        if (email && password.length > 5) {
          // Create user with email
          const loggedInUser = {
            ...defaultUser,
            email,
            name: email.split('@')[0].split('.').map(part => 
              part.charAt(0).toUpperCase() + part.slice(1)
            ).join(' '),
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`
          };
          
          setUser(loggedInUser);
          setIsAuthenticated(true);
          
          // Store in localStorage
          localStorage.setItem('user', JSON.stringify(loggedInUser));
          localStorage.setItem('isAuthenticated', 'true');
          
          setLoading(false);
          resolve(true);
        } else {
          setLoading(false);
          resolve(false);
        }
      }, 1000); // Simulate network delay
    });
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};