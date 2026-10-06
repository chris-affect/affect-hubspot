# HubSpot App Page and OAuth Runbook

Last verified: July 17, 2026

## Current state

The Affect HubSpot app page is deployed, installable, and visible in HubSpot.

| Resource | Value |
| --- | --- |
| HubSpot account | `246543107` |
| HubSpot project | `affect-hubspot` |
| HubSpot project ID | `317331242` |
| HubSpot app ID | `45545394` |
| HubSpot page UID | `affect_hubspot_pages` |
| Vercel team | `skuehnles-projects` |
| Vercel project | `affect-hubspot` |
| Production domain | `https://affect-hubspot-skuehnles-projects.vercel.app` |
| Install URL | `https://affect-hubspot-skuehnles-projects.vercel.app/install` |
| OAuth callback | `https://affect-hubspot-skuehnles-projects.vercel.app/oauth/callback` |
| HubSpot app page | `https://app.hubspot.com/app/246543107/45545394` |

The CRM card remains deployed while functionality moves to the app page. The
app page currently provides Overview, Deliveries, and Funnel routes. The Funnel
route is isolated so the existing visualization can later open in an iframe
modal if HubSpot's native chart components are insufficient.

## Architecture

```text
HubSpot app page (React UI extension)
        |
        | hubspot.fetch()
        v
Vercel serverless integration API
        |
        | server-only database connection
        v
Supabase Postgres
```

The HubSpot UI is implemented with `@hubspot/ui-extensions`. It does not render
ordinary DOM-based React component libraries. The delivery API and OAuth code
run outside the UI-extension sandbox.

## OAuth installation flow

1. A user opens `/install` on the Vercel integration domain.
2. The server creates a random OAuth state value in a short-lived, secure,
   HTTP-only cookie.
3. The user is redirected to HubSpot to approve the requested scopes.
4. HubSpot redirects to `/oauth/callback` with an authorization code and state.
5. The callback verifies the state cookie.
6. The callback exchanges the authorization code for access and refresh tokens.
7. The callback looks up the installed HubSpot account ID.
8. The user is redirected to the HubSpot app page.

The deployed callback completes these steps, but intentionally does not yet
persist the returned tokens. This must be completed before API-backed features
or customer installations are enabled.

## Vercel configuration

The Vercel project must have these encrypted variables in Preview and
Production:

```text
HUBSPOT_CLIENT_ID
HUBSPOT_CLIENT_SECRET
HUBSPOT_REDIRECT_URI
```

`HUBSPOT_REDIRECT_URI` must exactly equal:

```text
https://affect-hubspot-skuehnles-projects.vercel.app/oauth/callback
```

Vercel SSO deployment protection must remain disabled for the production
integration domain. HubSpot cannot call a callback protected by Vercel login.
Preview deployments may remain protected.

The reused Vercel project must use the `Other` framework preset with automatic
build, install, and output settings. A stale `vite build` override previously
prevented this repository from deploying.

## Deployment procedure

Validate locally:

```sh
node --check api/install.js
node --check api/oauth/callback.js
npm run typecheck:pages
npm run lint
git diff --check
```

Deploy the serverless OAuth endpoints:

```sh
npx vercel@latest --prod --yes --scope skuehnles-projects
```

Verify the public endpoints:

```sh
curl -sS -o /dev/null -w '%{http_code}\n' \
  https://affect-hubspot-skuehnles-projects.vercel.app/install

curl -sS -o /dev/null -w '%{http_code}\n' \
  https://affect-hubspot-skuehnles-projects.vercel.app/oauth/callback
```

Expected results are `302` for `/install` and `400` for a callback request that
does not contain an authorization code.

Deploy the HubSpot project metadata and UI extension:

```sh
hs project upload
```

Then perform a real installation from the production `/install` URL. Starting
from this URL is important because it creates the state cookie used by the
callback.

## Supabase token-storage plan

### Recommended design

Use a private Postgres schema reached only by the Vercel serverless backend.
Encrypt both OAuth tokens before inserting them, using AES-256-GCM or an
equivalent authenticated-encryption scheme. Keep the encryption key in a
sensitive Vercel environment variable, separate from the database and its
backups.

Do not expose the token table through the Supabase Data API. Do not access it
from the HubSpot React extension, the Affect browser application, or a
publishable/anonymous Supabase key.

Suggested table:

```sql
create schema if not exists hubspot_private;

create table hubspot_private.oauth_installations (
  hub_id bigint primary key,
  app_id bigint not null,
  encrypted_access_token text not null,
  encrypted_refresh_token text not null,
  access_token_expires_at timestamptz not null,
  scopes text[] not null default '{}',
  encryption_key_version integer not null default 1,
  installed_at timestamptz not null default now(),
  refreshed_at timestamptz,
  revoked_at timestamptz,
  updated_at timestamptz not null default now()
);

create index oauth_installations_active_expiry_idx
  on hubspot_private.oauth_installations (access_token_expires_at)
  where revoked_at is null;
```

`hub_id` is the tenant boundary. Every token lookup and API operation must be
scoped to it. The unique primary key also makes reinstallations an atomic
upsert rather than creating multiple active credentials for one HubSpot
account.

### Required Supabase/Vercel configuration

Provision a Supabase project or identify the primary delivery app's existing
project. Add these as sensitive Vercel variables:

```text
SUPABASE_DB_URL
HUBSPOT_TOKEN_ENCRYPTION_KEY
HUBSPOT_TOKEN_ENCRYPTION_KEY_VERSION
```

Use Supabase's pooled server connection string appropriate for serverless
traffic. Prefer a dedicated least-privilege database role that can only select,
insert, and update `hubspot_private.oauth_installations`. Do not use the
database owner credentials in the function.

If the implementation uses `supabase-js` instead of a direct Postgres
connection, use a server-only secret key and a non-exposed schema/RPC boundary.
Never use a publishable key for OAuth token operations, and never expose a
Supabase secret or legacy `service_role` key to client code.

### Callback changes

Update `api/oauth/callback.js` to:

1. Encrypt the access and refresh tokens immediately after exchange.
2. Calculate `access_token_expires_at` from `expires_in`.
3. Upsert the encrypted values using `hub_id` as the conflict key.
4. Store scopes, app ID, key version, and installation timestamps.
5. Fail the installation with a safe error if persistence fails.
6. Clear the state cookie only after the database transaction succeeds.
7. Never log tokens, encryption plaintext, database credentials, or full
   HubSpot API responses.

### Refresh-token service

Add a server-only token provider used by all HubSpot API calls:

1. Load the installation by `hub_id`.
2. Reject revoked or missing installations.
3. Decrypt the access token only in memory.
4. Return it if it remains valid beyond a short safety window.
5. Otherwise exchange the refresh token for a new token pair.
6. Encrypt and atomically update both new tokens and the expiry timestamp.
7. Prevent concurrent refreshes for the same `hub_id` with a transaction and
   row lock, advisory lock, or compare-and-swap update.
8. Mark the installation revoked when HubSpot reports an unrecoverable refresh
   failure.

HubSpot may return a new refresh token during refresh. Always replace both
stored tokens as one atomic operation.

### Uninstall and lifecycle handling

- Add an uninstall/deauthorization webhook or supported lifecycle handler.
- Set `revoked_at` immediately when an installation is removed.
- Delete or cryptographically retire tokens according to the retention policy.
- Support clean reinstallation by replacing the revoked installation row.
- Record operational metadata, but never token plaintext, in audit logs.
- Add monitoring for callback failures, refresh failures, and repeated API
  authorization errors.

### Verification checklist

- [ ] Supabase project and region selected.
- [ ] Private schema migration created and reviewed.
- [ ] Dedicated least-privilege database role created.
- [ ] Serverless pooled connection configured in Vercel.
- [ ] Encryption key generated, stored only in Vercel, and versioned.
- [ ] Callback persists encrypted tokens before redirecting.
- [ ] Database rows contain no plaintext token fragments.
- [ ] Refresh flow tested with an expired access token.
- [ ] Concurrent refresh behavior tested.
- [ ] Reinstall replaces the existing installation safely.
- [ ] Uninstall marks credentials revoked.
- [ ] HubSpot API request succeeds after a cold serverless start.
- [ ] Logs and error responses contain no secrets.
- [ ] Supabase security and performance advisors pass.
- [ ] Backup and encryption-key rotation procedures documented and tested.

## Supabase Vault alternative

Supabase Vault can store encrypted secrets with keys managed separately from
the database. It is a viable alternative, particularly if token access will be
implemented through tightly controlled database functions. Access to
`vault.decrypted_secrets` must be restricted because any role that can query
that view can read plaintext secrets.

For this Vercel integration, application-layer authenticated encryption is the
recommended starting point: the database stores only ciphertext, and the
decryption key stays in Vercel. Vault can be reconsidered if the team wants
database-managed encryption and is prepared to maintain a carefully restricted
SQL function boundary.

References:

- [Supabase Vault](https://supabase.com/docs/guides/database/vault)
- [Supabase data security](https://supabase.com/docs/guides/database/secure-data)
- [Supabase server-side secret keys](https://supabase.com/docs/guides/troubleshooting/performing-administration-tasks-on-the-server-side-with-the-servicerole-secret-BYM4Fa)
- [HubSpot OAuth](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/oauth/working-with-oauth)

