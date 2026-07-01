# Firebase Cloud Setup

This app uses **Cloud Firestore** for live donation data and loads the Firebase web SDK from Google's CDN.

Firebase Cloud Storage is for files such as images and videos. Donation totals and donor rows are live app data, so they belong in Firestore.

## 1. Create Firebase Web App

1. Open the Firebase console.
2. Create or open a Firebase project.
3. Add a Web app.
4. Copy the Firebase config object.

## 2. Paste Config

Open `firebase-config.js` and replace the placeholder values:

```js
window.DONATION_FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

## 3. Firestore Document Used

The app saves the fundraiser data here:

```text
fundraisers/main
```

You can change this in `firebase-config.js`:

```js
window.DONATION_FIRESTORE_PATH = {
  collection: "fundraisers",
  document: "main"
};
```

## 4. Basic Firestore Rules For Testing

For quick testing only:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /fundraisers/{fundraiserId} {
      allow read, write: if true;
    }
  }
}
```

For public use, add Firebase Authentication and allow only admins to write.

## 5. How It Works

- Admin page: edits data and saves to Firestore.
- Display page: listens to Firestore and updates live.
- If Firebase config is missing, the app falls back to browser-only storage.
