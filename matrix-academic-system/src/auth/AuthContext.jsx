
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
            console.log('AuthContext: fetchProfile called', {
                uid: session?.user?.id,
                email: session?.user?.email,
                metadata_role: session?.user?.user_metadata?.role
            });

            if (!session?.user) {
                console.log('AuthContext: No session user found, setting user to null');
                setUser(null);
                setLoading(false);
                return;
            }

            try {
                console.log('AuthContext: Querying users table for profile...');
                const queryPromise = supabase
                    .from('users')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('DB query timeout')), 4000));

                const { data: profile, error } = await Promise.race([queryPromise, timeoutPromise]);

                if (error) {
                    console.error('AuthContext: Error fetching profile from DB:', error);
                    // Fallback to metadata if available
                    const fallbackUser = {
                        ...session.user,
                        role: session.user.user_metadata?.role || null
                    };
                    console.log('AuthContext: Setting fallback user:', fallbackUser.role);
                    setUser(fallbackUser);
                } else {
                    console.log('AuthContext: Profile found in DB!', profile.role);

                    // Fetch Faculty Logo if available
                    let facultyLogo = null;
                    if (profile.faculty_id) {
                        const { data: faculty } = await supabase
                            .from('faculties')
                            .select('logo_url')
                            .eq('id', profile.faculty_id)
                            .single();
                        if (faculty && faculty.logo_url) {
                            // Ensure it's a valid URL or a known relative path, 
                            // though Settings already stores public URLs.
                            facultyLogo = faculty.logo_url;
                        }
                    }

                    const finalUser = {
                        ...session.user,
                        ...profile,
                        faculty_logo: facultyLogo
                    };
                    console.log('AuthContext: User state updated with profile', finalUser.role);

                    // Audit Logging
                    import('../utils/auditLogger').then(({ logAuditAction }) => {
                        logAuditAction(finalUser, 'LOGIN', { email: session.user.email });
                    }).catch(err => console.error("AuthContext: Failed to load audit logger", err));

                    setUser(finalUser);
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
                // Add a local timeout for getSession call itself
                const sessionPromise = supabase.auth.getSession();
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('getSession timeout')), 3000));

                const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]);

                if (error) {
                    console.error('AuthContext: Error getting session:', error);
                    throw error;
                }
                console.log('AuthContext: Session retrieved:', session ? 'Active' : 'None');
                await fetchProfile(session);
            } catch (error) {
                console.error('AuthContext: Failed to obtain session (or timed out):', error.message);
                setLoading(false);
                clearTimeout(safetyTimeout);
            }
        };

        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('AuthContext: onAuthStateChange event:', event);
            fetchProfile(session);

            // Handle audit logging for SIGNED_IN event
            if (event === 'SIGNED_IN' && session?.user) {
                // We'll delay the audit log until we're sure the profile is loaded via fetchProfile
                // or just log with what we have if it's simpler.
            }
        });

        return () => {
            subscription.unsubscribe();
            clearTimeout(safetyTimeout);
        };
    }, []);

    const value = {
        signUp: (data) => supabase.auth.signUp(data),
        signIn: async (data) => {
            const authPromise = supabase.auth.signInWithPassword(data);
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Login timeout')), 10000));
            return Promise.race([authPromise, timeoutPromise]);
        },
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
