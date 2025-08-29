import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

const quickActions = [
  {
    id: 'look',
    label: 'Look Around',
    text: 'I look around and observe my surroundings carefully.',
    icon: '👀'
  },
  {
    id: 'talk',
    label: 'Talk',
    text: 'I attempt to communicate with the nearest character.',
    icon: '💬'
  },
  {
    id: 'search',
    label: 'Search',
    text: 'I search the area thoroughly for anything interesting or valuable.',
    icon: '🔍'
  },
  {
    id: 'listen',
    label: 'Listen',
    text: 'I listen carefully for any sounds or conversations.',
    icon: '👂'
  }
];

const QuickActions = ({ onActionSelected, theme }) => {
  return (
    <View style={styles.container}>
      {quickActions.map((action) => (
        <TouchableOpacity
          key={action.id}
          style={[
            styles.actionButton,
            { backgroundColor: theme?.button || '#7f9cf5' }
          ]}
          onPress={() => onActionSelected(action.text)}
        >
          <Text style={[styles.actionText, { color: theme?.buttonText || '#fff' }]}>
            {action.icon} {action.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-evenly',
    padding: 8,
    gap: 8
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: '45%',
    alignItems: 'center'
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600'
  }
});

export default QuickActions;
