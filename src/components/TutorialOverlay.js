import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const TutorialOverlay = ({ step = 0, onNext, onSkip, theme }) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true
      })
    ]).start();
  }, [step]);

  const tutorialSteps = [
    {
      target: 'chat',
      title: 'Welcome to The Construct!',
      message: 'Type your actions here to interact with the AI Dungeon Master. Be descriptive and creative!',
      position: { bottom: 120, left: 20, right: 20 },
      icon: 'chatbubbles-outline'
    },
    {
      target: 'dice',
      title: 'Rolling Dice',
      message: 'When the DM asks for a roll, use the dice panel or quick roll buttons. Natural 20s are critical hits!',
      position: { top: 140, right: 20, width: 280 },
      icon: 'dice-outline'
    },
    {
      target: 'quick-actions',
      title: 'Quick Actions',
      message: 'Use these buttons for common actions like attacking, searching, or talking to NPCs.',
      position: { bottom: 180, right: 20, width: 280 },
      icon: 'flash-outline'
    },
    {
      target: 'map',
      title: 'Tactical Map',
      message: 'During combat or exploration, use the map to track positions and plan your moves.',
      position: { top: 100, left: 20, width: 280 },
      icon: 'map-outline'
    }
  ];

  const currentStep = tutorialSteps[step] || tutorialSteps[0];

  return (
    <View style={styles.container}>
      {/* Semi-transparent overlay */}
      <Animated.View
        style={[
          styles.overlay,
          { opacity: fadeAnim }
        ]}
      />

      {/* Tutorial tooltip */}
      <Animated.View
        style={[
          styles.tooltip,
          currentStep.position,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons
            name={currentStep.icon}
            size={32}
            color={theme?.accent || '#7f9cf5'}
          />
        </View>

        {/* Content */}
        <Text style={[
          styles.title,
          { color: theme?.text || '#eaeaea' }
        ]}>
          {currentStep.title}
        </Text>

        <Text style={[
          styles.message,
          { color: theme?.text || '#eaeaea' }
        ]}>
          {currentStep.message}
        </Text>

        {/* Progress dots */}
        <View style={styles.progressDots}>
          {tutorialSteps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor: index === step ?
                    (theme?.accent || '#7f9cf5') :
                    (theme?.border || '#393e6e')
                }
              ]}
            />
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.buttons}>
          <TouchableOpacity
            onPress={onSkip}
            style={[
              styles.skipButton,
              { borderColor: theme?.border || '#393e6e' }
            ]}
          >
            <Text style={[
              styles.skipText,
              { color: theme?.text || '#eaeaea' }
            ]}>
              Skip Tutorial
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onNext}
            style={[
              styles.nextButton,
              { backgroundColor: theme?.accent || '#7f9cf5' }
            ]}
          >
            <Text style={[
              styles.nextText,
              { color: theme?.buttonText || '#fff' }
            ]}>
              {step < tutorialSteps.length - 1 ? 'Next' : 'Start Playing'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: '#232946',
    borderRadius: 16,
    padding: 20,
    maxWidth: SCREEN_WIDTH - 40,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2a2d3e',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  message: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 20,
    opacity: 0.9,
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  nextButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  nextText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default TutorialOverlay;
