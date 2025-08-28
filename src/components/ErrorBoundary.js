import React, { Component } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      errorId: Date.now(), // Unique ID for this error instance
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error details
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Store error details for debugging
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });

    // Optional: Send error to error reporting service
    // You can integrate with services like Sentry, Bugsnag, etc.
    // this.reportError(error, errorInfo);
  }

  reportError = (error, errorInfo) => {
    // Example: Send to error reporting service
    // In a real app, you'd integrate with Sentry, Rollbar, etc.
    const errorReport = {
      error: error.toString(),
      stack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: Platform.OS,
      appVersion: "1.0.0", // You can get this from package.json or app config
    };

    console.log("Error Report:", errorReport);
    // Send to your error reporting service here
  };

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  render() {
    if (this.state.hasError) {
      const { theme, fallbackComponent } = this.props;

      // Use custom fallback component if provided
      if (fallbackComponent) {
        return fallbackComponent(this.state.error, this.handleRetry);
      }

      // Default error UI
      return (
        <View
          style={[styles.container, { backgroundColor: theme?.card || "#232946" }]}
          accessible={true}
          accessibilityRole="alert"
          accessibilityLabel="Application error occurred"
        >
          <View style={styles.errorIcon}>
            <Ionicons
              name="alert-circle"
              size={64}
              color={theme?.accent || "#ff6b6b"}
            />
          </View>

          <Text
            style={[styles.errorTitle, { color: theme?.accent || "#ff6b6b" }]}
            accessible={true}
            accessibilityRole="header"
          >
            Oops! Something went wrong
          </Text>

          <Text
            style={[styles.errorMessage, { color: theme?.text || "#ffffff" }]}
            accessible={true}
            accessibilityRole="text"
          >
            {this.props.message ||
              "The application encountered an unexpected error. Don't worry, your progress has been saved."}
          </Text>

          {__DEV__ && this.state.error && (
            <View style={styles.errorDetails}>
              <Text
                style={[styles.errorDetailsTitle, { color: theme?.text || "#ffffff" }]}
              >
                Error Details (Development Mode):
              </Text>
              <Text
                style={[styles.errorDetailsText, { color: theme?.text || "#ffffff" }]}
                selectable={true}
              >
                {this.state.error.toString()}
              </Text>
            </View>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.retryButton,
                { backgroundColor: theme?.button || "#7f9cf5" },
              ]}
              onPress={this.handleRetry}
              accessible={true}
              accessibilityLabel="Retry"
              accessibilityHint="Try to reload the application"
            >
              <Ionicons
                name="refresh"
                size={20}
                color={theme?.buttonText || "#ffffff"}
                style={styles.buttonIcon}
              />
              <Text
                style={[
                  styles.retryButtonText,
                  { color: theme?.buttonText || "#ffffff" },
                ]}
              >
                Try Again
              </Text>
            </TouchableOpacity>

            {this.props.showReportButton && (
              <TouchableOpacity
                style={[
                  styles.reportButton,
                  { borderColor: theme?.border || "#7f9cf5" },
                ]}
                onPress={() => {
                  if (this.state.error && this.state.errorInfo) {
                    this.reportError(this.state.error, this.state.errorInfo);
                  }
                }}
                accessible={true}
                accessibilityLabel="Report error"
                accessibilityHint="Send error details to developers"
              >
                <Ionicons
                  name="bug"
                  size={16}
                  color={theme?.accent || "#7f9cf5"}
                  style={styles.buttonIcon}
                />
                <Text
                  style={[
                    styles.reportButtonText,
                    { color: theme?.accent || "#7f9cf5" },
                  ]}
                >
                  Report
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {this.props.showErrorId && this.state.errorId && (
            <Text
              style={[styles.errorId, { color: theme?.text || "#ffffff" }]}
              accessible={true}
            >
              Error ID: {this.state.errorId}
            </Text>
          )}
        </View>
      );
    }

    // No error, render children normally
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorIcon: {
    marginBottom: 24,
    opacity: 0.8,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  errorMessage: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
    opacity: 0.9,
  },
  errorDetails: {
    width: "100%",
    marginBottom: 24,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  errorDetailsTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
    opacity: 0.8,
  },
  errorDetailsText: {
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    opacity: 0.7,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
    // Shadow for depth
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  reportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 100,
  },
  reportButtonText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  buttonIcon: {
    marginRight: 8,
  },
  errorId: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
});

export default ErrorBoundary;
