import { createContext, useContext, useEffect, useState } from 'react';
import {
    onAuthStateChanged,
    signInWithPopup,
    signOut,
    GoogleAuthProvider,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase/firebase.js';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const signInWithGoogle = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            return result.user;
        } catch (error) {
            console.error("Error signing in with Google:", error);
            throw error;
        }
    };

    const logOut = async () => {
        try {
            // Clear only game-related localStorage items
            localStorage.removeItem('wordle-grid');
            localStorage.removeItem('current-row');
            localStorage.removeItem('status');
            await signOut(auth);
        } catch (error) {
            console.error("Error logging out:", error);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user); // Update currentUser when auth state changes
            setLoading(false); // Stop loading once the state is determined
        });

        return unsubscribe; // Cleanup the listener on unmount
    }, []);

    const value = {
        currentUser,
        signInWithGoogle,
        logOut,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};