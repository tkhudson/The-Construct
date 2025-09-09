# The Construct

**AI-Powered Realms Where Your Imagination Builds the Adventure**

## Game Summary

The Construct is a cross-platform digital tabletop RPG that brings D&D 5e (and other genres) to life with AI as your Dungeon Master. Play solo or with friends, create characters, explore worlds, and resolve actions through a chat-driven interface—no physical dice or books required. The AI handles rules, rolls, and narrative, adapting to your choices and pacing the story to fit your session length.

**Key Features:**
- AI-powered DM (OpenAI, Grok, Claude, or built-in fallback)
- Multiplayer support (host as DM or join as player)
- Theme-based adventures (Classic D&D, Modern Zombies, Star Wars, Post-Apocalyptic, Custom)
- Streamlined character creation (theme-aware races/classes/traits)
- Chat-driven gameplay with dice roller and skill checks
- Visual grid map for combat/exploration (token placement and movement)
- Session timer and pacing (AI escalates story as time runs out)
- Session logging and continuation (resume where you left off)
- Modern, pastel dark mode UI
- DM AI assistant for multiplayer games

## How to Run The Construct

### Prerequisites

- [Node.js](https://nodejs.org/) (v16+ recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (for mobile/web development)
- [expo-image-picker](https://docs.expo.dev/versions/latest/sdk/imagepicker/) (for custom token uploads; now installed via npm)
- Firebase project (for multiplayer functionality - see MULTIPLAYER_SETUP.md)

### Setup

1. **Install dependencies:**
   ```
   npm install
   ```
   or
   ```
   yarn install
   ```

2. **Install required dependencies:**
   ```
   npm install
   ```
   or
   ```

#### Troubleshooting

If you encounter issues with `expo-image-picker` (such as version mismatches), run:
```
expo install expo-image-picker
```
This ensures compatibility with your Expo SDK version.
   yarn install
   ```

   > **Note:** `expo-image-picker` is now included in `package.json` and will be installed automatically.

3. **Start the app:**
   ```
   npm start
   ```
   or
   ```
   yarn start
   ```

   - For web: Press `w` in the Expo terminal or visit the local URL.
   - For mobile: Scan the QR code with Expo Go (iOS/Android) or use a simulator.

3. **Enter your AI API key:**
   - Go to Settings in the app.
   - Enter your API key for OpenAI, Grok, or Claude (or use the built-in fallback for limited play).

4. **For multiplayer setup:**
   - Follow the instructions in MULTIPLAYER_SETUP.md to configure Firebase
   - Update src/firebase/config.js with your Firebase credentials

5. **Play!**
   - Start a new game (single player or multiplayer)
   - Create your character and begin your adventure
   - For multiplayer:
     - DMs: Create a session and share the code with players
     - Players: Join a session using the code from your DM
   - Use the map for tactical play, and let the AI handle the story and rules

### Notes

- **API keys and Firebase credentials are never stored in the codebase or uploaded—only saved locally on your device/browser.**
- The multiplayer functionality uses Firebase Realtime Database (free tier supports up to 100 simultaneous connections).
- DM mode includes an AI assistant to help with game mechanics, lore, and storytelling.
- For feedback or contributions, open an issue or pull request!

---
