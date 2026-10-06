import crypto from 'node:crypto';

const stateCookieName = 'affect_hubspot_oauth_state';
const redirectUri = process.env.HUBSPOT_REDIRECT_URI;
const clientId = process.env.HUBSPOT_CLIENT_ID;
const scopes =
  process.env.HUBSPOT_SCOPES ||
  'oauth crm.objects.contacts.read crm.objects.contacts.write';

export default function handler(_request, response) {
  if (!clientId || !redirectUri) {
    response.status(500).send('HubSpot OAuth is not configured.');
    return;
  }

  const state = crypto.randomBytes(32).toString('hex');
  const authorizationUrl = new URL('https://app.hubspot.com/oauth/authorize');
  authorizationUrl.searchParams.set('client_id', clientId);
  authorizationUrl.searchParams.set('redirect_uri', redirectUri);
  authorizationUrl.searchParams.set('scope', scopes);
  authorizationUrl.searchParams.set('state', state);

  response.setHeader(
    'Set-Cookie',
    `${stateCookieName}=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
  );
  response.redirect(302, authorizationUrl.toString());
}
