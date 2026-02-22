import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ShieldCheck, AlertCircle } from 'lucide-react';

const SuperadminLogin = () => {
    const { user, signInWithGoogle } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            if (user.role === 'superadmin') {
                navigate('/admin/faculties');
            } else {
                // If a non-superadmin tries to use this portal
                setError('Access denied. This portal is for Super Administrators only.');
            }
        }
    }, [user, navigate]);

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            await signInWithGoogle();
        } catch (error) {
            console.error('Error logging in with Google:', error);
            setError('Failed to sign in with Google. Please try again.');
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
            <div className="p-10 bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 dark:border-slate-700">
                <div className="flex justify-center mb-6">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400">
                        <ShieldCheck size={40} />
                    </div>
                </div>

                <h1 className="text-3xl font-extrabold text-center mb-2 text-gray-900 dark:text-white">System Management</h1>
                <p className="text-center text-gray-500 dark:text-gray-400 mb-10">Matrix Academic System Restricted Access</p>

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm flex items-start mb-8 border border-red-100 dark:border-red-900/30">
                        <AlertCircle size={18} className="mr-3 mt-0.5 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="space-y-4">
                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full flex items-center justify-center px-6 py-3 border border-gray-200 dark:border-slate-600 rounded-xl shadow-sm text-base font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                        <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        {loading ? 'Authenticating...' : 'Sign in as Superadmin'}
                    </button>

                    <p className="text-center text-xs text-gray-400 dark:text-slate-500 pt-6">
                        Unauthorized access is strictly prohibited and logged.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SuperadminLogin;
