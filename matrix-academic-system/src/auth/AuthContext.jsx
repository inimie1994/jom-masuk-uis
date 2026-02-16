
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log('AuthContext: Initializing...');

        // Safety timeout to prevent permanent hang
        const safetyTimeout = setTimeout(() => {
            if (loading) {
                console.warn('AuthContext: Loading timed out after 5s. Forcing loading=false.');
                setLoading(false);
            }
        }, 5000);

        const fetchProfile = async (session) => {
            console.log('AuthContext: fetchProfile called for user:', session?.user?.id);
            if (!session?.user) {
                console.log('AuthContext: No session user found');
                setUser(null);
                setLoading(false);
                return;
            }

            try {
                const { data: profile, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (error) {
                    console.error('AuthContext: Error fetching profile:', error);
                    // Still set user with basic auth info if profile fetch fails
                    setUser({ ...session.user, role: session.user.user_metadata?.role || null });
                } else {
                    console.log('AuthContext: Profile fetched successfully', profile.role);
                    setUser({ ...session.user, ...profile });
                }
            } catch (error) {
                console.error('AuthContext: Unexpected error in fetchProfile:', error);
                setUser(session?.user || null);
            } finally {
                setLoading(false);
                clearTimeout(safetyTimeout);
            }
        };

        const getSession = async () => {
            console.log('AuthContext: getSession started');
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) {
                    console.error('AuthContext: Error getting session:', error);
                    throw error;
                }
                console.log('AuthContext: Session retrieved:', session ? 'Active' : 'None');
                await fetchProfile(session);
            } catch (error) {
                console.error('AuthContext: Failed to obtain session:', error);
                setLoading(false);
                clearTimeout(safetyTimeout);
            }
        };

        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('AuthContext: onAuthStateChange event:', event);
            if (event === 'SIGNED_IN' && session?.user) {
                const { data: profile } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (profile) {
                    import('../utils/auditLogger').then(({ logAuditAction }) => {
                        logAuditAction({ ...session.user, ...profile }, 'LOGIN', { email: session.user.email });
                    }).catch(err => console.error("AuthContext: Failed to load audit logger", err));
                }
            }
            fetchProfile(session);
        });

        return () => {
            subscription.unsubscribe();
            clearTimeout(safetyTimeout);
        };
    }, []);

    const value = {
        signUp: (data) => supabase.auth.signUp(data),
        signIn: (data) => supabase.auth.signInWithPassword(data),
        signInWithGoogle: async () => {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: 'http://localhost:5173',
                },
            });
            if (error) throw error;
            return data;
        },
        signOut: async () => {
            try {
                const { error } = await supabase.auth.signOut();
                if (error) throw error;
                setUser(null);
            } catch (error) {
                console.error('AuthContext: Error during signOut:', error);
                // Even if Supabase fails, we should clear the local state
                setUser(null);
            }
        },
        user,
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
