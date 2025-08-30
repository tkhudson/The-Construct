import React from 'react';
import { Animated, TouchableOpacity, Text, StyleSheet } from 'react-native';

const AnimatedButton = ({
  onPress,
  style,
  textStyle,
  children,
  disabled = false,
  animationDuration = 100,
  scaleAmount = 0.95,
  fadeAmount = 0.8,
}) => {
  const scaleAnim = new Animated.Value(1);
  const fadeAnim = new Animated.Value(1);

  const animate = (direction = 'in') => {
    const toScale = direction === 'in' ? scaleAmount : 1;
    const toFade = direction === 'in' ? fadeAmount : 1;

    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: toScale,
        duration: animationDuration,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: toFade,
        duration: animationDuration,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressIn = () => {
    animate('in');
  };

  const handlePressOut = () => {
    animate('out');
  };

  const handlePress = () => {
    if (onPress) {
      animate('in');
      onPress();
      setTimeout(() => animate('out'), animationDuration);
    }
  };

  return (
    <Animated.View
      style={[
        {
          transform: [{ scale: scaleAnim }],
          opacity: fadeAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.button, style]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={1}
      >
        {typeof children === 'string' ? (
          <Text style={[styles.text, textStyle]}>{children}</Text>
        ) : (
          children
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4a69bd',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  text: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default React.memo(AnimatedButton);
