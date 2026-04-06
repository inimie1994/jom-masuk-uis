import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { LogIn, User, Lock, AlertCircle } from 'lucide-react';

const Login = () => {
    const { user, signIn, signInWithGoogle } = useAuth();
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            if (['admin'].includes(user.role)) {
                navigate('/dashboard');
            } else if (['superadmin'].includes(user.role)) {
                navigate('/admin/faculties');
            } else {
                navigate('/lecturer-dashboard');
            }
        }
    }, [user, navigate]);

    const handleEmailLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const isEmail = username.includes('@');
            let loginEmail = isEmail ? username : `${username.trim()}@uis.edu.my`;

            console.log('Login: Attempting sign in for', loginEmail);
            let { error: signInError } = await signIn({
                email: loginEmail,
                password
            });

            // If it failed and it was an auto-generated email, try the old domain fallback
            if (signInError && !isEmail) {
                const oldEmail = `${username.trim()}@matrix-system.com`;
                console.log('Login: New domain failed, retrying with old domain...', oldEmail);
                const retry = await signIn({ email: oldEmail, password });
                if (retry.error) throw retry.error;
            } else if (signInError) {
                throw signInError;
            }

            navigate('/dashboard');
        } catch (err) {
            console.error('Error logging in:', err);
            setError(err.message || 'Invalid username or password');
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-900">
            <div className="p-8 bg-white dark:bg-slate-800 rounded-lg shadow-md w-96 border border-gray-200 dark:border-slate-700">
                <h1 className="text-2xl font-bold text-center mb-2 text-gray-800 dark:text-white">Faculty Portal</h1>
                <p className="text-center text-gray-600 dark:text-gray-400 mb-8">Sign in as Faculty Administrator</p>

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md text-sm flex items-center mb-6">
                        <AlertCircle size={16} className="mr-2 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleEmailLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Username
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-slate-700 dark:text-white"
                                placeholder="Enter admin username"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Password
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-slate-700 dark:text-white"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Signing in...' : (
                            <>
                                <LogIn className="w-5 h-5 mr-2" />
                                Admin Sign In
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => navigate('/lecturer-login')}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                    >
                        Are you a lecturer? Sign in here
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
