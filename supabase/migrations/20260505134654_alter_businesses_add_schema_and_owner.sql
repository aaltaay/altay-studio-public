-- Create profiles table linked to auth.users
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Alter businesses table
ALTER TABLE public.businesses ADD COLUMN owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.businesses ADD COLUMN schema_name TEXT UNIQUE;

-- We need to populate schema_name for existing businesses, we can just use the slug for now
UPDATE public.businesses SET schema_name = 'schema_' || REPLACE(slug, '-', '_');

-- Now make schema_name NOT NULL
ALTER TABLE public.businesses ALTER COLUMN schema_name SET NOT NULL;

-- Enable RLS on businesses
-- First drop any existing policies if they exist (just to be safe)
DROP POLICY IF EXISTS "Users can view own businesses" ON public.businesses;
DROP POLICY IF EXISTS "Users can insert own businesses" ON public.businesses;
DROP POLICY IF EXISTS "Users can update own businesses" ON public.businesses;
DROP POLICY IF EXISTS "Users can delete own businesses" ON public.businesses;

CREATE POLICY "Users can view own businesses" ON public.businesses FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert own businesses" ON public.businesses FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own businesses" ON public.businesses FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own businesses" ON public.businesses FOR DELETE USING (auth.uid() = owner_id);
