import { SafeAreaView, StyleSheet } from "react-native";
import { NotificationFeedScreen } from "../../src/screens/NotificationFeedScreen";
import { colors } from "../../src/utils/constants";

export default function FeedTab() {
  return (
    <SafeAreaView style={styles.container}>
      <NotificationFeedScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
