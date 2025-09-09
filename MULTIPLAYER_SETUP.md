# Setting Up Multiplayer in The Construct

This guide will help you set up Firebase for the multiplayer functionality in The Construct. The game uses Firebase Realtime Database for real-time communication between players and the DM.

## 1. Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter a name for your project (e.g., "TheConstructGame")
4. Follow the setup wizard (you can disable Google Analytics if you don't need it)
5. Click "Create project"

## 2. Set Up Firebase Realtime Database

1. In your Firebase project console, select "Realtime Database" from the left menu
2. Click "Create database"
3. Start in test mode for development (we'll set up proper rules later)
4. Choose a database location closest to where most of your players will be
5. Click "Enable"

## 3. Get Your Firebase Configuration

1. In your Firebase project, click the gear icon (⚙️) next to "Project Overview" and select "Project settings"
2. Scroll down to "Your apps" section
3. Click the web icon (</>) to add a web app
4. Register your app with a nickname (e.g., "TheConstructWeb")
5. Copy the Firebase configuration object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project-id.firebaseapp.com",
  databaseURL: "https://your-project-id.firebaseio.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## 4. Update Firebase Configuration in the App

1. Open `src/firebase/config.js` in your project
2. Replace the placeholder firebaseConfig object with your own configuration from step 3
3. Save the file

## 5. Set Up Security Rules (Production)

Before deploying to production, update your Firebase Realtime Database rules for better security:

1. In Firebase Console, go to "Realtime Database" → "Rules" tab
2. Replace the rules with something like:

```json
{
  "rules": {
    "sessions": {
      "$sessionId": {
        ".read": true,
        ".write": true,
        "messages": {
          ".indexOn": ["timestamp"]
        },
        "aiMessages": {
          ".indexOn": ["timestamp", "dmId"]
        },
        "players": {
          ".indexOn": ["joinedAt"]
        }
      }
    }
  }
}
```

3. Click "Publish"

These rules allow anyone to read and write to session data, which is appropriate for our use case since we're using session codes for access control within the app. For more secure applications, you might want to implement Firebase Authentication.

## 6. Firebase Free Tier Limits

The Firebase free tier ("Spark" plan) includes:

- Realtime Database: 1GB storage, 10GB/month downloads
- Simultaneous connections: 100

This should be sufficient for small to medium usage. If you need more capacity, you can upgrade to the "Blaze" pay-as-you-go plan.

## 7. Testing Your Multiplayer Setup

1. Run your app
2. Go to "New Game" and select "Multiplayer Mode: On"
3. Choose "Dungeon Master" as your role
4. Complete the form and click "Create Session"
5. Note the session code that appears
6. On another device or browser, launch the app and click "Join Game"
7. Enter the session code and a player name
8. You should now be connected to the same session

## Troubleshooting

If you encounter issues:

1. Check the browser console for errors
2. Verify your Firebase configuration matches exactly what's in your Firebase console
3. Ensure your Firebase Realtime Database is enabled and in the correct region
4. Check that you haven't exceeded the Firebase free tier limits

For more help, refer to the [Firebase documentation](https://firebase.google.com/docs).