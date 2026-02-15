-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    faculty_id UUID NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view audit logs for their faculty" ON audit_logs
    FOR SELECT
    USING (faculty_id IN (
        SELECT faculty_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert audit logs for their faculty" ON audit_logs
    FOR INSERT
    WITH CHECK (faculty_id IN (
        SELECT faculty_id FROM users WHERE id = auth.uid()
    ));
