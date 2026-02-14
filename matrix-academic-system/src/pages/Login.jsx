
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { LogIn } from 'lucide-react';

const Login = () => {
    const { user, signInWithGoogle } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    const handleLogin = async () => {
        try {
            await signInWithGoogle();
        } catch (error) {
            console.error('Error logging in:', error);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="p-8 bg-white rounded-lg shadow-md w-96">
                <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">Faculty Login</h1>
                <p className="text-center text-gray-600 mb-8">Sign in to access the academic system</p>
                <button
                    onClick={handleLogin}
                    className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                    <LogIn className="w-5 h-5 mr-2" />
                    Sign in with Google
                </button>
            </div>
        </div>
    );
};

export default Login;
