import { StyleSheet } from "react-native";

export const colors = {
  background: "#f6f7f9",
  foreground: "#111318",
  card: "#eef0f3",
  border: "#dde1e7",
  muted: "#e5e8ed",
  mutedForeground: "#7b8493",
  primary: "#ed9b1f",
  primarySoft: "#f8ead2",
  primaryForeground: "#fafafa",
  success: "#26a269",
  warning: "#e5a50a",
  danger: "#d93434",
  white: "#ffffff"
};

export const radius = {
  sm: 6,
  md: 8,
  lg: 12
};

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  page: {
    padding: 16,
    gap: 16
  },
  row: {
    flexDirection: "row",
    alignItems: "center"
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md
  },
  title: {
    color: colors.foreground,
    fontSize: 28,
    fontWeight: "800"
  },
  h2: {
    color: colors.foreground,
    fontSize: 22,
    fontWeight: "700"
  },
  h3: {
    color: colors.foreground,
    fontSize: 17,
    fontWeight: "700"
  },
  body: {
    color: colors.foreground,
    fontSize: 15,
    lineHeight: 22
  },
  muted: {
    color: colors.mutedForeground,
    fontSize: 13,
    lineHeight: 19
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    color: colors.foreground,
    fontSize: 16
  }
});
