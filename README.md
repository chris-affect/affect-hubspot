# affect-hubspot

See [HubSpot App Page and OAuth Runbook](docs/HUBSPOT_APP_PAGE_AND_OAUTH.md)
for the deployed architecture, installation procedure, and Supabase token
storage plan.

HubSpot Marketplace app foundation generated with `hs project create`.

The project includes:

- A Marketplace-distributed OAuth app in `src/app/app-hsmeta.json`
- A routed app page in `src/app/pages`
- A CRM record tab app card in `src/app/cards` retained during the page migration
- Webhook metadata in `src/app/webhooks/webhooks-hsmeta.json`
- HubSpot Projects config in `hsproject.json`

## HubSpot Account

The HubSpot CLI is authenticated to:

```text
affect-hubspot [test account] (246543107)
```

## Setup

Install the card dependencies:

```sh
npm run install:cards
```

Install the app page dependencies:

```sh
npm run install:pages
```

Install the local OAuth service dependencies:

```sh
npm run install:oauth
```

Create the local OAuth environment file:

```sh
cp services/oauth/.env.example services/oauth/.env
```

Then fill in:

- `HUBSPOT_CLIENT_ID`
- `HUBSPOT_CLIENT_SECRET`

Use the values from the app in Developer Hub.

## Development

Start the OAuth service:

```sh
npm run dev:oauth
```

Install the app into a portal:

```text
https://affect-hubspot-skuehnles-projects.vercel.app/install
```

Start local HubSpot project development:

```sh
hs project dev
```

Upload when ready to deploy to the authenticated HubSpot account:

```sh
hs project upload
```

## Files To Customize

- `src/app/app-hsmeta.json`: app name, OAuth redirect URLs, scopes, permitted URLs, and support links
- `src/app/cards/card-hsmeta.json`: CRM card name, location, and object types
- `src/app/cards/NewCard.tsx`: embedded CRM card UI
- `src/app/pages/Pages.tsx`: native HubSpot app page UI and routes
- `src/app/webhooks/webhooks-hsmeta.json`: webhook target URL and subscriptions
- `services/oauth`: local OAuth install/callback service

## Marketplace Notes

The CLI generated this as a Marketplace app with OAuth auth. Before submission, replace placeholder URLs, support contact details, webhook target, and app links with production values.
