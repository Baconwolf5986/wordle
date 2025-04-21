import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

function Login() {
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signInWithGoogle } = useAuth();

    // Function to handle Google sign-in
    // Uses fireabase authentication to sign in with Google, I guess
    const handleGoogleSignIn = async () => {
        try {
            setError('');
            setLoading(true);
            await signInWithGoogle();
        } catch (error) {
            setError('Failed to sign in with Google. Please try again.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="login-container">
            <h2> Sign in with Google to track your stats! </h2>
            {error && <p className="error-message">{error}</p>}
            <button onClick={handleGoogleSignIn} disabled={loading} className="google-signin-button">
                {loading ? 'Signing in...' : 'Sign in with Google'}
            </button>
        </div>
    );
}

export default Login;