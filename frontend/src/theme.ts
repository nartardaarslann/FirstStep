// Design tokens for this app. Light theme only.Always modify the colors and theme to Dark, Light or Dark and Light according to the design guidelines.
//
// The keys match the "color" block of /app/design_guidelines.json. Fill the
// values from that file (or from the user's brand colors). Keep every key; do
// not add a second theme or colors file; do not write color literals in
// components.
//
// How the names work: a plain key is a background, and its `on` partner is the
// text or icon color that sits on top of it. Always use them as a pair.
//   <View style={{ backgroundColor: colors.brandPrimary }}>
//     <Text style={{ color: colors.onBrandPrimary }}>Continue</Text>
//   </View>
//
// Styling a screen or component: build the sheet with makeStyles so colors
// and layout live together and follow the active scheme:
//   const useStyles = makeStyles((colors) => ({
//     card: { backgroundColor: colors.surfaceSecondary, padding: 16 },
//     title: { color: colors.onSurfaceSecondary, fontSize: 16 },
//   }));
//   function Screen() {
//     const styles = useStyles();
//     return <View style={styles.card}><Text style={styles.title}>Hi</Text></View>;
//   }
// For color props that are not styles (icon color, placeholderTextColor,
// ActivityIndicator) read useTheme().colors inside the component.
// Never call StyleSheet.create with color values at module level; it cannot
// follow the scheme.
//
// To support dark mode later: add `dark` to `themes` with every key filled.
// Nothing else changes; the device setting takes over automatically.
// Feel free to add as many new colors as you need to support the design guidelines.

import { useMemo, useSyncExternalStore } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  // ---------------------------------------------------------------------------
  // Surfaces: backgrounds, from the screen down to small fills.
  // Each `on` key is the text and icon color for that background.
  // ---------------------------------------------------------------------------
  surface: "#F8F9F5", // primary canvas, most of every screen
  onSurface: "#253E35", // text and icons on the canvas
  surfaceSecondary: "#FFFFFF", // cards, sheets, list rows
  onSurfaceSecondary: "#253E35", // text and icons on cards, sheets, rows
  surfaceTertiary: "#EFF2EC", // input backgrounds, chips, deepest nesting
  onSurfaceTertiary: "#627169", // text on inputs and chips; also muted text
  surfaceInverse: "#253E35", // tooltips, snackbars, anything popping against the theme
  onSurfaceInverse: "#FFFFFF", // text and icons on the inverse surface
  muted: "#7B847C", // subdued text on surface: captions, timestamps, placeholders

  // ---------------------------------------------------------------------------
  // Brand: the identity color and the fills built from it.
  // Neutral by default; replace with the design guidelines values.
  // ---------------------------------------------------------------------------
  brand: "#355D4B", // base hue, anchor only; Primary, Secondary, Tertiary are weights of it
  onBrand: "#FFFFFF", // text and icons placed directly on brand
  brandPrimary: "#355D4B", // primary CTA, active tab indicator, selected states
  onBrandPrimary: "#FFFFFF", // text and icons on brandPrimary
  brandSecondary: "#DDEBE0", // secondary CTA, less prominent accents
  onBrandSecondary: "#355D4B", // text and icons on brandSecondary
  brandTertiary: "#EAF1E8", // chips, tags, badges, subtle brand moments
  onBrandTertiary: "#355D4B", // text and icons on brandTertiary

  // ---------------------------------------------------------------------------
  // Status: semantic only, never decorative. Fill for badges, banners and
  // toasts; the `on` key is text on that fill. The plain key is also safe as
  // text on `surface`.
  // ---------------------------------------------------------------------------
  success: "#A3CBB5",
  onSuccess: "#294D3B",
  warning: "#F1CFAF",
  onWarning: "#77563D",
  error: "#DEA396",
  onError: "#683F37",
  info: "#DCD6EC",
  onInfo: "#635675",

  // ---------------------------------------------------------------------------
  // Lines
  // ---------------------------------------------------------------------------
  border: "#E4E8DF", // hairline outline, 0.5pt or 1pt max: inputs, cards
  borderStrong: "#9DB3A3", // focus rings, selected outlines, 1.5pt max
  divider: "#E8EBE3", // subtle list separators
  mint: "#E3EFE5", peach: "#F7E9DB", lavender: "#EEE9F5",
  water: "#E2ECF0", onWater: "#527888", transparent: "transparent",
  overlay: "#182C2566", shadow: "#294D3B12", glow: "#A3CBB530",
};

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;

export const themes: { light: ThemeColors; dark?: ThemeColors } = { light, dark: {
  ...light, surface: '#182A24', onSurface: '#E8EFE6', surfaceSecondary: '#22392F', onSurfaceSecondary: '#E8EFE6',
  surfaceTertiary: '#2A4036', onSurfaceTertiary: '#B5C7B9', muted: '#A5B5A8',
  brandPrimary: '#B5D6BC', onBrandPrimary: '#203B2B', brand: '#B5D6BC',
  brandSecondary: '#344D3D', onBrandSecondary: '#D4E8D6', brandTertiary: '#2A4234', onBrandTertiary: '#D4E8D6',
  mint: '#2B4736', peach: '#493F31', lavender: '#3E384D', water: '#2C424A', onWater: '#BDDAE5',
  border: '#3B4E40', borderStrong: '#789580', divider: '#3B4E40', onInfo: '#DCD6EC',
} };

// In-app theme toggle, only after `dark` exists in `themes`. Call
// setColorScheme("dark"), setColorScheme("light"), or setColorScheme(null) to
// follow the device. Every useTheme() consumer re-renders. Persisting the
// choice and re-applying it on launch is the toggle's job.
let schemeOverride: ColorScheme | null = 'light';
const themeListeners = new Set<() => void>();
const subscribeTheme = (listener: () => void) => { themeListeners.add(listener); return () => { themeListeners.delete(listener); }; };
export function setColorScheme(scheme: ColorScheme | null) {
  // RN 0.86 re-reads the device scheme only for the literal "unspecified";
  // null would pin useColorScheme() to null and the app to light.
  Appearance.setColorScheme?.(scheme ?? "unspecified");
  schemeOverride = scheme;
  themeListeners.forEach(listener => listener());
}

// Keep native surfaces (alerts, pickers, navigation chrome) on the schemes this
// app ships: light only forces light; once `dark` exists the device decides.
// Optional call because react-native-web does not implement it.
setColorScheme?.(defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const override = useSyncExternalStore(subscribeTheme, () => schemeOverride, () => defaultScheme);
  const requested = override ?? system;
  const scheme: ColorScheme = (requested === 'light' || requested === 'dark') && themes[requested] ? requested : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

// Themed StyleSheet: returns a hook that builds the sheet from the active
// scheme's colors and memoizes it until the scheme changes.
export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}


