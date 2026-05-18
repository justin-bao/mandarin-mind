import { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleProp,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, styles } from "../theme";

export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.md,
        backgroundColor: colors.primarySoft,
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <Ionicons name="language-outline" size={Math.round(size * 0.55)} color={colors.primary} />
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, { padding: 16 }, style]}>{children}</View>;
}

export function Button({
  children,
  variant = "primary",
  loading,
  disabled,
  style,
  textStyle,
  ...props
}: PressableProps & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
  textStyle?: StyleProp<TextStyle>;
}) {
  const isPrimary = variant === "primary";
  const isDanger = variant === "danger";
  const isTextOnly =
    typeof children === "string" ||
    typeof children === "number" ||
    (Array.isArray(children) && children.every((child) => typeof child === "string" || typeof child === "number"));
  return (
    <Pressable
      {...props}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          minHeight: 44,
          borderRadius: radius.md,
          paddingHorizontal: 14,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
          opacity: disabled || loading ? 0.55 : pressed ? 0.8 : 1,
          backgroundColor: isPrimary ? colors.primary : isDanger ? colors.danger : variant === "ghost" ? "transparent" : colors.muted,
          borderWidth: variant === "secondary" ? 1 : 0,
          borderColor: colors.border
        },
        style as ViewStyle
      ]}
    >
      {loading ? <ActivityIndicator color={isPrimary || isDanger ? colors.white : colors.foreground} /> : null}
      {isTextOnly ? (
        <Text
          style={[
            {
              color: isPrimary || isDanger ? colors.primaryForeground : colors.foreground,
              fontSize: 15,
              fontWeight: "700"
            },
            textStyle
          ]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

export function Field(props: TextInputProps) {
  const { style, ...rest } = props;
  return <TextInput {...rest} placeholderTextColor={colors.mutedForeground} style={[styles.input, style]} autoCapitalize="none" />;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "primary" | "success" | "warning" | "danger" }) {
  const background =
    tone === "primary"
      ? colors.primary
      : tone === "success"
        ? colors.success
        : tone === "warning"
          ? colors.warning
          : tone === "danger"
            ? colors.danger
            : colors.muted;
  const foreground = tone === "neutral" ? colors.foreground : colors.white;
  return (
    <View style={{ alignSelf: "flex-start", borderRadius: 999, backgroundColor: background, paddingHorizontal: 8, paddingVertical: 4 }}>
      <Text style={{ color: foreground, fontSize: 11, fontWeight: "700" }}>{children}</Text>
    </View>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <Card style={{ alignItems: "center", gap: 6 }}>
      <Text style={styles.h3}>{title}</Text>
      <Text style={[styles.muted, { textAlign: "center" }]}>{body}</Text>
    </Card>
  );
}
