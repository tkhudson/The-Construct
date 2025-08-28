import React, { useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
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
const PANEL_WIDTH = Math.min(380, SCREEN_WIDTH * 0.85);

const MapPanel = ({
  visible,
  onClose,
  onOpen,
  children,
  theme,
  panelPosition = "right", // "right" or "left"
  anyPanelOpen = false,
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

  // Manage focus and accessibility
  const handleClose = useCallback(async () => {
    if (Platform.OS === "ios" && HapticFeedback) {
      HapticFeedback.selection();
    }
    onClose();
    await AccessibilityInfo.announceForAccessibility("Map panel closed");
  }, [onClose]);

  const handleOpen = useCallback(async () => {
    if (Platform.OS === "ios" && HapticFeedback) {
      HapticFeedback.selection();
    }
    onOpen();
    await AccessibilityInfo.announceForAccessibility("Map panel opened");
  }, [onOpen]);

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
      {/* Overlay - only render when visible to prevent focus issues */}
      {visible && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={0.7}
          onPress={handleClose}
          accessible={true}
          accessibilityLabel="Close map panel overlay"
          accessibilityHint="Tap to close the map panel"
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
          accessibilityLabel="Map panel"
          {...(Platform.OS === "web"
            ? {
                "aria-hidden": !visible,
                "aria-modal": visible,
                "aria-labelledby": "map-panel-title",
              }
            : {})}
        >
          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            hitSlop={12}
            accessible={true}
            accessibilityLabel="Close map panel"
            accessibilityHint="Double tap to close the tactical map"
            nativeID="map-panel-close"
          >
            <Ionicons
              name="close"
              size={28}
              color={theme?.accent || "#7f9cf5"}
            />
          </TouchableOpacity>

          {/* Panel Content */}
          <View
            style={styles.panelContent}
            accessible={visible}
            accessibilityRole="main"
            nativeID="map-panel-content"
          >
            <Text
              nativeID="map-panel-title"
              style={[styles.panelTitle, { color: theme?.accent || "#7f9cf5" }]}
              accessible={false} // Already announced by parent
            >
              Tactical Map
            </Text>
            {children}
          </View>
        </Animated.View>
      </PanGestureHandler>

      {/* Map Tab Button - only render when panel is closed */}
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
          accessibilityLabel="Open tactical map"
          accessibilityHint="Double tap to open the tactical grid map for combat and exploration"
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
    zIndex: 25, // Increased to ensure it appears above other panels
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
    zIndex: 35, // Increased to ensure it appears above panel content
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
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  tabButton: {
    position: "absolute",
    top: 100, // Moved down slightly to avoid overlap with other panels
    zIndex: 35,
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

export default React.memo(MapPanel);
