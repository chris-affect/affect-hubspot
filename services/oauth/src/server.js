import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import express from 'express';
import 'dotenv/config';

const app = express();

const port = Number(process.env.PORT || 3000);
const bindHost = process.env.BIND_HOST || '0.0.0.0';
const publicHost = process.env.PUBLIC_HOST || 'localhost';
const clientId = process.env.HUBSPOT_CLIENT_ID;
const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
const redirectUri =
  process.env.HUBSPOT_REDIRECT_URI ||
  `http://${publicHost}:${port}/oauth/callback`;
const scopes =
  process.env.HUBSPOT_SCOPES ||
  'oauth crm.objects.contacts.read crm.objects.contacts.write';
const stateCookieName =
  process.env.SESSION_COOKIE_NAME || 'affect_hubspot_oauth_state';
const tokenStorePath = path.join(process.cwd(), 'data', 'tokens.json');

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.get('/', (_req, res) => {
  res.type('html').send(`
    <h1>affect-hubspot OAuth service</h1>
    <p>Use <a href="/install">/install</a> to install the app into a HubSpot portal.</p>
    <p>Use <a href="/health">/health</a> to verify the service is running.</p>
  `);
});

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    redirectUri,
    hasClientId: Boolean(clientId),
    hasClientSecret: Boolean(clientSecret),
  });
});

app.get('/install', (_req, res) => {
  if (!clientId) {
    res.status(500).send('Missing HUBSPOT_CLIENT_ID in services/oauth/.env');
    return;
  }

  const state = crypto.randomBytes(24).toString('hex');
  const authUrl = new URL('https://app.hubspot.com/oauth/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('state', state);

  res.cookie(stateCookieName, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 10 * 60 * 1000,
  });
  res.redirect(authUrl.toString());
});

app.get('/oauth/callback', async (req, res, next) => {
  try {
    const { code, state, error, error_description: errorDescription } = req.query;

    if (error) {
      res.status(400).send(`HubSpot OAuth error: ${errorDescription || error}`);
      return;
    }

    if (!code || typeof code !== 'string') {
      res.status(400).send('Missing OAuth authorization code.');
      return;
    }

    const cookieState = parseCookies(req.headers.cookie)[stateCookieName];
    if (!state || state !== cookieState) {
      res.status(400).send('OAuth state did not match. Restart installation.');
      return;
    }

    if (!clientId || !clientSecret) {
      res
        .status(500)
        .send('Missing HUBSPOT_CLIENT_ID or HUBSPOT_CLIENT_SECRET in services/oauth/.env');
      return;
    }

    const tokenResponse = await exchangeCodeForTokens(code);
    await persistTokenResponse(tokenResponse);

    res.clearCookie(stateCookieName);
    res.type('html').send(`
      <h1>HubSpot app installed</h1>
      <p>The OAuth token response was stored locally for development.</p>
      <p>Token store: <code>services/oauth/data/tokens.json</code></p>
    `);
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).send('OAuth service error. Check the server logs.');
});

app.listen(port, bindHost, () => {
  console.log(`OAuth service listening at http://${publicHost}:${port}`);
  console.log(`OAuth callback URL: ${redirectUri}`);
});

async function exchangeCodeForTokens(code) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
  });

  const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`Token exchange failed: ${JSON.stringify(payload)}`);
  }

  return {
    ...payload,
    createdAt: new Date().toISOString(),
  };
}

async function persistTokenResponse(tokenResponse) {
  await fs.mkdir(path.dirname(tokenStorePath), { recursive: true });
  await fs.writeFile(tokenStorePath, JSON.stringify(tokenResponse, null, 2));
}

function parseCookies(cookieHeader = '') {
  return cookieHeader.split(';').reduce((cookies, cookie) => {
    const [name, ...valueParts] = cookie.trim().split('=');
    if (!name) {
      return cookies;
    }

    cookies[name] = decodeURIComponent(valueParts.join('='));
    return cookies;
  }, {});
}
