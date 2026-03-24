import { SafeAreaView, StyleSheet } from "react-native";
import { QuickActionsScreen } from "../../src/screens/QuickActionsScreen";
import { colors } from "../../src/utils/constants";

export default function ActionsTab() {
  return (
    <SafeAreaView style={styles.container}>
      <QuickActionsScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
