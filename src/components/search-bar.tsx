import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import type { ThemeColors } from "@/theme/colors";
import { useColors, useThemedStyles } from "@/theme/theme";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
};

export function SearchBar({
  value,
  onChangeText,
  placeholder = "Pesquisar",
}: Props) {
  const c = useColors();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      <Ionicons name="search" size={20} color={c.textMuted} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.textMuted}
        autoCorrect={false}
        returnKeyType="search"
      />
      {value.length > 0 && (
        <Pressable
          onPress={() => onChangeText("")}
          hitSlop={12}
          accessibilityLabel="Limpar pesquisa"
        >
          <Ionicons name="close-circle" size={20} color={c.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

function createStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginHorizontal: 16,
      marginTop: 12,
      paddingHorizontal: 12,
      minHeight: 44,
      borderRadius: 10,
      backgroundColor: c.subtle,
    },
    input: {
      flex: 1,
      fontSize: 16,
      paddingVertical: 8,
      color: c.text,
    },
  });
}
