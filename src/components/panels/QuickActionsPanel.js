import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  useAnimatedGestureHandler,
} from "react-native-reanimated";
import { PanGestureHandler } from "react-native-gesture-handler";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PANEL_WIDTH = 250;

const QuickActionsPanel = ({
  visible,
  onClose,
  onOpen,
  theme,
  panelPosition = "right",
  anyPanelOpen,
  onAction,
}) => {
  // Panel animation setup
  const closedX = panelPosition === "right" ? PANEL_WIDTH : -PANEL_WIDTH;
  const openX = 0;
  const translateX = useSharedValue(closedX);

  // Update position when visibility changes
  React.useEffect(() => {
    translateX.value = withSpring(visible ? openX : closedX, {
      damping: 15,
      stiffness: 150,
    });
  }, [visible, openX, closedX]);

  // Animated style for panel
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  // Gesture handler for swipe-to-close
  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx) => {
      ctx.startX = translateX.value;
    },
    onActive: (event, ctx) => {
      const newValue = ctx.startX + event.translationX;
      if (panelPosition === "right") {
        translateX.value = Math.max(0, newValue);
      } else {
        translateX.value = Math.min(0, newValue);
      }
    },
    onEnd: (event) => {
      const shouldClose =
        (panelPosition === "right" && event.velocityX > 500) ||
        (panelPosition === "left" && event.velocityX < -500);

      if (shouldClose) {
        translateX.value = withSpring(closedX, {
          velocity: event.velocityX,
          damping: 15,
          stiffness: 150,
        });
        runOnJS(onClose)();
      } else {
        translateX.value = withSpring(openX, {
          velocity: event.velocityX,
          damping: 15,
          stiffness: 150,
        });
      }
    },
  });

  const quickActions = [
    {
      id: "look",
      label: "[EYE] Look Around",
      action: "I carefully observe my surroundings",
    },
    {
      id: "stealth",
      label: "[HOOD] Enter Stealth",
      action: "I attempt to move stealthily",
    },
    {
      id: "speak",
      label: "[CHAT] Speak",
      action: "I attempt to communicate",
    },
    {
      id: "attack",
      label: "[SWORD] Quick Attack",
      action: "I make a quick attack",
    },
    {
      id: "investigate",
      label: "[SEARCH] Investigate",
      action: "I investigate the area more closely",
    },
    {
      id: "persuade",
      label: "[MASK] Persuade",
      action: "I try to persuade",
    },
    {
      id: "intimidate",
      label: "[FIST] Intimidate",
      action: "I attempt to intimidate",
    },
    {
      id: "perception",
      label: "[LENS] Perception Check",
      action: "I make a perception check",
    },
  ];

  const handleActionPress = useCallback(
    (action) => {
      onAction(action);
      onClose();
    },
    [onAction, onClose],
  );

  if (!visible) return null;

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View
        style={[
          styles.panel,
          panelPosition === "right" ? styles.rightPanel : styles.leftPanel,
          { backgroundColor: theme.card },
          animatedStyle,
        ]}
      >
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.text }]}>
            Quick Actions
          </Text>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: theme.button }]}
            onPress={onClose}
          >
            <Text style={[styles.closeButtonText, { color: theme.buttonText }]}>
              ✕
            </Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.actionsContainer}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[styles.actionButton, { backgroundColor: theme.button }]}
              onPress={() => handleActionPress(action.action)}
            >
              <Text style={[styles.actionText, { color: theme.buttonText }]}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  panel: {
    position: "absolute",
    top: 0,
    width: PANEL_WIDTH,
    height: "100%",
    zIndex: 1000,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  rightPanel: {
    right: 0,
    borderLeftWidth: 1,
  },
  leftPanel: {
    left: 0,
    borderRightWidth: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  actionsContainer: {
    padding: 10,
  },
  actionButton: {
    padding: 12,
    borderRadius: 8,
    marginVertical: 4,
  },
  actionText: {
    fontSize: 16,
    textAlign: "center",
  },
});

export default QuickActionsPanel;
