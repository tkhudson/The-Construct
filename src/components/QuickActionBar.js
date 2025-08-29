import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

const QuickActionBar = ({
  onAction,
  context,
  theme,
  visible = true,
  character,
  combatActive = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("common");
  const fadeAnim = useState(new Animated.Value(visible ? 1 : 0))[0];
  const slideAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: expanded ? 1 : 0,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, [expanded]);

  const categories = {
    common: {
      icon: "flash",
      actions: [
        {
          id: "attack",
          label: "Attack",
          icon: "sword",
          action: "I attack with my {weapon}",
          color: "#ff6b6b",
          needsRoll: true,
          rollType: "attack",
        },
        {
          id: "defend",
          label: "Defend",
          icon: "shield",
          action: "I take a defensive stance and prepare to defend",
          color: "#4dabf7",
          needsRoll: false,
        },
        {
          id: "investigate",
          label: "Look",
          icon: "eye",
          action: "I carefully investigate my surroundings",
          color: "#51cf66",
          needsRoll: true,
          rollType: "perception",
        },
        {
          id: "talk",
          label: "Talk",
          icon: "chatbubbles",
          action: "I attempt to communicate with the nearest NPC",
          color: "#ffd43b",
          needsRoll: false,
        },
      ],
    },
    skills: {
      icon: "trending-up",
      actions: [
        {
          id: "perception",
          label: "Perception",
          icon: "search",
          action: "I look carefully around",
          color: "#845ef7",
        },
        {
          id: "stealth",
          label: "Stealth",
          icon: "eye-off",
          action: "I try to move stealthily",
          color: "#5c7cfa",
        },
        {
          id: "persuade",
          label: "Persuade",
          icon: "people",
          action: "I try to persuade",
          color: "#ff6b6b",
        },
        {
          id: "intimidate",
          label: "Intimidate",
          icon: "warning",
          action: "I try to intimidate",
          color: "#f03e3e",
        },
      ],
    },
    magic: {
      icon: "sparkles",
      actions: [
        {
          id: "cast",
          label: "Cast Spell",
          icon: "flame",
          action: "I cast",
          color: "#cc5de8",
        },
        {
          id: "detect",
          label: "Detect Magic",
          icon: "radio",
          action: "I detect magic",
          color: "#5f3dc4",
        },
        {
          id: "identify",
          label: "Identify",
          icon: "information-circle",
          action: "I identify",
          color: "#7950f2",
        },
        {
          id: "ritual",
          label: "Ritual",
          icon: "moon",
          action: "I perform a ritual",
          color: "#9775fa",
        },
      ],
    },
    items: {
      icon: "briefcase",
      actions: [
        {
          id: "use_item",
          label: "Use Item",
          icon: "medkit",
          action: "I use",
          color: "#40c057",
        },
        {
          id: "drink_potion",
          label: "Potion",
          icon: "flask",
          action: "I drink a potion",
          color: "#fa5252",
        },
        {
          id: "throw",
          label: "Throw",
          icon: "arrow-forward",
          action: "I throw",
          color: "#fd7e14",
        },
        {
          id: "equip",
          label: "Equip",
          icon: "shirt",
          action: "I equip",
          color: "#4c6ef5",
        },
      ],
    },
  };

  // Filter categories based on character class
  const getAvailableCategories = () => {
    const available = ["common", "skills"];

    if (
      character?.class &&
      ["Wizard", "Cleric", "Sorcerer", "Warlock"].includes(character.class)
    ) {
      available.push("magic");
    }

    if (character?.inventory && character.inventory.length > 0) {
      available.push("items");
    }

    return available;
  };

  const availableCategories = getAvailableCategories();

  const handleAction = useCallback(
    async (action) => {
      if (Platform.OS === "ios") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      // Process action template with context
      let contextualAction = action.action;

      if (character) {
        // Replace {weapon} with equipped weapon
        contextualAction = contextualAction.replace(
          "{weapon}",
          character.equippedWeapon?.name || "weapon",
        );
      }

      if (combatActive) {
        if (action.id === "attack") {
          contextualAction = `${contextualAction} the nearest enemy`;
        } else if (action.id === "defend") {
          contextualAction = `${contextualAction} against the nearest threat`;
        }
      }

      if (onAction) {
        onAction({
          text: contextualAction,
          type: action.id,
          category: selectedCategory,
          quickAction: true,
          needsRoll: action.needsRoll,
          rollType: action.rollType,
          context: {
            combatActive,
            character: character?.class,
            weapon: character?.equippedWeapon,
          },
        });
      }

      // Auto-collapse after action in combat
      if (combatActive) {
        setTimeout(() => setExpanded(false), 500);
      }
    },
    [onAction, selectedCategory, combatActive],
  );

  const handleCategoryChange = useCallback(async (category) => {
    if (Platform.OS === "ios") {
      await Haptics.selectionAsync();
    }
    setSelectedCategory(category);
  }, []);

  const toggleExpanded = useCallback(async () => {
    if (Platform.OS === "ios") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setExpanded(!expanded);
  }, [expanded]);

  const currentActions = categories[selectedCategory]?.actions || [];

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Main toggle button */}
      <TouchableOpacity
        style={[
          styles.toggleButton,
          { backgroundColor: theme?.accent || "#7f9cf5" },
        ]}
        onPress={toggleExpanded}
        activeOpacity={0.8}
      >
        <Ionicons name={expanded ? "close" : "flash"} size={24} color="#fff" />
      </TouchableOpacity>

      {/* Expanded panel */}
      <Animated.View
        style={[
          styles.expandedPanel,
          {
            backgroundColor: theme?.card || "#232946",
            borderColor: theme?.accent || "#7f9cf5",
            transform: [
              {
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [200, 0],
                }),
              },
            ],
            opacity: slideAnim,
          },
        ]}
      >
        {/* Category tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryTabs}
        >
          {availableCategories.map((categoryKey) => (
            <TouchableOpacity
              key={categoryKey}
              style={[
                styles.categoryTab,
                selectedCategory === categoryKey && styles.activeCategoryTab,
                selectedCategory === categoryKey && {
                  backgroundColor: theme?.accent || "#7f9cf5",
                },
              ]}
              onPress={() => handleCategoryChange(categoryKey)}
            >
              <Ionicons
                name={categories[categoryKey].icon}
                size={20}
                color={
                  selectedCategory === categoryKey
                    ? "#fff"
                    : theme?.text || "#eaeaea"
                }
              />
              <Text
                style={[
                  styles.categoryLabel,
                  {
                    color:
                      selectedCategory === categoryKey
                        ? "#fff"
                        : theme?.text || "#eaeaea",
                  },
                ]}
              >
                {categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Action grid */}
        <View style={styles.actionGrid}>
          {currentActions.map((action, index) => (
            <TouchableOpacity
              key={action.id}
              style={[
                styles.actionButton,
                {
                  backgroundColor: action.color + "20",
                  borderColor: action.color,
                },
              ]}
              onPress={() => handleAction(action)}
              activeOpacity={0.7}
            >
              <Ionicons name={action.icon} size={28} color={action.color} />
              <Text
                style={[
                  styles.actionLabel,
                  { color: theme?.text || "#eaeaea" },
                ]}
              >
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Context hints */}
        <View style={styles.contextHints}>
          {combatActive && (
            <Text
              style={[
                styles.contextHint,
                { color: theme?.accent || "#7f9cf5" },
              ]}
            >
              ⚔️ Combat Active - Quick actions available
            </Text>
          )}
          {character?.equippedWeapon && (
            <Text
              style={[styles.contextHint, { color: theme?.text || "#eaeaea" }]}
            >
              🗡️ Equipped: {character.equippedWeapon.name}
            </Text>
          )}
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 100,
    right: 20,
    zIndex: 100,
  },
  toggleButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    position: "absolute",
    bottom: 0,
    right: 0,
    zIndex: 101,
  },
  expandedPanel: {
    position: "absolute",
    bottom: 70,
    right: -10,
    width: 320,
    maxHeight: 400,
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  categoryTabs: {
    flexDirection: "row",
    marginBottom: 16,
    maxHeight: 40,
  },
  categoryTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: "transparent",
  },
  activeCategoryTab: {
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  categoryLabel: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "600",
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  actionButton: {
    width: "48%",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    marginBottom: 12,
  },
  actionLabel: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  contextHint: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
    opacity: 0.8,
  },
});

export default QuickActionBar;
