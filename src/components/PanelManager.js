import React, { createContext, useContext, useState, useCallback } from "react";
import { View, Dimensions } from "react-native";
import MapPanel from "./panels/MapPanel";
import DiceRollerPanel from "./panels/DiceRollerPanel";
import InventoryPanel from "./panels/InventoryPanel";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Panel configuration constants
const PANEL_CONFIGS = {
  map: {
    id: "map",
    position: "right",
    tabTop: 100,
    zIndex: 25,
  },
  dice: {
    id: "dice",
    position: "right",
    tabTop: 160,
    zIndex: 25,
  },
  inventory: {
    id: "inventory",
    position: "right",
    tabTop: 220,
    zIndex: 25,
  },
};

// Create context for panel management
const PanelContext = createContext({
  openPanel: () => {},
  closePanel: () => {},
  closeAllPanels: () => {},
  activePanel: null,
  isAnyPanelOpen: false,
});

// Hook to use panel context
export const usePanelManager = () => useContext(PanelContext);

/**
 * PanelManager Component
 *
 * Manages the positioning, z-index, and state of all side panels.
 * Ensures only one panel can be open at a time and provides consistent
 * positioning and accessibility support.
 *
 * Props:
 * - children: The main content to render (game screen, etc.)
 * - theme: Theme object for styling
 * - mapProps: Props to pass to MapPanel
 * - diceProps: Props to pass to DiceRollerPanel
 * - inventoryProps: Props to pass to InventoryPanel
 */
const PanelManager = ({
  children,
  theme,
  mapProps = {},
  diceProps = {},
  inventoryProps = {},
}) => {
  const [activePanel, setActivePanel] = useState(null);

  // Check if any panel is open
  const isAnyPanelOpen = activePanel !== null;

  // Open a specific panel (closes others automatically)
  const openPanel = useCallback((panelId) => {
    if (PANEL_CONFIGS[panelId]) {
      setActivePanel(panelId);
    }
  }, []);

  // Close a specific panel
  const closePanel = useCallback((panelId) => {
    if (activePanel === panelId) {
      setActivePanel(null);
    }
  }, [activePanel]);

  // Close all panels
  const closeAllPanels = useCallback(() => {
    setActivePanel(null);
  }, []);

  // Context value
  const contextValue = {
    openPanel,
    closePanel,
    closeAllPanels,
    activePanel,
    isAnyPanelOpen,
  };

  return (
    <PanelContext.Provider value={contextValue}>
      <View style={{ flex: 1, position: "relative" }}>
        {/* Main content */}
        {children}

        {/* Map Panel */}
        <MapPanel
          visible={activePanel === "map"}
          onClose={() => closePanel("map")}
          onOpen={() => openPanel("map")}
          panelPosition={PANEL_CONFIGS.map.position}
          anyPanelOpen={isAnyPanelOpen}
          theme={theme}
          {...mapProps}
        />

        {/* Dice Roller Panel */}
        <DiceRollerPanel
          visible={activePanel === "dice"}
          onClose={() => closePanel("dice")}
          onOpen={() => openPanel("dice")}
          panelPosition={PANEL_CONFIGS.dice.position}
          anyPanelOpen={isAnyPanelOpen}
          theme={theme}
          {...diceProps}
        />

        {/* Inventory Panel */}
        <InventoryPanel
          visible={activePanel === "inventory"}
          onClose={() => closePanel("inventory")}
          onOpen={() => openPanel("inventory")}
          panelPosition={PANEL_CONFIGS.inventory.position}
          anyPanelOpen={isAnyPanelOpen}
          theme={theme}
          {...inventoryProps}
        />
      </View>
    </PanelContext.Provider>
  );
};

// Hook for components to get panel management functions
export const usePanels = () => {
  const { openPanel, closePanel, closeAllPanels, activePanel, isAnyPanelOpen } =
    usePanelManager();

  return {
    openMap: () => openPanel("map"),
    closeMap: () => closePanel("map"),
    openDice: () => openPanel("dice"),
    closeDice: () => closePanel("dice"),
    openInventory: () => openPanel("inventory"),
    closeInventory: () => closePanel("inventory"),
    closeAll: closeAllPanels,
    isMapOpen: activePanel === "map",
    isDiceOpen: activePanel === "dice",
    isInventoryOpen: activePanel === "inventory",
    isAnyOpen: isAnyPanelOpen,
    activePanel,
  };
};

export default PanelManager;
