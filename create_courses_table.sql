-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    code TEXT,
    content_page_id UUID REFERENCES public.content_pages(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Create policies for courses (assuming similar access to content_pages)
CREATE POLICY "Enable read access for all users" ON public.courses FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.courses FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.courses FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.courses FOR DELETE USING (true);
