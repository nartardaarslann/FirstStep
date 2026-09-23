import React from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View, ViewStyle, StyleProp, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { makeStyles, useTheme } from '@/src/theme';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];
export function Icon({ name, size = 22, color }: { name: IconName; size?: number; color?: string }) {
  const { colors } = useTheme(); return <Ionicons name={name} size={size} color={color || colors.onSurface} />;
}
export function Button({ title, onPress, testID, icon, secondary, loading, disabled }: { title: string; onPress: () => void; testID: string; icon?: IconName; secondary?: boolean; loading?: boolean; disabled?: boolean }) {
  const s = useStyles(); const { colors } = useTheme();
  return <Pressable accessibilityRole="button" testID={testID} onPress={onPress} disabled={disabled || loading} style={({ pressed }) => [s.button, secondary && s.secondary, (disabled || loading) && s.disabled, pressed && s.pressed]}>
    {loading ? <ActivityIndicator color={secondary ? colors.brandPrimary : colors.onBrandPrimary} /> : <>{icon && <Icon name={icon} size={20} color={secondary ? colors.onSurface : colors.onBrandPrimary} />}<Text style={[s.buttonText, secondary && s.secondaryText]}>{title}</Text></>}
  </Pressable>;
}
export function IconButton({ icon, onPress, testID, label }: { icon: IconName; onPress: () => void; testID: string; label?: string }) {
  const s = useStyles(); return <Pressable testID={testID} accessibilityLabel={label || testID} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.iconButton, pressed && s.pressed]}><Icon name={icon} /></Pressable>;
}
export function Field({ label, testID, ...props }: React.ComponentProps<typeof TextInput> & { label?: string }) {
  const s = useStyles(); const { colors } = useTheme(); return <View style={s.fieldWrap}>{label && <Text style={s.label}>{label}</Text>}<TextInput {...props} testID={testID} placeholderTextColor={colors.muted} style={[s.field, props.multiline && s.multiline, props.style]} /></View>;
}
export function Sheet({ title, children, onClose, testID, footer }: { title: string; children: React.ReactNode; onClose: () => void; testID: string; footer?: React.ReactNode }) {
  const s = useStyles(); const insets = useSafeAreaInsets(); const { height } = useWindowDimensions();
  return <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.sheetBackdrop}>
      <Pressable testID={`${testID}-backdrop`} onPress={onClose} style={s.backdropTap} accessibilityLabel="Pencereyi kapat" />
      <View testID={testID} style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 20), height: height - insets.top - 44, maxHeight: '94%' }]}>
        <View style={s.handle} /><View style={s.sheetTitle}><Text style={s.h2}>{title}</Text><IconButton icon="close" onPress={onClose} testID={`${testID}-close`} /></View>
        <ScrollView testID={`${testID}-scroll`} style={s.sheetScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={s.sheetContent}>{children}</ScrollView>
        {footer && <View style={s.sheetFooter}>{footer}</View>}
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
export function Card({ children, style, testID }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; testID?: string }) {
  const s = useStyles(); return <View testID={testID} style={[s.card, style]}>{children}</View>;
}
export function Badge({ text, tone = 'mint' }: { text: string; tone?: 'mint' | 'peach' | 'lavender' }) {
  const s = useStyles(); const { colors } = useTheme(); return <View style={[s.badge, { backgroundColor: colors[tone] }]}><Text style={s.badgeText}>{text}</Text></View>;
}
export function Info({ text, error = false }: { text: string; error?: boolean }) {
  const s = useStyles(); if (!text) return null; return <View testID={error ? 'form-error' : 'info-message'} style={[s.info, error && s.error]}><Icon name={error ? 'alert-circle-outline' : 'information-circle-outline'} size={18} /><Text style={s.infoText}>{text}</Text></View>;
}
export const useTypography = makeStyles(c => ({
  title: { fontSize: 32, fontWeight: '600', color: c.onSurface, letterSpacing: -1.2, lineHeight: 39 },
  h2: { fontSize: 21, fontWeight: '600', color: c.onSurface, letterSpacing: -.5 },
  h3: { fontSize: 17, fontWeight: '600', color: c.onSurface },
  body: { fontSize: 15, lineHeight: 23, color: c.onSurfaceTertiary },
  small: { fontSize: 12, lineHeight: 18, color: c.muted },
  eyebrow: { fontSize: 10, fontWeight: '600', letterSpacing: 2, color: c.onSurfaceTertiary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  flex: { flex: 1 }, gap: { gap: 16 },
}));
const useStyles = makeStyles(c => ({
  button: { minHeight: 54, borderRadius: 30, backgroundColor: c.brandPrimary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, paddingHorizontal: 20 },
  buttonText: { fontSize: 15, fontWeight: '600', color: c.onBrandPrimary },
  secondary: { backgroundColor: c.surfaceTertiary, borderWidth: 1, borderColor: c.border }, secondaryText: { color: c.onSurface },
  disabled: { opacity: .5 }, pressed: { opacity: .72, transform: [{ scale: .98 }] },
  iconButton: { width: 44, height: 44, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surfaceTertiary },
  fieldWrap: { gap: 8 }, label: { color: c.onSurface, fontSize: 13, fontWeight: '500' },
  field: { backgroundColor: c.surfaceTertiary, borderWidth: 1, borderColor: c.border, minHeight: 54, paddingHorizontal: 18, borderRadius: 18, fontSize: 16, color: c.onSurface },
  multiline: { minHeight: 115, paddingTop: 16, textAlignVertical: 'top' },
  sheetBackdrop: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' }, backdropTap: { flex: 1 },
  sheet: { backgroundColor: c.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, minHeight: '52%', paddingHorizontal: 24, flexShrink: 1 },
  handle: { width: 36, height: 4, backgroundColor: c.borderStrong, borderRadius: 3, alignSelf: 'center', marginTop: 12, marginBottom: 10 },
  sheetTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 16, flexShrink: 0 },
  sheetScroll: { flex: 1, minHeight: 0 }, sheetFooter: { flexShrink: 0, gap: 10, paddingTop: 14, borderTopWidth: 1, borderColor: c.border },
  sheetContent: { gap: 18, paddingBottom: 12 }, h2: { fontSize: 22, fontWeight: '600', color: c.onSurface, flex: 1, letterSpacing: -.5 },
  card: { backgroundColor: c.surfaceSecondary, borderRadius: 26, padding: 20, borderWidth: 1, borderColor: c.border, gap: 12 },
  badge: { alignSelf: 'flex-start', borderRadius: 15, paddingHorizontal: 10, paddingVertical: 6 }, badgeText: { fontSize: 10, fontWeight: '600', color: c.onSurface },
  info: { flexDirection: 'row', backgroundColor: c.surfaceTertiary, borderRadius: 16, padding: 13, gap: 8, alignItems: 'flex-start' },
  error: { backgroundColor: c.peach }, infoText: { flex: 1, fontSize: 12, lineHeight: 18, color: c.onSurfaceTertiary },
}));