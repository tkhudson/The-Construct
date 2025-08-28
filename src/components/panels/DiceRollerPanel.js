import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  AccessibilityInfo,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  useAnimatedGestureHandler,
} from "react-native-reanimated";
import { PanGestureHandler } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import * as HapticFeedback from "expo-haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PANEL_WIDTH = Math.min(340, SCREEN_WIDTH * 0.8);

const DICE = [
  { label: "d4", sides: 4 },
  { label: "d6", sides: 6 },
  { label: "d8", sides: 8 },
  { label: "d10", sides: 10 },
  { label: "d12", sides: 12 },
  { label: "d20", sides: 20 },
  { label: "d100", sides: 100 },
];

function rollDice(sides, count = 1) {
  const rolls = [];
  for (let i = 0; i < count; i++) {
    rolls.push(Math.floor(Math.random() * sides) + 1);
  }
  return rolls;
}

const DiceRollerPanel = ({
  visible,
  onClose,
  onOpen,
  onRoll, // function({ label, sides, count, rolls, total }) => void
  theme,
  panelPosition = "right", // "right" or "left"
  anyPanelOpen = false,
}) => {
  const [numDice, setNumDice] = useState(1);
  const [rollHistory, setRollHistory] = useState([]);

  // Panel animation
  const closedX = panelPosition === "right" ? PANEL_WIDTH : -PANEL_WIDTH;
  const openX = 0;
  const translateX = useSharedValue(closedX);

  React.useEffect(() => {
    translateX.value = withTiming(visible ? openX : closedX, { duration: 350 });
  }, [visible]);

  const animatedPanelStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: translateX.value,
        },
      ],
    };
  });

  // Gesture handler for swipe-to-close
  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx) => {
      ctx.startX = translateX.value;
    },
    onActive: (event, ctx) => {
      let nextX = ctx.startX + event.translationX;
      if (panelPosition === "right") {
        nextX = Math.min(nextX, openX);
        nextX = Math.max(nextX, closedX - 40);
      } else {
        nextX = Math.max(nextX, openX);
        nextX = Math.min(nextX, closedX + 40);
      }
      translateX.value = nextX;
    },
    onEnd: (event) => {
      const threshold = PANEL_WIDTH * 0.3;
      if (
        (panelPosition === "right" && event.translationX < -threshold) ||
        (panelPosition === "left" && event.translationX > threshold)
      ) {
        translateX.value = withTiming(
          closedX,
          { duration: 250 },
          (finished) => {
            if (finished) runOnJS(onClose)();
          },
        );
      } else {
        translateX.value = withTiming(openX, { duration: 250 });
      }
    },
  });

  const handleRoll = useCallback(
    async (die) => {
      try {
        const rolls = rollDice(die.sides, numDice);
        const total = rolls.reduce((a, b) => a + b, 0);
        const result = {
          label: die.label,
          sides: die.sides,
          count: numDice,
          rolls,
          total,
          timestamp: Date.now(),
        };

        setRollHistory((prev) => [result, ...prev.slice(0, 19)]);

        // Provide haptic feedback if available
        if (Platform.OS === "ios" && HapticFeedback) {
          HapticFeedback.selection();
        }

        if (onRoll) onRoll(result);

        // Accessibility announcement
        await AccessibilityInfo.announceForAccessibility(
          `Rolled ${result.count} ${result.label}: ${result.rolls.join(", ")}, total ${result.total}`,
        );
      } catch (error) {
        console.error("Dice roll error:", error);
        await AccessibilityInfo.announceForAccessibility(
          "Failed to roll dice. Please try again.",
        );
      }
    },
    [numDice, onRoll],
  );

  // Manage focus and accessibility
  const handleClose = useCallback(async () => {
    if (Platform.OS === "ios" && HapticFeedback) {
      HapticFeedback.selection();
    }
    onClose();
    await AccessibilityInfo.announceForAccessibility("Dice roller closed");
  }, [onClose]);

  const handleOpen = useCallback(async () => {
    if (Platform.OS === "ios" && HapticFeedback) {
      HapticFeedback.selection();
    }
    onOpen();
    await AccessibilityInfo.announceForAccessibility("Dice roller opened");
  }, [onOpen]);

  return (
    <>
      {/* Overlay - only render when visible to prevent focus issues */}
      {visible && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={0.7}
          onPress={handleClose}
          accessible={true}
          accessibilityLabel="Close dice roller overlay"
          accessibilityHint="Tap to close the dice roller"
        />
      )}
      {/* Animated Panel with gesture handler */}
      <PanGestureHandler enabled={visible} onGestureEvent={gestureHandler}>
        <Animated.View
          style={[
            styles.panel,
            animatedPanelStyle,
            {
              right: panelPosition === "right" ? 0 : undefined,
              left: panelPosition === "left" ? 0 : undefined,
              backgroundColor: theme?.card || "#232946",
              borderColor: theme?.accent || "#7f9cf5",
            },
          ]}
          accessible={visible}
          accessibilityRole="dialog"
          accessibilityLabel="Dice roller panel"
          {...(Platform.OS === "web"
            ? {
                "aria-hidden": !visible,
                "aria-modal": visible,
                "aria-labelledby": "dice-panel-title",
              }
            : {})}
        >
          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            hitSlop={12}
            accessible={true}
            accessibilityLabel="Close dice roller"
            accessibilityHint="Double tap to close the dice rolling panel"
            nativeID="dice-panel-close"
          >
            <Ionicons
              name="close"
              size={28}
              color={theme?.accent || "#7f9cf5"}
            />
          </TouchableOpacity>
          <View
            style={styles.panelContent}
            accessible={visible}
            accessibilityRole="main"
            nativeID="dice-panel-content"
          >
            <Text nativeID="dice-panel-title" style={styles.panelTitle}>
              Dice Roller
            </Text>
            {/* Number of dice selector */}
            <View style={styles.diceCountRow}>
              <Text style={{ color: theme?.text || "#fff", fontSize: 16 }}>
                Number of dice:
              </Text>
              <TouchableOpacity
                style={[
                  styles.diceCountButton,
                  { backgroundColor: theme?.button || "#393e6e" },
                ]}
                onPress={() => setNumDice((n) => Math.max(1, n - 1))}
                accessible={true}
                accessibilityLabel="Decrease number of dice"
                accessibilityHint={`Currently set to ${numDice} dice, minimum is 1`}
              >
                <Text
                  style={{ color: theme?.buttonText || "#fff", fontSize: 18 }}
                >
                  -
                </Text>
              </TouchableOpacity>
              <Text
                style={{
                  color: theme?.accent || "#7f9cf5",
                  fontWeight: "bold",
                  fontSize: 18,
                  marginHorizontal: 8,
                  minWidth: 24,
                  textAlign: "center",
                }}
                accessible={true}
                accessibilityLabel={`Number of dice: ${numDice}`}
              >
                {numDice}
              </Text>
              <TouchableOpacity
                style={[
                  styles.diceCountButton,
                  { backgroundColor: theme?.button || "#393e6e" },
                ]}
                onPress={() => setNumDice((n) => Math.min(20, n + 1))}
                accessible={true}
                accessibilityLabel="Increase number of dice"
                accessibilityHint={`Currently set to ${numDice} dice, maximum is 20`}
              >
                <Text
                  style={{ color: theme?.buttonText || "#fff", fontSize: 18 }}
                >
                  +
                </Text>
              </TouchableOpacity>
            </View>
            {/* Dice buttons */}
            <View style={styles.diceRow}>
              {DICE.map((die) => (
                <TouchableOpacity
                  key={die.label}
                  style={[
                    styles.dieButton,
                    {
                      backgroundColor: theme?.accent || "#7f9cf5",
                      borderColor: theme?.border || "#393e6e",
                    },
                  ]}
                  onPress={() => handleRoll(die)}
                  activeOpacity={0.8}
                  accessible={true}
                  accessibilityLabel={`Roll ${die.label} dice`}
                  accessibilityHint={`Roll ${numDice} ${die.label} with ${die.sides} sides each`}
                >
                  <Text
                    style={{
                      color: "#fff",
                      fontWeight: "bold",
                      fontSize: 18,
                      letterSpacing: 1,
                    }}
                  >
                    {die.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Roll history */}
            <Text
              style={{
                color: theme?.text || "#fff",
                fontWeight: "bold",
                fontSize: 15,
                marginTop: 18,
                marginBottom: 4,
                textAlign: "center",
                letterSpacing: 0.5,
              }}
              accessible={true}
              accessibilityRole="header"
            >
              Roll History
            </Text>
            <ScrollView
              style={styles.historyScroll}
              contentContainerStyle={{ paddingBottom: 12 }}
              accessible={true}
              accessibilityLabel="Dice roll history"
            >
              {rollHistory.length === 0 && (
                <Text
                  style={{ color: "#aaa", textAlign: "center", marginTop: 8 }}
                  accessible={true}
                  accessibilityRole="text"
                >
                  No rolls yet.
                </Text>
              )}
              {rollHistory.map((roll) => (
                <View
                  key={roll.timestamp}
                  style={styles.historyItem}
                  accessible={true}
                  accessibilityLabel={`Roll ${roll.count > 1 ? roll.count : ""}${roll.label}: ${roll.rolls.join(", ")}, total ${roll.total}`}
                >
                  <Text
                    style={{
                      color: theme?.accent || "#7f9cf5",
                      fontWeight: "bold",
                    }}
                  >
                    {roll.count > 1 ? `${roll.count}${roll.label}` : roll.label}
                    :
                  </Text>
                  <Text style={{ color: theme?.text || "#fff", marginLeft: 4 }}>
                    {roll.rolls.join(", ")} (Total: {roll.total})
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </Animated.View>
      </PanGestureHandler>
      {/* Dice Tab Button - only render when panel is closed */}
      {!visible && !anyPanelOpen && (
        <TouchableOpacity
          style={[
            styles.tabButton,
            {
              right: panelPosition === "right" ? 0 : undefined,
              left: panelPosition === "left" ? 0 : undefined,
              backgroundColor: theme?.accent || "#7f9cf5",
            },
          ]}
          onPress={handleOpen}
          accessible={true}
          accessibilityLabel="Open dice roller"
          accessibilityHint="Double tap to open the dice rolling panel"
        >
          <Ionicons name="dice" size={24} color="#fff" />
          <Text style={styles.tabButtonText}>Dice</Text>
        </TouchableOpacity>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000a",
    zIndex: 10,
  },
  panel: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: PANEL_WIDTH,
    zIndex: 20,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
    paddingTop: 16,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 30,
    backgroundColor: "#232946cc",
    borderRadius: 16,
    padding: 2,
  },
  panelContent: {
    marginTop: 40,
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "stretch",
  },
  panelTitle: {
    color: "#7f9cf5",
    fontWeight: "bold",
    fontSize: 20,
    marginBottom: 10,
    textAlign: "center",
    letterSpacing: 1,
  },
  diceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginVertical: 10,
  },
  dieButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    margin: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 54,
    minHeight: 44,
    elevation: 2,
  },
  diceCountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    gap: 6,
  },
  diceCountButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginHorizontal: 2,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 28,
    minHeight: 28,
  },
  historyScroll: {
    flex: 1,
    marginTop: 2,
    maxHeight: 140,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  tabButton: {
    position: "absolute",
    top: 140,
    zIndex: 30,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  tabButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
    letterSpacing: 1,
  },
});

export default DiceRollerPanel;
