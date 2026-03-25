# Admin Dashboard Documentation

## Overview

Complete admin dashboard for StrainScout MD with user management, content moderation, analytics, and partner portal.

## 🔐 Authentication & User Management

### Two-Tier User System

The app uses two connected user tables:

1. **`auth.users`** (Supabase Auth) — Handles authentication, passwords, sessions
2. **`public.users`** (App Users) — Stores roles, names, metadata

#### Auto-Sync Trigger

When a user signs up via Supabase Auth, a database trigger automatically creates their profile in `public.users`:

```sql
-- See: database/supabase_user_sync_trigger.sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

**Important:** This trigger MUST be installed in Supabase before allowing signups.

### User Flows

#### Public Signup (`/auth/signup`)
1. User enters email, password, optional name
2. Creates account in `auth.users`
3. Trigger creates profile in `public.users` with role='user'
4. Redirect to homepage

#### Admin-Created Accounts (`/admin/users`)
1. Admin clicks "Create User" button
2. Dialog opens with email, password, name, role fields
3. Creates both auth account and user profile
4. Can set role to 'admin' immediately

#### Login with Fallback Sync (`/auth/login`)
1. User signs in with email/password
2. If `public.users` profile is missing (trigger failure), create it
3. Update `lastSignedIn` timestamp
4. Redirect based on role (admin → `/admin`, user → `/`)

### Admin Controls

From `/admin/users`, admins can:
- View all users with search
- See role breakdown (total, admins, regular users)
- Promote users to admin
- Demote admins to user
- Create new accounts with any role

## 📊 Dashboard Pages

### 1. Overview (`/admin`)
**Live metrics dashboard**
- Email signups count
- Total users count
- Active price alerts
- Pending comments (moderation queue)
- Pending partner applications
- Price drops in last 24h

All cards are clickable and navigate to detail pages.

### 2. Analytics (`/admin/analytics`)
**Traffic and conversion metrics** (placeholder for PostHog integration)
- Overview tab: visitors, buy clicks, search queries, email signups
- Traffic tab: page views, sessions, user flow
- Conversions tab: funnels (signup, alerts, buy clicks)
- Search tab: popular strain searches

Ready for PostHog API connection.

### 3. Email List (`/admin/emails`)
**Subscriber management**
- Total subscriber count
- Breakdown by source (footer, deal_digest, price_alert, compare_inline)
- Search by email, source, or strain
- CSV export button
- Status display (active/unsubscribed)

### 4. Price Alerts (`/admin/alerts`)
**User alerts and notification queue**
- Status breakdown (active, triggered, paused, expired)
- Pending price drops table (awaiting notification)
- "Send Notifications" button for batch processing
- Full alert history with target/current prices

### 5. Price History (`/admin/prices`)
**Price tracking and scraper health**
- Stats: total drops, average drop %, largest drop, 24h activity
- Searchable price drop feed
- Notified status (pending/sent)
- Scraper health monitoring (placeholder)

### 6. User Management (`/admin/users`)
**Account and role management**
- User list with search (email, name)
- Role stats (admins vs. regular users)
- Create new user dialog
- Promote/demote role buttons
- Last sign-in tracking

### 7. Comments (`/admin/comments`)
**Content moderation queue**
- Status counts (pending, approved, rejected, flagged)
- Review interface with approve/reject buttons
- Flag system for problematic content
- Moderation notes
- Red highlight for flagged comments

### 8. Partners (`/admin/partners`)
**Dispensary verification and price updates**

**Applications Tab:**
- Pending/verified/rejected applications
- Business details (name, contact, phone)
- Tier display (basic/premium)
- Review dialog with admin notes
- Verify/reject actions

**Price Updates Tab:**
- Partner-submitted price changes
- Quick approve/reject buttons
- Submission timestamps

### 9. Strain Votes (`/admin/votes`)
**User quality ratings**
- Total votes, rated strains, avg quality, top-rated strain
- Strain rankings table with aggregate scores
- Visual rating bars (effects accuracy, value for money, overall quality)
- Recent votes feed with user comments

## 🔒 Security & Permissions

### Admin Guard

All `/admin/*` routes are protected by `AdminGuard` component:
- Checks user role from `public.users` table
- Redirects non-admins to homepage
- Shows loading state during auth check
- Listens for auth state changes

### Row Level Security (RLS)

**CRITICAL:** Before enabling the Supabase anon key in production, configure RLS on all 9 tables.

See `database/README.md` for complete RLS policies:
- Users: can read/update own profile, admins can manage all
- Email signups: public insert, admin-only read
- Price alerts: users manage own, admins view all
- Comments: users create, public reads approved, admins manage all
- Votes: users vote once per strain, public reads all
- Partners: users claim, admins verify
- Price data: public read, admin write

### First Admin Account

After installing the trigger:
1. Sign up at `/auth/signup`
2. Run SQL to promote yourself:
   ```sql
   UPDATE public.users SET role = 'admin' WHERE email = 'you@example.com';
   ```
3. Log in and access `/admin`

## 🛠 Technical Stack

- **Auth:** Supabase Auth + custom user profiles
- **UI:** shadcn/ui components (Card, Table, Dialog, Badge, Tabs)
- **Icons:** lucide-react
- **Layout:** Fixed sidebar (264px) + main content area
- **State:** React hooks (useState, useEffect)
- **Real-time:** Supabase subscriptions (auth state changes)

## 📁 File Structure

```
web_2/src/
├── app/
│   ├── admin/
│   │   ├── layout.tsx           # Admin layout with sidebar + guard
│   │   ├── page.tsx             # Overview dashboard
│   │   ├── analytics/page.tsx   # Analytics dashboard
│   │   ├── emails/page.tsx      # Email list
│   │   ├── alerts/page.tsx      # Price alerts
│   │   ├── prices/page.tsx      # Price history
│   │   ├── users/page.tsx       # User management
│   │   ├── comments/page.tsx    # Comment moderation
│   │   ├── partners/page.tsx    # Partner portal
│   │   └── votes/page.tsx       # Strain votes
│   └── auth/
│       ├── signup/page.tsx      # Public signup
│       └── login/page.tsx       # Login with sync
├── components/
│   └── admin/
│       ├── AdminGuard.tsx       # Route protection
│       ├── AdminSidebar.tsx     # Navigation sidebar
│       └── CreateUserDialog.tsx # User creation modal
├── hooks/
│   └── useAdminAuth.ts          # Auth state + role check
└── db/
    └── schema.ts                # All 9 table types
```

## ✅ Completed Features

- [x] Admin layout with sidebar navigation
- [x] Auth guard on all admin routes
- [x] User signup/login pages
- [x] Automatic user profile creation (trigger)
- [x] Fallback sync on login
- [x] Admin user creation dialog
- [x] Role promotion/demotion
- [x] Live stats dashboard
- [x] Email list with CSV export
- [x] Price alerts management
- [x] Price history with stats
- [x] Comment moderation queue
- [x] Partner verification system
- [x] Strain votes rankings
- [x] All CRUD operations
- [x] Search/filter on all lists
- [x] Loading states
- [x] Error handling

## 🚀 Deployment Checklist

Before going live:

1. ✅ Install user sync trigger in Supabase
2. ✅ Configure RLS on all 9 tables
3. ✅ Create first admin account
4. ✅ Set Supabase credentials in `.env.local`
5. ✅ Test signup → profile creation flow
6. ✅ Test admin login → dashboard access
7. ✅ Verify non-admins are blocked from `/admin`
8. ✅ Test all CRUD operations
9. ✅ Enable PostHog analytics integration (optional)

## 📝 Future Enhancements

- PostHog API integration for real analytics
- Email notification system (price alerts)
- Partner dashboard (self-service portal)
- Scraper health monitoring
- Bulk actions (approve/reject multiple comments)
- Advanced search/filters
- Export options for all tables
- User suspension/ban system
- Audit log for admin actions
