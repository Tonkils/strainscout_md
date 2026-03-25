-- ============================================
-- Supabase User Sync Trigger
-- ============================================
-- Purpose: Automatically create a users table entry when someone signs up via auth.users
-- Run this in Supabase SQL Editor to enable automatic user profile creation

-- Step 1: Create function to sync auth.users to public.users table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (email, name, role, created_at, updated_at, last_signed_in)
  VALUES (
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NULL),
    'user', -- Default role is 'user', admins must be promoted manually
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (email) DO NOTHING; -- Skip if already exists

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create trigger that fires on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 3: Optional - Sync existing auth.users that don't have profiles yet
INSERT INTO public.users (email, name, role, created_at, updated_at, last_signed_in)
SELECT
  au.email,
  au.raw_user_meta_data->>'name' AS name,
  'user' AS role,
  au.created_at,
  au.updated_at,
  COALESCE(au.last_sign_in_at, au.created_at) AS last_signed_in
FROM auth.users au
LEFT JOIN public.users u ON au.email = u.email
WHERE u.id IS NULL
  AND au.email IS NOT NULL
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- Verification Query
-- ============================================
-- Run this to verify the trigger is working:
-- SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
