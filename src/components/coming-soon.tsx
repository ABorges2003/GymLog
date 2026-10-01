import { StyleSheet, Text, View } from "react-native";

type Props = {
  phase: number;
};

// Placeholder for screens that are not built yet.
export function ComingSoon({ phase }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Em breve</Text>
      <Text style={styles.subtitle}>Fase {phase}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 16,
    color: "gray",
  },
});
