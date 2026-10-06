# HubSpot App Cards

## Overview

HubSpot cards are React-based UI extensions that display custom content within CRM record pages. Cards allow you to extend the HubSpot CRM interface with custom functionality, data visualization, and interactive elements.

Cards are stored in the `src/app/cards/` directory of this HubSpot project.

## Structure

Each card component consists of two files:

1. React component (`.jsx` or `.tsx`): Contains the UI logic and rendering code using React and HubSpot's UI extension components from `@hubspot/ui-extensions`.
2. Configuration file (`*-hsmeta.json`): Defines the card metadata.

## Using App Cards

After uploading your project with `hs project upload`, cards must be manually added to record views:

1. Navigate to a CRM record.
2. Click **Customize** in the record view.
3. Select the tab where you want the card to appear.
4. Click the **+** button to add a card.
5. In the **Card library**, filter by **App** and select your card.
6. Save the view.
