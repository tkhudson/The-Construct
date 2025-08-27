import React, { useEffect } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
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
const PANEL_WIDTH = Math.min(380, SCREEN_WIDTH * 0.85);

const MapPanel = ({
  visible,
  onClose,
  children,
  theme,
  panelPosition = "right", // "right" or "left"
}) => {
  // Shared value for panel translation
  const closedX = panelPosition === "right" ? PANEL_WIDTH : -PANEL_WIDTH;
  const openX = 0;
  const translateX = useSharedValue(closedX);

  // Animate panel in/out based on visible prop
  useEffect(() => {
    translateX.value = withTiming(visible ? openX : closedX, { duration: 350 });
  }, [visible]);

  // Animated style for panel
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
      // Clamp so panel doesn't go too far open
      if (panelPosition === "right") {
        nextX = Math.min(nextX, openX);
        nextX = Math.max(nextX, closedX - 40); // allow a little overshoot
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
        // Swiped far enough to close
        translateX.value = withTiming(
          closedX,
          { duration: 250 },
          (finished) => {
            if (finished) runOnJS(onClose)();
          },
        );
      } else {
        // Snap back open
        translateX.value = withTiming(openX, { duration: 250 });
      }
    },
  });

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
          <View style={styles.panelContent}>{children}</View>
        </Animated.View>
      </PanGestureHandler>
      {/* Map Tab Button */}
      {!visible && (
        <TouchableOpacity
          style={[
            styles.tabButton,
            {
              right: panelPosition === "right" ? 0 : undefined,
              left: panelPosition === "left" ? 0 : undefined,
              backgroundColor: theme?.accent || "#7f9cf5",
            },
          ]}
          onPress={onClose}
        >
          <Ionicons name="map" size={24} color="#fff" />
          <Text style={styles.tabButtonText}>Map</Text>
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
  tabButton: {
    position: "absolute",
    top: 80,
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

export default MapPanel;
