import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import sessionManager from "../utils/sessionManager";
import { useTheme } from "../theme/ThemeProvider";
import { getShadowStyle, getTextStyle } from "../theme/themeUtils";

/**
 * SessionManagerUI Component
 *
 * A comprehensive UI for managing game sessions including:
 * - Session listing with metadata
 * - Load/delete session functionality
 * - Session statistics
 * - Export options
 * - Session filtering
 */
const SessionManagerUI = ({ visible, onClose, onSessionSelected }) => {
  const { theme } = useTheme();

  // State management
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [filter, setFilter] = useState("all"); // all, active, completed, paused

  // Load sessions on mount
  useEffect(() => {
    if (visible) {
      loadSessions();
    }
  }, [visible]);

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      const allSessions = await sessionManager.getAllSessions();
      setSessions(allSessions || []);
    } catch (error) {
      console.error("Error loading sessions:", error);
      Alert.alert("Error", "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter sessions based on status
  const getFilteredSessions = () => {
    switch (filter) {
      case "active":
        return sessions.filter(s => s.status === "active");
      case "completed":
        return sessions.filter(s => s.status === "completed");
      case "paused":
        return sessions.filter(s => s.status === "paused");
      default:
        return sessions;
    }
  };

  const handleLoadSession = async (session) => {
    try {
      await sessionManager.loadSession(session.id);

      if (onSessionSelected) {
        onSessionSelected(session);
      }

      onClose();
    } catch (error) {
      console.error("Error loading session:", error);
      Alert.alert("Error", "Failed to load session");
    }
  };

  const handleDeleteSession = (session) => {
    Alert.alert(
      "Delete Session",
      `Are you sure you want to delete "${session.name || `Session ${session.id.slice(-6)}`}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => confirmDeleteSession(session),
        },
      ]
    );
  };

  const confirmDeleteSession = async (session) => {
    try {
      // Remove from AsyncStorage
      const updatedSessions = sessions.filter(s => s.id !== session.id);
      setSessions(updatedSessions);

      // For now, we'll just remove it from the list
      // In a full implementation, you'd also delete from AsyncStorage
      console.log("Session deleted:", session.id);
    } catch (error) {
      console.error("Error deleting session:", error);
      Alert.alert("Error", "Failed to delete session");
    }
  };

  const handleViewDetails = (session) => {
    setSelectedSession(session);
    // In a full implementation, you'd load detailed session info here
  };

  const handleExportSession = async (session, format = "json") => {
    try {
      await sessionManager.loadSession(session.id); // Load the session first

      const exportResult = await sessionManager.exportSession(format, {
        includeConversation: true,
      });

      if (exportResult.success) {
        Alert.alert(
          "Export Complete",
          `Session exported successfully${format === "share" ? " and shared" : "!"}`,
          [
            {
              text: "OK",
              onPress: () => {
                if (format !== "share") {
                  console.log("Export data:", exportResult.data);
                }
              },
            },
          ]
        );
      } else {
        Alert.alert("Export Failed", exportResult.error || "Unknown error");
      }
    } catch (error) {
      console.error("Export error:", error);
      Alert.alert("Error", "Failed to export session");
    }
  };

  const renderSessionItem = ({ item }) => {
    const isActive = item.status === "active";
    const isCompleted = item.status === "completed";

    return (
      <TouchableOpacity
        style={[
          styles.sessionCard,
          getShadowStyle(theme),
          {
            backgroundColor: theme?.card || "#232946",
            borderColor: isActive
              ? theme?.accent || "#7f9cf5"
              : theme?.border || "#393e6e",
            borderWidth: isActive ? 2 : 1,
          },
        ]}
        onPress={() => handleViewDetails(item)}
        activeOpacity={0.8}
      >
        <View style={styles.sessionHeader}>
          <View style={styles.sessionInfo}>
            <Text
              style={[styles.sessionName, { color: theme?.text || "#fff" }]}
              numberOfLines={1}
            >
              {item.name || `Session ${item.id?.slice(-6) || "Unknown"}`}
            </Text>
            <Text
              style={[styles.sessionMeta, { color: theme?.text + "80" || "#ccc" }]}
            >
              {item.theme || "Classic Fantasy"} • {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "Unknown date"}
            </Text>
          </View>

          <View style={styles.sessionStatus}>
            <Text
              style={[
                styles.statusBadge,
                {
                  backgroundColor: getStatusColor(item.status, theme),
                  color: "#fff",
                },
              ]}
            >
              {item.status || "unknown"}
            </Text>
          </View>
        </View>

        <View style={styles.sessionStats}>
          <View style={styles.stat}>
            <Ionicons
              name="time-outline"
              size={16}
              color={theme?.accent || "#7f9cf5"}
            />
            <Text style={[styles.statText, { color: theme?.text || "#fff" }]}>
              {item.playTime || item.totalPlayTime || 0}m
            </Text>
          </View>

          <View style={styles.stat}>
            <Ionicons
              name="trophy-outline"
              size={16}
              color={theme?.accent || "#7f9cf5"}
            />
            <Text style={[styles.statText, { color: theme?.text || "#fff" }]}>
              {item.xpEarned || 0} XP
            </Text>
          </View>

          {item.encountersCompleted && (
            <View style={styles.stat}>
              <Ionicons
                name="shield-outline"
                size={16}
                color={theme?.accent || "#7f9cf5"}
              />
              <Text style={[styles.statText, { color: theme?.text || "#fff" }]}>
                {item.encountersCompleted} fights
              </Text>
            </View>
          )}
        </View>

        <View style={styles.sessionActions}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: theme?.button || "#7f9cf5" },
            ]}
            onPress={() => handleLoadSession(item)}
            disabled={item.status === "active"}
          >
            <Ionicons
              name="download-outline"
              size={16}
              color={theme?.buttonText || "#fff"}
            />
            <Text
              style={[styles.actionText, { color: theme?.buttonText || "#fff" }]}
            >
              Load
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: theme?.accent || "#7f9cf5" },
            ]}
            onPress={() => handleExportSession(item, "json")}
          >
            <Ionicons
              name="share-outline"
              size={16}
              color={theme?.buttonText || "#fff"}
            />
            <Text
              style={[styles.actionText, { color: theme?.buttonText || "#fff" }]}
            >
              Export
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: "#b23b3b" },
            ]}
            onPress={() => handleDeleteSession(item)}
          >
            <Ionicons
              name="trash-outline"
              size={16}
              color="#fff"
            />
            <Text style={[styles.actionText, { color: "#fff" }]}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFilterButtons = () => {
    const filters = [
      { key: "all", label: "All", icon: "list-outline" },
      { key: "active", label: "Active", icon: "play-circle-outline" },
      { key: "completed", label: "Completed", icon: "checkmark-circle-outline" },
      { key: "paused", label: "Paused", icon: "pause-circle-outline" },
    ];

    return (
      <View style={styles.filterContainer}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterButton,
              {
                backgroundColor:
                  filter === f.key
                    ? theme?.accent || "#7f9cf5"
                    : theme?.button || "#393e6e",
              },
            ]}
            onPress={() => setFilter(f.key)}
          >
            <Ionicons
              name={f.icon}
              size={16}
              color={theme?.buttonText || "#fff"}
            />
            <Text
              style={[
                styles.filterText,
                { color: theme?.buttonText || "#fff" },
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const getStatusColor = (status, theme) => {
    switch (status) {
      case "active":
        return theme?.accent || "#7f9cf5";
      case "completed":
        return "#7ed6a7";
      case "paused":
        return "#f7c59f";
      default:
        return "#b39ddb";
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            { backgroundColor: theme?.background || "#1a1a2e" },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text
              style={[styles.title, { color: theme?.accent || "#7f9cf5" }]}
            >
              Session Manager
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <Ionicons
                name="close"
                size={24}
                color={theme?.text || "#fff"}
              />
            </TouchableOpacity>
          </View>

          {/* Filter buttons */}
          {renderFilterButtons()}

          {/* Session list */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { color: theme?.text || "#fff" }]}>
                Loading sessions...
              </Text>
            </View>
          ) : (
            <FlatList
              data={getFilteredSessions()}
              renderItem={renderSessionItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.sessionList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons
                    name="document-outline"
                    size={48}
                    color={theme?.text + "40" || "#666"}
                  />
                  <Text
                    style={[
                      styles.emptyText,
                      { color: theme?.text + "60" || "#999" },
                    ]}
                  >
                    No sessions found
                  </Text>
                </View>
              }
            />
          )}

          {/* Footer stats */}
          <View style={styles.footer}>
            <Text
              style={[styles.footerText, { color: theme?.text || "#fff" }]}
            >
              {getFilteredSessions().length} session
              {getFilteredSessions().length !== 1 ? "s" : ""} •
              Total XP: {sessions.reduce((sum, s) => sum + (s.xpEarned || 0), 0)}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  container: {
    height: "80%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  closeButton: {
    padding: 4,
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "600",
  },
  sessionList: {
    padding: 20,
    paddingTop: 0,
  },
  sessionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  sessionMeta: {
    fontSize: 14,
  },
  sessionStatus: {
    marginLeft: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  sessionStats: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 14,
  },
  sessionActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  footerText: {
    fontSize: 14,
    textAlign: "center",
  },
});

export default SessionManagerUI;
