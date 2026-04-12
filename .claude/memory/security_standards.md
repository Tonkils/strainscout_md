# Security Standards — StrainScout MD

## OWASP Top 10 Requirements

| Risk | Mitigation |
|------|------------|
| Injection | All DB queries via Drizzle ORM. Zero raw SQL string concatenation. |
| Broken Auth | HTTP-only, Secure cookies. Sessions validated server-side on every protected request. |
| Sensitive Data Exposure | Supabase service-role key server-side only. No secrets in client bundle or git. |
| XML/XXE | Not applicable (no XML parsing). |
| Broken Access Control | `adminProcedure` enforces role check. Route-level guards on `/moderation`, `/admin/*`. |
| Security Misconfiguration | CSP headers required. CORS restricted to production domain. |
| XSS | No raw HTML rendering of user content. React JSX escapes by default — do not use `dangerouslySetInnerHTML`. |
| Insecure Deserialization | superjson used for tRPC — validate all incoming data with Zod regardless. |
| Known Vulnerabilities | `npm audit` run before each deploy. No high/critical unresolved CVEs. |
| Insufficient Logging | Server errors logged with context. Auth failures logged. Admin actions logged. |

## Credential Management

- `.env` files are gitignored — never commit secrets
- Supabase anon key (public, safe for client): prefix `sb_publishable_`
- Supabase service-role key (secret, server only): never in client code
- IONOS SFTP credentials: environment variables only, never hardcoded
- PostHog key: client-side only, low sensitivity — still keep out of public logs

## Input Validation Rules

All tRPC procedure inputs must use Zod:
```typescript
// Minimum string field validation
z.string().min(1).max(500).trim()

// Email
z.string().email()

// Price input (from partners)
z.number().min(0).max(1000)

// Strain name
z.string().min(1).max(100).trim()

// Pagination
z.number().int().min(1).max(100).default(20)
```

## Content Security Policy (Target)

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://maps.googleapis.com https://us.posthog.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https:;
  connect-src 'self' https://*.supabase.co https://us.posthog.com;
  frame-src 'none';
```

## Cannabis Industry Compliance

| Requirement | Rule |
|-------------|------|
| Age gating | Any new user registration flow must include age verification (21+) |
| Price transparency | Affiliate relationships must be disclosed near affiliate links |
| Partner data | Partner-submitted prices must be attributed and timestamped |
| No facilitation | Platform must not facilitate unlicensed sales — all purchase links go to licensed dispensary sites |
| Data accuracy | Price data displayed as "as of [date]" — no implied guarantee of current pricing |
| User data | Email addresses collected only with explicit opt-in. CAN-SPAM compliant unsubscribe required. |

## Auth System Status (Current)

`useAuth.ts` is a stub returning `null` user. Until real OAuth is implemented:
- Do not build any feature that requires a logged-in user to function correctly
- Do not expose admin routes to unauthenticated users
- The `/moderation` and `/admin/partners` routes currently have no auth guard — this is a known critical issue
