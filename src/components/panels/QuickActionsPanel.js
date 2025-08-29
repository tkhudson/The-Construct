import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { rollD20 } from "../../utils/diceRoller";

const QuickActionsPanel = ({
  visible,
  onClose,
  onOpen,
  theme,
  panelPosition = "right",
  anyPanelOpen,
  onAction,
}) => {
  if (!visible) return null;

  const quickActions = [
    {
      id: "look",
      label: "[EYE] Look Around",
      action: "I carefully observe my surroundings",
      needsRoll: false,
    },
    {
      id: "stealth",
      label: "[HOOD] Enter Stealth",
      action: "I attempt to move stealthily",
      needsRoll: true,
      rollType: "stealth",
    },
    {
      id: "speak",
      label: "[CHAT] Speak",
      action: "I attempt to communicate",
      needsRoll: false,
    },
    {
      id: "attack",
      label: "[SWORD] Quick Attack",
      action: "I make a quick attack",
      needsRoll: true,
      rollType: "attack",
    },
    {
      id: "investigate",
      label: "[SEARCH] Investigate",
      action: "I investigate the area more closely",
      needsRoll: false,
    },
    {
      id: "persuade",
      label: "[MASK] Persuade",
      action: "I try to persuade",
      needsRoll: true,
      rollType: "persuasion",
    },
    {
      id: "intimidate",
      label: "[FIST] Intimidate",
      action: "I attempt to intimidate",
      needsRoll: true,
      rollType: "intimidation",
    },
    {
      id: "perception",
      label: "[LENS] Perception Check",
      action: "I make a perception check",
      needsRoll: true,
      rollType: "perception",
    },
  ];

  const handleActionPress = (action) => {
    if (action.needsRoll) {
      const roll = rollD20(0); // Add modifier logic later
      onAction(`${action.action} (${action.rollType} check: ${roll})`);
    } else {
      onAction(action.action);
    }
  };

  return (
    <View
      style={[
        styles.panel,
        panelPosition === "right" ? styles.rightPanel : styles.leftPanel,
        { backgroundColor: theme.card },
      ]}
    >
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Quick Actions</Text>
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
            onPress={() => handleActionPress(action)}
          >
            <Text style={[styles.actionText, { color: theme.buttonText }]}>
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    position: "absolute",
    top: 0,
    width: 250,
    height: "100%",
    zIndex: 1000,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  rightPanel: {
    right: 0,
  },
  leftPanel: {
    left: 0,
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
