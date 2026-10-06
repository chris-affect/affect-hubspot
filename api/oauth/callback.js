const stateCookieName = 'affect_hubspot_oauth_state';
const hubspotAppId = '45545394';

export default async function handler(request, response) {
  const { code, state, error, error_description: errorDescription } = request.query;

  if (error) {
    response.status(400).send(`HubSpot OAuth error: ${errorDescription || error}`);
    return;
  }

  if (!code || typeof code !== 'string') {
    response.status(400).send('Missing HubSpot OAuth authorization code.');
    return;
  }

  const cookies = parseCookies(request.headers.cookie);
  if (!state || state !== cookies[stateCookieName]) {
    response
      .status(400)
      .send('OAuth state did not match. Restart installation from /install.');
    return;
  }

  const clientId = process.env.HUBSPOT_CLIENT_ID;
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
  const redirectUri = process.env.HUBSPOT_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    response.status(500).send('HubSpot OAuth is not configured.');
    return;
  }

  try {
    const tokenResponse = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      }),
    });
    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed with status ${tokenResponse.status}`);
    }

    const tokenInfoResponse = await fetch(
      `https://api.hubapi.com/oauth/v1/access-tokens/${encodeURIComponent(tokens.access_token)}`,
    );
    const tokenInfo = await tokenInfoResponse.json();

    if (!tokenInfoResponse.ok || !tokenInfo.hub_id) {
      throw new Error('Could not determine the installed HubSpot account.');
    }

    // Token persistence will be connected to the delivery app's database next.
    // Never include OAuth tokens in logs, responses, redirects, or browser storage.
    response.setHeader(
      'Set-Cookie',
      `${stateCookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    );
    response.redirect(
      302,
      `https://app.hubspot.com/app/${tokenInfo.hub_id}/${hubspotAppId}`,
    );
  } catch (oauthError) {
    console.error('[hubspot-oauth] callback failed', {
      message: oauthError instanceof Error ? oauthError.message : 'Unknown error',
    });
    response.status(502).send('HubSpot OAuth could not be completed.');
  }
}

function parseCookies(cookieHeader = '') {
  return cookieHeader.split(';').reduce((cookies, cookie) => {
    const [name, ...valueParts] = cookie.trim().split('=');
    if (name) {
      cookies[name] = decodeURIComponent(valueParts.join('='));
    }
    return cookies;
  }, {});
}
