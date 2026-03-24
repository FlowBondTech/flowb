import { SafeAreaView, StyleSheet } from "react-native";
import { SettingsScreen } from "../../src/screens/SettingsScreen";
import { colors } from "../../src/utils/constants";

export default function SettingsTab() {
  return (
    <SafeAreaView style={styles.container}>
      <SettingsScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
