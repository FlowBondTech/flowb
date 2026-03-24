import * as Haptics from "expo-haptics";

/**
 * Trigger haptic feedback scaled to notification priority.
 * P0 = strong error buzz (critical), P1 = medium warning, P2 = gentle tap.
 */
export async function triggerHaptic(
  priority: "p0" | "p1" | "p2"
): Promise<void> {
  try {
    switch (priority) {
      case "p0":
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Error
        );
        break;
      case "p1":
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning
        );
        break;
      case "p2":
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
    }
  } catch {
    // Haptics not available (e.g. simulator) - ignore silently
  }
}
