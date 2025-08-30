import { Animated, Easing } from 'react-native';

// Slide animation configurations
export const createSlideAnimation = (initialValue = -300) => {
  return {
    value: new Animated.Value(initialValue),
    config: {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    },
    reverseConfig: {
      toValue: initialValue,
      duration: 250,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }
  };
};

// Fade animation configurations
export const createFadeAnimation = (initialValue = 0) => {
  return {
    value: new Animated.Value(initialValue),
    config: {
      toValue: 1,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    },
    reverseConfig: {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }
  };
};

// Scale animation configurations
export const createScaleAnimation = (initialValue = 0.95) => {
  return {
    value: new Animated.Value(initialValue),
    config: {
      toValue: 1,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    },
    reverseConfig: {
      toValue: initialValue,
      duration: 150,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }
  };
};

// Animation sequences
export const sequences = {
  // Slide and fade in sequence
  slideInFade: (slideAnim, fadeAnim) => {
    return Animated.parallel([
      Animated.timing(slideAnim.value, slideAnim.config),
      Animated.timing(fadeAnim.value, fadeAnim.config)
    ]);
  },

  // Slide and fade out sequence
  slideOutFade: (slideAnim, fadeAnim) => {
    return Animated.parallel([
      Animated.timing(slideAnim.value, slideAnim.reverseConfig),
      Animated.timing(fadeAnim.value, fadeAnim.reverseConfig)
    ]);
  },

  // Pop in sequence (scale and fade)
  popIn: (scaleAnim, fadeAnim) => {
    return Animated.parallel([
      Animated.timing(scaleAnim.value, scaleAnim.config),
      Animated.timing(fadeAnim.value, fadeAnim.config)
    ]);
  },

  // Pop out sequence (scale and fade)
  popOut: (scaleAnim, fadeAnim) => {
    return Animated.parallel([
      Animated.timing(scaleAnim.value, scaleAnim.reverseConfig),
      Animated.timing(fadeAnim.value, fadeAnim.reverseConfig)
    ]);
  }
};

// Utility functions for common animations
export const animationUtils = {
  // Create style for sliding panel
  getSlideTransform: (slideAnim, direction = 'right') => {
    const transform = direction === 'right'
      ? [{ translateX: slideAnim.value }]
      : [{ translateX: Animated.multiply(slideAnim.value, new Animated.Value(-1)) }];

    return {
      transform,
      opacity: slideAnim.value.interpolate({
        inputRange: [-300, 0],
        outputRange: [0, 1]
      })
    };
  },

  // Create style for fading view
  getFadeStyle: (fadeAnim) => ({
    opacity: fadeAnim.value
  }),

  // Create style for scaling view
  getScaleStyle: (scaleAnim) => ({
    transform: [{ scale: scaleAnim.value }]
  }),

  // Create combined styles for pop animation
  getPopStyle: (scaleAnim, fadeAnim) => ({
    transform: [{ scale: scaleAnim.value }],
    opacity: fadeAnim.value
  })
};

// Button press animation
export const createPressAnimation = (scaleValue = new Animated.Value(1)) => {
  const pressIn = () => {
    Animated.timing(scaleValue, {
      toValue: 0.95,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const pressOut = () => {
    Animated.timing(scaleValue, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  return {
    scaleValue,
    pressIn,
    pressOut,
    style: {
      transform: [{ scale: scaleValue }]
    }
  };
};
