import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";

/**
 * MapGrid Component
 * - Renders a 10x10 grid.
 * - Renders tokens (player, NPC, monster) on the grid.
 * - Handles cell clicks for token placement and movement.
 *
 * Props:
 *   tokens: Array of { id, type, x, y, label, color }
 *   onPlaceToken: function(x, y) => void
 *   onMoveToken: function(tokenId, x, y) => void
 *   selectedTokenId: id of the currently selected token (for movement)
 */
const GRID_SIZE = 10;

const defaultTokenColors = {
  player: "#7f9cf5",
  npc: "#7ed6a7",
  monster: "#f7c59f",
  unknown: "#b39ddb",
};

function getTokenColor(type) {
  return defaultTokenColors[type] || defaultTokenColors.unknown;
}

const MapGrid = ({
  tokens = [],
  onPlaceToken,
  onMoveToken,
  selectedTokenId,
  style,
}) => {
  // Build a 2D array for grid cells
  const grid = Array.from({ length: GRID_SIZE }, (_, y) =>
    Array.from({ length: GRID_SIZE }, (_, x) => {
      const token = tokens.find((t) => t.x === x && t.y === y);
      return { x, y, token };
    }),
  );

  // Handle cell press
  const handleCellPress = (x, y) => {
    const token = tokens.find((t) => t.x === x && t.y === y);
    if (selectedTokenId && !token) {
      // Move selected token here
      onMoveToken(selectedTokenId, x, y);
    } else if (!token) {
      // Place new token
      onPlaceToken(x, y);
    }
    // If token exists, selection is handled in parent (not here)
  };

  return (
    <View style={[styles.gridContainer, style]}>
      {grid.map((row, rowIdx) => (
        <View key={rowIdx} style={styles.gridRow}>
          {row.map((cell) => (
            <TouchableOpacity
              key={`${cell.x},${cell.y}`}
              style={[
                styles.gridCell,
                cell.token && {
                  backgroundColor: getTokenColor(cell.token.type) + "cc",
                  borderWidth: selectedTokenId === cell.token?.id ? 3 : 1.5,
                  borderColor:
                    selectedTokenId === cell.token?.id
                      ? "#fff"
                      : getTokenColor(cell.token.type),
                },
              ]}
              onPress={() => handleCellPress(cell.x, cell.y)}
              activeOpacity={0.7}
            >
              {cell.token ? (
                <View style={styles.tokenContainer}>
                  {cell.token.imageUri ? (
                    <Image
                      source={{ uri: cell.token.imageUri }}
                      style={styles.tokenImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={styles.tokenLabel}>
                      {cell.token.label ||
                        (cell.token.type === "player"
                          ? "P"
                          : cell.token.type === "npc"
                            ? "N"
                            : cell.token.type === "monster"
                              ? "M"
                              : "?")}
                    </Text>
                  )}
                </View>
              ) : null}
            </TouchableOpacity>
          ))}
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
    elevation: 2,
    overflow: "hidden",
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
  },
});

export default MapGrid;
