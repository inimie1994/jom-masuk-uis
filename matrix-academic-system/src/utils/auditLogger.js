import { supabase } from '../lib/supabaseClient';

/**
 * Logs a system action to the audit_logs table.
 * @param {object} user - The current user object (must contain faculty_id).
 * @param {string} action - Capitalized action name (e.g., 'LOGIN', 'GRADE_UPDATE').
 * @param {object} details - Additional details about the action.
 */
export const logAuditAction = async (user, action, details = {}) => {
    if (!user || !user.faculty_id) {
        console.warn('Audit Log Skipped: Missing user or faculty_id', { user, action });
        return;
    }

    try {
        const { error } = await supabase
            .from('audit_logs')
            .insert([{
                faculty_id: user.faculty_id,
                user_id: user.id || user.user_id, // Handle differences in user object structure
                action,
                details
            }]);

        if (error) throw error;
    } catch (err) {
        console.error('Failed to create audit log:', err);
        // We don't throw here to prevent blocking the main action
    }
};
