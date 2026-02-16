import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Mail, Lock, CheckCircle, AlertCircle, User } from 'lucide-react';

const LecturerLogin = () => {
    const { user, signIn } = useAuth();
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [authSuccess, setAuthSuccess] = useState(false);

    // Keep loading true if auth succeeded but user profile still loading in AuthContext
    const isActuallyLoading = loading || (authSuccess && !user);

    useEffect(() => {
        if (user) {
            console.log('LecturerLogin: User detected, navigating...', user.role);
            if (user.role === 'lecturer' || user.user_metadata?.role === 'lecturer') {
                navigate('/lecturer-dashboard');
            } else if (user.role === 'admin') {
                navigate('/dashboard');
            } else {
                // If it's a student or unknown role, we still want to move them away from login
                navigate('/dashboard');
            }
        }
    }, [user, navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setAuthSuccess(false);

        try {
            const internalEmail = `${username.trim()}@matrix-system.com`;
            console.log('LecturerLogin: Attempting sign in for', internalEmail);
            const { data, error } = await signIn({ email: internalEmail, password });

            if (error) {
                console.error('LecturerLogin: Sign in error', error);
                throw error;
            }

            console.log('LecturerLogin: Sign in successful, waiting for profile...');
            setAuthSuccess(true);
            // We don't set loading(false) here, we wait for useEffect
        } catch (err) {
            console.error('Login error:', err);
            setError(err.message || 'Invalid email or password.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div className="bg-indigo-600 p-3 rounded-full">
                        <GraduationCap className="h-10 w-10 text-white" />
                    </div>
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
                    Lecturer Portal
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                    Sign in to manage your classes and students
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white dark:bg-slate-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-200 dark:border-slate-700">
                    <form className="space-y-6" onSubmit={handleLogin}>
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md text-sm flex items-center">
                                <AlertCircle size={16} className="mr-2" />
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Username
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    autoComplete="username"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="block w-full pl-10 sm:text-sm border-gray-300 dark:border-slate-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:text-white py-2 border"
                                    placeholder="e.g. aris123"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Password
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-10 sm:text-sm border-gray-300 dark:border-slate-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:text-white py-2 border"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isActuallyLoading}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
                            >
                                {isActuallyLoading ? 'Signing in...' : 'Sign in'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LecturerLogin;
