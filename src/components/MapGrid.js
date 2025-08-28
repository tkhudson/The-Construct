import React, { useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  AccessibilityInfo,
} from "react-native";

/**
 * MapGrid Component
 * - Renders a 10x10 grid.
 * - Renders tokens (player, NPC, monster) on the grid.
 * - Handles cell clicks for token placement and movement.
 * - Optimized for performance with memoization and accessibility support.
 *
 * Props:
 *   tokens: Array of { id, type, x, y, label, color, imageUri }
 *   onPlaceToken: function(x, y) => void
 *   onMoveToken: function(tokenId, x, y) => void
 *   selectedTokenId: id of the currently selected token (for movement)
 *   theme: theme object for styling
 *   style: additional styling
 *   accessibilityLabel: custom accessibility label
 */
const GRID_SIZE = 10;

const defaultTokenColors = {
  player: "#7f9cf5",
  npc: "#7ed6a7",
  monster: "#f7c59f",
  unknown: "#b39ddb",
};

const getTokenColor = (type) => {
  return defaultTokenColors[type] || defaultTokenColors.unknown;
};

const getTokenLabel = (token) => {
  if (token.label) return token.label;
  switch (token.type) {
    case "player":
      return "Player character";
    case "npc":
      return "NPC";
    case "monster":
      return "Monster";
    default:
      return "Unknown token";
  }
};

const getTokenShortcut = (token) => {
  if (token.label) return token.label;
  switch (token.type) {
    case "player":
      return "P";
    case "npc":
      return "N";
    case "monster":
      return "M";
    default:
      return "?";
  }
};

const MapGrid = ({
  tokens = [],
  onPlaceToken,
  onMoveToken,
  selectedTokenId,
  theme,
  style,
  accessibilityLabel = "Tactical map grid",
}) => {
  // Memoize token position lookup for performance
  const tokenMap = useMemo(() => {
    const map = {};
    tokens.forEach((token) => {
      const key = `${token.x},${token.y}`;
      map[key] = token;
    });
    return map;
  }, [tokens]);

  // Memoize grid cells to prevent unnecessary re-renders
  const gridCells = useMemo(() => {
    return Array.from({ length: GRID_SIZE }, (_, y) =>
      Array.from({ length: GRID_SIZE }, (_, x) => {
        const key = `${x},${y}`;
        const token = tokenMap[key];
        return { x, y, token, key };
      }),
    );
  }, [tokenMap]);

  // Handle cell press with improved accessibility feedback
  const handleCellPress = useCallback(
    async (x, y) => {
      const key = `${x},${y}`;
      const token = tokenMap[key];

      if (selectedTokenId && !token) {
        // Move selected token here
        onMoveToken(selectedTokenId, x, y);
        await AccessibilityInfo.announceForAccessibility(
          `Moved token to position ${x + 1}, ${y + 1}`,
        );
      } else if (!token) {
        // Place new token
        onPlaceToken(x, y);
        await AccessibilityInfo.announceForAccessibility(
          `Placing token at position ${x + 1}, ${y + 1}`,
        );
      } else {
        // Token exists - selection handled in parent
        await AccessibilityInfo.announceForAccessibility(
          `Selected ${getTokenLabel(token)} at position ${x + 1}, ${y + 1}`,
        );
      }
    },
    [selectedTokenId, tokenMap, onPlaceToken, onMoveToken],
  );

  return (
    <View
      style={[styles.gridContainer, style]}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="grid"
      accessibilityHint="Use arrow keys or tap to navigate and place tokens on the grid"
    >
      {gridCells.map((row, rowIdx) => (
        <View key={rowIdx} style={styles.gridRow}>
          {row.map((cell) => {
            const token = cell.token;
            const isSelected = selectedTokenId === token?.id;
            const tokenColor = token ? getTokenColor(token.type) : null;

            return (
              <TouchableOpacity
                key={cell.key}
                style={[
                  styles.gridCell,
                  token && {
                    backgroundColor: tokenColor + "cc",
                    borderWidth: isSelected ? 3 : 1.5,
                    borderColor: isSelected ? "#fff" : tokenColor,
                  },
                ]}
                onPress={() => handleCellPress(cell.x, cell.y)}
                activeOpacity={0.7}
                accessible={true}
                accessibilityLabel={
                  token
                    ? `${getTokenLabel(token)} at position ${cell.x + 1}, ${cell.y + 1}${
                        isSelected ? ", selected" : ""
                      }`
                    : `Empty grid cell at position ${cell.x + 1}, ${cell.y + 1}`
                }
                accessibilityHint={
                  selectedTokenId && !token
                    ? "Tap to move selected token here"
                    : !token
                      ? "Tap to place new token here"
                      : "Double tap to select this token"
                }
                accessibilityRole="button"
              >
                {token ? (
                  <View style={styles.tokenContainer}>
                    {token.imageUri ? (
                      <Image
                        source={{ uri: token.imageUri }}
                        style={styles.tokenImage}
                        resizeMode="cover"
                        accessible={true}
                        accessibilityLabel={`Image of ${getTokenLabel(token)}`}
                        onError={() => {
                          // Fallback to text if image fails to load
                          console.warn(
                            `Failed to load image for token ${token.id}`,
                          );
                        }}
                      />
                    ) : (
                      <Text style={styles.tokenLabel} accessible={false}>
                        {getTokenShortcut(token)}
                      </Text>
                    )}
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  gridContainer: {
    alignSelf: "center",
    marginVertical: 16,
    backgroundColor: "#232946",
    borderRadius: 10,
    padding: 6,
    borderWidth: 2,
    borderColor: "#393e6e",
    // Prevent grid from being too large on mobile
    maxWidth: 380,
    width: "100%",
    aspectRatio: 1,
    // Shadow for depth
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  gridRow: {
    flexDirection: "row",
    flex: 1,
  },
  gridCell: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: 1.5,
    borderColor: "#393e6e",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#232946",
    minWidth: 0,
    minHeight: 0,
    // Add subtle shadow to cells
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  tokenContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#232946",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
    elevation: 3,
    overflow: "hidden",
    // Add subtle shadow to tokens
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  tokenImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  tokenLabel: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    textAlign: "center",
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default React.memo(MapGrid);
