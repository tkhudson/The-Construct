import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainMenu from "./screens/MainMenu";
import CharacterCreation from "./screens/CharacterCreation";
import GameSession from "./screens/GameSession";
import SessionSetup from "./screens/SessionSetup";
import Settings from "./screens/Settings";
import { ThemeProvider } from "./theme/ThemeProvider";

// Placeholder screen component
function PlaceholderScreen({ route }) {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>{route.name} Screen (Placeholder)</Text>
    </View>
  );
}

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <ThemeProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="MainMenu">
          <Stack.Screen
            name="MainMenu"
            component={MainMenu}
            options={{ title: "The Construct" }}
          />
          <Stack.Screen name="NewGame" component={SessionSetup} />
          <Stack.Screen
            name="CharacterCreation"
            component={CharacterCreation}
          />
          <Stack.Screen name="ContinueSession" component={PlaceholderScreen} />
          <Stack.Screen name="Settings" component={Settings} />
          <Stack.Screen name="GameSession" component={GameSession} />
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>
  );
}
