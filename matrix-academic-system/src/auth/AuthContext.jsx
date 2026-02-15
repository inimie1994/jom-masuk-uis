
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async (session) => {
            if (session?.user) {
                const { data: profile } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                setUser({ ...session.user, ...profile });
            } else {
                setUser(null);
            }
            setLoading(false);
        };

        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            await fetchProfile(session);
        };

        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                // Fetch profile first to get faculty_id
                const { data: profile } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (profile) {
                    // Log login action
                    // Dynamically import to avoid circular dependency issues if any, though utils usually fine.
                    import('../utils/auditLogger').then(({ logAuditAction }) => {
                        logAuditAction({ ...session.user, ...profile }, 'LOGIN', { email: session.user.email });
                    });
                }
            }
            fetchProfile(session);
        });

        return () => subscription.unsubscribe();
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
        signOut: () => supabase.auth.signOut(),
        user,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
