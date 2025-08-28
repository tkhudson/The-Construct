import React, { useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Platform,
  AccessibilityInfo,
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

const groupItemsByType = (items) => {
  const groups = {};
  items.forEach((item) => {
    const type = item.type || "Other";
    if (!groups[type]) groups[type] = [];
    groups[type].push(item);
  });
  return groups;
};

const InventoryPanel = ({
  visible,
  onClose,
  onOpen,
  inventory = [],
  theme,
  panelPosition = "right", // "right" or "left"
  anyPanelOpen = false,
  onUseItem,
  onDropItem,
}) => {
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

  // Memoize grouped inventory for performance
  const grouped = useMemo(() => groupItemsByType(inventory), [inventory]);

  // Manage focus and accessibility
  const handleClose = useCallback(async () => {
    if (Platform.OS === "ios" && HapticFeedback) {
      HapticFeedback.selection();
    }
    onClose();
    await AccessibilityInfo.announceForAccessibility("Inventory closed");
  }, [onClose]);

  const handleOpen = useCallback(async () => {
    if (Platform.OS === "ios" && HapticFeedback) {
      HapticFeedback.selection();
    }
    onOpen();
    await AccessibilityInfo.announceForAccessibility("Inventory opened");
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
          accessibilityLabel="Close inventory overlay"
          accessibilityHint="Tap to close the inventory panel"
          // Use style.pointerEvents for web compatibility
          {...(Platform.OS === "web"
            ? { style: [styles.overlay, { pointerEvents: "auto" }] }
            : {})}
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
              ...(Platform.OS === "web"
                ? { boxShadow: "0 4px 16px rgba(0,0,0,0.18)" }
                : {}),
            },
          ]}
          accessible={visible}
          accessibilityRole="dialog"
          accessibilityLabel="Inventory panel"
          {...(Platform.OS === "web"
            ? {
                "aria-hidden": !visible,
                "aria-modal": visible,
                "aria-labelledby": "inventory-panel-title",
              }
            : {})}
        >
          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            hitSlop={12}
            accessible={true}
            accessibilityLabel="Close inventory"
            accessibilityHint="Double tap to close the inventory panel"
            nativeID="inventory-panel-close"
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
            nativeID="inventory-panel-content"
          >
            <Text nativeID="inventory-panel-title" style={styles.panelTitle}>
              Inventory
            </Text>
            <ScrollView
              style={styles.inventoryScroll}
              contentContainerStyle={{ paddingBottom: 12 }}
            >
              {inventory.length === 0 && (
                <Text
                  style={{ color: "#aaa", textAlign: "center", marginTop: 8 }}
                  accessible={true}
                  accessibilityRole="text"
                >
                  Your inventory is empty.
                </Text>
              )}
              {Object.keys(grouped).map((type) => (
                <View key={type} style={styles.groupSection}>
                  <Text
                    style={{
                      color: theme?.accent || "#7f9cf5",
                      fontWeight: "bold",
                      fontSize: 15,
                      marginBottom: 4,
                      marginTop: 10,
                    }}
                    accessible={true}
                    accessibilityRole="header"
                    accessibilityLevel={3}
                  >
                    {type} ({grouped[type].length} items)
                  </Text>
                  {grouped[type].map((item) => (
                    <View key={item.id} style={styles.itemRow}>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: theme?.text || "#fff",
                            fontWeight: "bold",
                          }}
                          accessible={true}
                        >
                          {item.name}
                          {item.quantity > 1 ? ` x${item.quantity}` : ""}
                        </Text>
                        {item.description && (
                          <Text
                            style={{ color: "#aaa", fontSize: 13 }}
                            accessible={true}
                          >
                            {item.description}
                          </Text>
                        )}
                      </View>
                      {onUseItem && (
                        <TouchableOpacity
                          style={[
                            styles.actionButton,
                            { backgroundColor: theme?.button || "#7ed6a7" },
                          ]}
                          onPress={useCallback(() => {
                            onUseItem(item);
                            AccessibilityInfo.announceForAccessibility(
                              `Used ${item.name}`,
                            );
                          }, [item, onUseItem])}
                          accessible={true}
                          accessibilityLabel={`Use ${item.name}`}
                          accessibilityHint={`Use this item from your inventory`}
                        >
                          <Text
                            style={{
                              color: theme?.buttonText || "#232946",
                              fontSize: 13,
                            }}
                          >
                            Use
                          </Text>
                        </TouchableOpacity>
                      )}
                      {onDropItem && (
                        <TouchableOpacity
                          style={[
                            styles.actionButton,
                            { backgroundColor: "#b23b3b" },
                          ]}
                          onPress={useCallback(() => {
                            onDropItem(item);
                            AccessibilityInfo.announceForAccessibility(
                              `Dropped ${item.name}`,
                            );
                          }, [item, onDropItem])}
                          accessible={true}
                          accessibilityLabel={`Drop ${item.name}`}
                          accessibilityHint={`Remove this item from your inventory`}
                        >
                          <Text
                            style={{
                              color: "#fff",
                              fontSize: 13,
                            }}
                          >
                            Drop
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </Animated.View>
      </PanGestureHandler>
      {/* Inventory Tab Button - only render when panel is closed */}
      {!visible && !anyPanelOpen && (
        <TouchableOpacity
          style={[
            styles.tabButton,
            {
              right: panelPosition === "right" ? 0 : undefined,
              left: panelPosition === "left" ? 0 : undefined,
              backgroundColor: theme?.accent || "#7f9cf5",
              ...(Platform.OS === "web"
                ? { boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }
                : {}),
            },
          ]}
          onPress={handleOpen}
          accessible={true}
          accessibilityLabel={`Open inventory${inventory.length > 0 ? ` (${inventory.length} items)` : ""}`}
          accessibilityHint="Double tap to open your inventory panel"
        >
          <Ionicons name="bag" size={24} color="#fff" />
          <Text style={styles.tabButtonText}>Inventory</Text>
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
    // shadow* props are kept for native, but web uses boxShadow above
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
  actionButton: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 44,
    minHeight: 28,
    elevation: 1,
  },
  inventoryScroll: {
    flex: 1,
    marginTop: 2,
    maxHeight: 340,
  },
  groupSection: {
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    paddingVertical: 4,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderColor: "#393e6e",
    borderStyle: "dotted",
  },
  actionButton: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 44,
    minHeight: 28,
    elevation: 1,
  },
  tabButton: {
    position: "absolute",
    top: 200,
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
    // shadow* props are kept for native, but web uses boxShadow above
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

export default React.memo(InventoryPanel);
