# Database Setup

## Supabase Configuration

### 1. User Sync Trigger (REQUIRED)

When users sign up via Supabase Auth, they are added to `auth.users` but NOT automatically added to the `public.users` table. This trigger ensures every auth user gets a profile.

**Run this in Supabase SQL Editor:**
```sql
-- See: supabase_user_sync_trigger.sql
```

Execute the entire `supabase_user_sync_trigger.sql` file in your Supabase SQL Editor.

### 2. Row Level Security (RLS)

Before enabling public access with the anon key, configure RLS on all tables:

#### Users Table
```sql
-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
ON public.users FOR SELECT
TO authenticated
USING (auth.uid()::text = email OR role = 'admin');

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.users FOR UPDATE
TO authenticated
USING (auth.uid()::text = email)
WITH CHECK (auth.uid()::text = email);

-- Only admins can insert/delete users
CREATE POLICY "Admins can manage users"
ON public.users FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE email = auth.jwt()->>'email'
    AND role = 'admin'
  )
);
```

#### Email Signups Table
```sql
ALTER TABLE public.email_signups ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public signup forms)
CREATE POLICY "Public can insert email signups"
ON public.email_signups FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only admins can read/update/delete
CREATE POLICY "Admins can manage email signups"
ON public.email_signups FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE email = auth.jwt()->>'email'
    AND role = 'admin'
  )
);
```

#### Price Alerts Table
```sql
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

-- Users can create their own alerts
CREATE POLICY "Users can create own alerts"
ON public.price_alerts FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT id FROM public.users WHERE email = auth.jwt()->>'email'));

-- Users can read/update their own alerts
CREATE POLICY "Users can manage own alerts"
ON public.price_alerts FOR SELECT, UPDATE
TO authenticated
USING (user_id = (SELECT id FROM public.users WHERE email = auth.jwt()->>'email'));

-- Admins can see everything
CREATE POLICY "Admins can view all alerts"
ON public.price_alerts FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE email = auth.jwt()->>'email'
    AND role = 'admin'
  )
);
```

#### Strain Comments Table
```sql
ALTER TABLE public.strain_comments ENABLE ROW LEVEL SECURITY;

-- Users can create comments
CREATE POLICY "Users can create comments"
ON public.strain_comments FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT id FROM public.users WHERE email = auth.jwt()->>'email'));

-- Users can read approved comments
CREATE POLICY "Public can read approved comments"
ON public.strain_comments FOR SELECT
TO anon, authenticated
USING (status = 'approved');

-- Users can read their own pending comments
CREATE POLICY "Users can read own comments"
ON public.strain_comments FOR SELECT
TO authenticated
USING (user_id = (SELECT id FROM public.users WHERE email = auth.jwt()->>'email'));

-- Admins can manage all comments
CREATE POLICY "Admins can manage comments"
ON public.strain_comments FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE email = auth.jwt()->>'email'
    AND role = 'admin'
  )
);
```

#### Strain Votes Table
```sql
ALTER TABLE public.strain_votes ENABLE ROW LEVEL SECURITY;

-- Users can vote once per strain
CREATE POLICY "Users can vote on strains"
ON public.strain_votes FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT id FROM public.users WHERE email = auth.jwt()->>'email'));

-- Users can read all votes (for aggregate ratings)
CREATE POLICY "Public can read votes"
ON public.strain_votes FOR SELECT
TO anon, authenticated
USING (true);

-- Users can update their own votes
CREATE POLICY "Users can update own votes"
ON public.strain_votes FOR UPDATE
TO authenticated
USING (user_id = (SELECT id FROM public.users WHERE email = auth.jwt()->>'email'));
```

#### Read-Only Tables (Price Snapshots, Price Drops)
```sql
-- Price snapshots - read-only for users, write for admin/system
ALTER TABLE public.price_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read price snapshots"
ON public.price_snapshots FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins can manage price snapshots"
ON public.price_snapshots FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE email = auth.jwt()->>'email'
    AND role = 'admin'
  )
);

-- Price drops - same pattern
ALTER TABLE public.price_drops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read price drops"
ON public.price_drops FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins can manage price drops"
ON public.price_drops FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE email = auth.jwt()->>'email'
    AND role = 'admin'
  )
);
```

#### Partner Tables
```sql
ALTER TABLE public.dispensary_partners ENABLE ROW LEVEL SECURITY;

-- Users can claim dispensaries
CREATE POLICY "Users can claim dispensaries"
ON public.dispensary_partners FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT id FROM public.users WHERE email = auth.jwt()->>'email'));

-- Users can read their own applications
CREATE POLICY "Users can read own partner applications"
ON public.dispensary_partners FOR SELECT
TO authenticated
USING (user_id = (SELECT id FROM public.users WHERE email = auth.jwt()->>'email'));

-- Admins can manage all partner applications
CREATE POLICY "Admins can manage partners"
ON public.dispensary_partners FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE email = auth.jwt()->>'email'
    AND role = 'admin'
  )
);

-- Partner price updates
ALTER TABLE public.partner_price_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can submit price updates"
ON public.partner_price_updates FOR INSERT
TO authenticated
WITH CHECK (
  partner_id IN (
    SELECT id FROM public.dispensary_partners
    WHERE user_id = (SELECT id FROM public.users WHERE email = auth.jwt()->>'email')
    AND verification_status = 'verified'
  )
);

CREATE POLICY "Partners can read own updates"
ON public.partner_price_updates FOR SELECT
TO authenticated
USING (
  partner_id IN (
    SELECT id FROM public.dispensary_partners
    WHERE user_id = (SELECT id FROM public.users WHERE email = auth.jwt()->>'email')
  )
);

CREATE POLICY "Admins can manage price updates"
ON public.partner_price_updates FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE email = auth.jwt()->>'email'
    AND role = 'admin'
  )
);
```

### 3. First Admin Account

After setting up the trigger and RLS, create your first admin account:

1. Sign up normally at `/auth/signup`
2. Run this SQL to promote yourself to admin:

```sql
UPDATE public.users
SET role = 'admin', updated_at = NOW()
WHERE email = 'your-email@example.com';
```

### 4. API Keys

Set these in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Only set the anon key in production AFTER RLS is configured on all tables.
