import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Picker,
  TextInput,
  Button,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as AuthSession from "expo-auth-session";

// Sample AI providers (expandable)
const providers = ["OpenAI", "Claude", "Grok"];

// OpenAI OAuth config (replace with your registered app's values)
const OPENAI_CLIENT_ID = "YOUR_OPENAI_CLIENT_ID";
const OPENAI_REDIRECT_URI = AuthSession.makeRedirectUri({ useProxy: true });
const OPENAI_AUTH_ENDPOINT = "https://platform.openai.com/oauth/authorize";
const OPENAI_TOKEN_ENDPOINT = "https://platform.openai.com/oauth/token";
const OPENAI_SCOPES = "openid profile email offline_access";

const Settings = ({ navigation }) => {
  const [selectedProvider, setSelectedProvider] = useState(providers[0]);
  const [apiKey, setApiKey] = useState("");
  const [oauthToken, setOauthToken] = useState("");
  const [authMethod, setAuthMethod] = useState("apiKey"); // "apiKey" or "oauth"
  const [loading, setLoading] = useState(false);

  // Platform-aware storage wrappers
  const isWeb = Platform.OS === "web";

  const getItem = async (key) => {
    try {
      if (isWeb) {
        return await AsyncStorage.getItem(key);
      } else {
        return await SecureStore.getItemAsync(key);
      }
    } catch (error) {
      console.error(`Error getting ${key}:`, error);
      return null;
    }
  };

  const setItem = async (key, value) => {
    try {
      if (isWeb) {
        await AsyncStorage.setItem(key, value);
      } else {
        await SecureStore.setItemAsync(key, value);
      }
    } catch (error) {
      console.error(`Error setting ${key}:`, error);
      throw error; // Propagate to caller for handling
    }
  };

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedProvider = await getItem("aiProvider");
        const storedKey = await getItem("aiApiKey");
        const storedOauthToken = await getItem("aiOauthToken");
        const storedAuthMethod = await getItem("aiAuthMethod");
        if (storedProvider) setSelectedProvider(storedProvider);
        if (storedKey) setApiKey(storedKey);
        if (storedOauthToken) setOauthToken(storedOauthToken);
        if (storedAuthMethod) setAuthMethod(storedAuthMethod);
      } catch (error) {
        alert("Failed to load settings: " + error.message);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    try {
      await setItem("aiProvider", selectedProvider);
      await setItem("aiApiKey", apiKey);
      await setItem("aiOauthToken", oauthToken);
      await setItem("aiAuthMethod", authMethod);
      alert("Settings saved successfully!");
      navigation.navigate("MainMenu");
    } catch (error) {
      alert(
        "Failed to save settings: " + error.message + ". Please try again.",
      );
    }
  };

  // OpenAI OAuth sign-in handler
  const handleOpenAIOAuth = async () => {
    setLoading(true);
    try {
      const authUrl =
        `${OPENAI_AUTH_ENDPOINT}?client_id=${OPENAI_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(OPENAI_REDIRECT_URI)}` +
        `&response_type=code&scope=${encodeURIComponent(OPENAI_SCOPES)}`;
      const result = await AuthSession.startAsync({ authUrl });

      if (result.type === "success" && result.params.code) {
        // Exchange code for token
        const tokenResponse = await fetch(OPENAI_TOKEN_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: `grant_type=authorization_code&code=${result.params.code}&redirect_uri=${encodeURIComponent(
            OPENAI_REDIRECT_URI,
          )}&client_id=${OPENAI_CLIENT_ID}`,
        });
        const tokenJson = await tokenResponse.json();
        if (tokenJson.access_token) {
          setOauthToken(tokenJson.access_token);
          setAuthMethod("oauth");
          alert("OpenAI sign-in successful!");
        } else {
          alert("Failed to retrieve OpenAI access token.");
        }
      } else if (result.type === "error") {
        alert("OpenAI sign-in error: " + result.params.error_description);
      }
    } catch (error) {
      alert("OpenAI OAuth failed: " + error.message);
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    setOauthToken("");
    setAuthMethod("apiKey");
    await setItem("aiOauthToken", "");
    await setItem("aiAuthMethod", "apiKey");
    alert("Signed out of OpenAI account.");
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <Text style={styles.label}>AI Provider:</Text>
      <Picker
        selectedValue={selectedProvider}
        onValueChange={(itemValue) => setSelectedProvider(itemValue)}
        style={styles.picker}
      >
        {providers.map((provider) => (
          <Picker.Item key={provider} label={provider} value={provider} />
        ))}
      </Picker>

      {selectedProvider === "OpenAI" && (
        <>
          <View style={styles.authSwitchContainer}>
            <TouchableOpacity
              style={[
                styles.authSwitchButton,
                authMethod === "apiKey" && styles.authSwitchButtonActive,
              ]}
              onPress={() => setAuthMethod("apiKey")}
            >
              <Text
                style={[
                  styles.authSwitchText,
                  authMethod === "apiKey" && styles.authSwitchTextActive,
                ]}
              >
                Use API Key
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.authSwitchButton,
                authMethod === "oauth" && styles.authSwitchButtonActive,
              ]}
              onPress={handleOpenAIOAuth}
              disabled={loading}
            >
              <Text
                style={[
                  styles.authSwitchText,
                  authMethod === "oauth" && styles.authSwitchTextActive,
                ]}
              >
                Sign in with OpenAI
              </Text>
            </TouchableOpacity>
          </View>
          {authMethod === "apiKey" ? (
            <>
              <Text style={styles.label}>API Key:</Text>
              <TextInput
                style={styles.textInput}
                secureTextEntry
                onChangeText={(text) => setApiKey(text)}
                value={apiKey}
                placeholder="Enter your API key..."
              />
            </>
          ) : (
            <View style={styles.oauthStatusContainer}>
              {loading ? (
                <Text style={styles.oauthStatusText}>Signing in...</Text>
              ) : oauthToken ? (
                <>
                  <Text style={styles.oauthStatusText}>
                    Signed in with OpenAI account.
                  </Text>
                  <Button title="Sign Out" onPress={handleSignOut} />
                </>
              ) : (
                <Text style={styles.oauthStatusText}>
                  Not signed in with OpenAI.
                </Text>
              )}
            </View>
          )}
        </>
      )}

      {selectedProvider !== "OpenAI" && (
        <>
          <Text style={styles.label}>API Key:</Text>
          <TextInput
            style={styles.textInput}
            secureTextEntry
            onChangeText={(text) => setApiKey(text)}
            value={apiKey}
            placeholder="Enter your API key..."
          />
        </>
      )}

      <Text style={styles.warning}>
        Note: API calls may incur costs from your chosen provider. Keys and
        tokens are stored securely on your device. We do not access or share
        them. Usage is logged for transparency.
      </Text>
      {Platform.OS === "web" && (
        <Text style={styles.warning}>
          Warning: On web, storage is not fully secure (uses localStorage). For
          better security, use the native app.
        </Text>
      )}

      <Button title="Save Settings" onPress={handleSave} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  label: {
    fontSize: 18,
    marginTop: 10,
    marginBottom: 5,
  },
  picker: {
    height: 50,
    width: "100%",
    marginBottom: 15,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
  },
  warning: {
    fontSize: 14,
    color: "red",
    marginBottom: 20,
    textAlign: "center",
  },
  authSwitchContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 15,
    marginTop: 10,
  },
  authSwitchButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#007AFF",
    borderRadius: 5,
    marginHorizontal: 5,
    backgroundColor: "#fff",
  },
  authSwitchButtonActive: {
    backgroundColor: "#007AFF",
  },
  authSwitchText: {
    color: "#007AFF",
    fontWeight: "bold",
  },
  authSwitchTextActive: {
    color: "#fff",
  },
  oauthStatusContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  oauthStatusText: {
    fontSize: 16,
    marginBottom: 10,
    color: "#333",
  },
});

export default Settings;
