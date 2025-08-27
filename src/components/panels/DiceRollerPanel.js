import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
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

  const handleRoll = (die) => {
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
    if (onRoll) onRoll(result);
  };

  return (
    <>
      {/* Overlay */}
      {visible && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={0.7}
          onPress={onClose}
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
        >
          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={12}
          >
            <Ionicons
              name="close"
              size={28}
              color={theme?.accent || "#7f9cf5"}
            />
          </TouchableOpacity>
          <View style={styles.panelContent}>
            <Text
              style={{
                color: theme?.accent || "#7f9cf5",
                fontWeight: "bold",
                fontSize: 20,
                marginBottom: 10,
                textAlign: "center",
                letterSpacing: 1,
              }}
            >
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
              >
                {numDice}
              </Text>
              <TouchableOpacity
                style={[
                  styles.diceCountButton,
                  { backgroundColor: theme?.button || "#393e6e" },
                ]}
                onPress={() => setNumDice((n) => Math.min(20, n + 1))}
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
            >
              Roll History
            </Text>
            <ScrollView
              style={styles.historyScroll}
              contentContainerStyle={{ paddingBottom: 12 }}
            >
              {rollHistory.length === 0 && (
                <Text
                  style={{ color: "#aaa", textAlign: "center", marginTop: 8 }}
                >
                  No rolls yet.
                </Text>
              )}
              {rollHistory.map((roll) => (
                <View key={roll.timestamp} style={styles.historyItem}>
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
      {/* Dice Tab Button */}
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
          onPress={onOpen}
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
