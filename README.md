# Donation Total Display

Open `index.html` in a browser to edit the fundraiser total.
Open `display.html` to show the display only, with no editing controls.
For cloud sync, fill in `firebase-config.js` using the steps in `FIREBASE_SETUP.md`.

Use the left panel to update:

- Campaign name
- Amount raised, calculated from the donor list
- Fundraising goal
- Donor count, calculated from the donor list
- All donor dates, names, and amounts
- Currency
- Update note

The public display shows the latest 5 donors only, but the admin page keeps all donor records. Select **Add donor** when you have more than 5 donors. Select **Export Excel** to download all donor dates and a daily summary.

Select **Save display** to keep the current values in the browser. Select **Reset sample** to return to the starter numbers.

When Firebase is configured, **Save display** stores the values in Cloud Firestore and the display page updates live.
