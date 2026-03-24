import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { colors, NOTIFICATION_CATEGORIES } from "../utils/constants";
import { getSupabaseClient } from "../utils/supabase-client";
import * as api from "../api/client";
import { useAuthStore } from "../stores/useAuthStore";
import { useSettingsStore } from "../stores/useSettingsStore";
import type { NotificationCategoryId } from "../utils/constants";

type Step = 0 | 1 | 2 | 3;

export function OnboardingScreen() {
  const [step, setStep] = useState<Step>(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { loginWithPassport } = useAuthStore();
  const { categories, toggleCategory, setOnboardingComplete } =
    useSettingsStore();

  const handleAuth = useCallback(async () => {
    if (!email.trim() || !password.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();

      let result;
      if (isSignUp) {
        result = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
        });
      } else {
        result = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });
      }

      if (result.error) throw result.error;

      if (isSignUp && !result.data.session) {
        setError("Check your email to confirm your account, then sign in.");
        setIsSignUp(false);
        return;
      }

      if (!result.data.session) throw new Error("No session received");

      // Exchange Supabase token for FlowB JWT
      const flowbRes = await api.authPassport(
        result.data.session.access_token,
        result.data.session.user?.user_metadata?.full_name ||
          email.split("@")[0]
      );

      await loginWithPassport(flowbRes.token, flowbRes.user);
      setStep(2);
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  }, [email, password, isSignUp, loginWithPassport]);

  const finishOnboarding = useCallback(() => {
    setOnboardingComplete(true);
    router.replace("/(tabs)/feed");
  }, [setOnboardingComplete]);

  // ── Step 0: Welcome ─────────────────────────────────────────────────

  const renderWelcome = () => (
    <View style={styles.centerContent}>
      <View style={styles.logoContainer}>
        <Ionicons name="notifications" size={64} color={colors.accent} />
      </View>
      <Text style={styles.heroTitle}>FlowB VIP</Text>
      <Text style={styles.heroSubtitle}>Never miss what matters</Text>
      <Text style={styles.heroBody}>
        Get FlowB notifications that cut through Do Not Disturb and Focus modes.
        Critical alerts delivered instantly.
      </Text>
      <Pressable style={styles.primaryButton} onPress={() => setStep(1)}>
        <Text style={styles.primaryButtonText}>Get Started</Text>
      </Pressable>
    </View>
  );

  // ── Step 1: Sign In ─────────────────────────────────────────────────

  const renderSignIn = () => (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Pressable style={styles.flex} onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.stepContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.stepTitle}>
            {isSignUp ? "Create Account" : "Sign In"}
          </Text>
          <Text style={styles.stepDescription}>
            Sign in with your FlowB account to receive notifications
          </Text>

          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={18}
                color={colors.textTertiary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={colors.textTertiary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                returnKeyType="go"
                onSubmitEditing={handleAuth}
              />
            </View>
          </View>

          {error && (
            <View style={styles.errorRow}>
              <Ionicons
                name="alert-circle-outline"
                size={16}
                color={colors.danger}
              />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Pressable
            style={[
              styles.primaryButton,
              (!email.trim() || !password.trim() || isLoading) &&
                styles.buttonDisabled,
            ]}
            onPress={handleAuth}
            disabled={!email.trim() || !password.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {isSignUp ? "Sign Up" : "Sign In"}
              </Text>
            )}
          </Pressable>

          <Pressable
            style={styles.linkButton}
            onPress={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
          >
            <Text style={styles.linkText}>
              {isSignUp
                ? "Already have an account? Sign in"
                : "Need an account? Sign up"}
            </Text>
          </Pressable>
        </ScrollView>
      </Pressable>
    </KeyboardAvoidingView>
  );

  // ── Step 2: Category Picker ─────────────────────────────────────────

  const renderCategories = () => (
    <ScrollView contentContainerStyle={styles.stepContent}>
      <Text style={styles.stepTitle}>Choose Notifications</Text>
      <Text style={styles.stepDescription}>
        Select which types of notifications you want to receive
      </Text>

      <View style={styles.categoryList}>
        {NOTIFICATION_CATEGORIES.map((cat) => (
          <Pressable
            key={cat.id}
            style={styles.categoryRow}
            onPress={() => toggleCategory(cat.id)}
          >
            <View style={styles.categoryLeft}>
              <View style={styles.categoryIcon}>
                <Ionicons
                  name={cat.icon as keyof typeof Ionicons.glyphMap}
                  size={18}
                  color={
                    categories[cat.id as NotificationCategoryId]
                      ? colors.accent
                      : colors.textTertiary
                  }
                />
              </View>
              <Text style={styles.categoryLabel}>{cat.label}</Text>
            </View>
            <Switch
              value={categories[cat.id as NotificationCategoryId]}
              onValueChange={() => toggleCategory(cat.id)}
              trackColor={{ false: "#333", true: colors.accentDim }}
              thumbColor={
                categories[cat.id as NotificationCategoryId]
                  ? colors.accent
                  : "#666"
              }
            />
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.primaryButton} onPress={() => setStep(3)}>
        <Text style={styles.primaryButtonText}>Continue</Text>
      </Pressable>
    </ScrollView>
  );

  // ── Step 3: Focus Mode Guide ────────────────────────────────────────

  const renderFocusGuide = () => (
    <ScrollView contentContainerStyle={styles.stepContent}>
      <Text style={styles.stepTitle}>Enable Focus Mode Access</Text>
      <Text style={styles.stepDescription}>
        Allow FlowB VIP to bypass Do Not Disturb so you never miss critical
        notifications
      </Text>

      <View style={styles.guideCard}>
        <View style={styles.guideStep}>
          <View style={styles.guideNumber}>
            <Text style={styles.guideNumberText}>1</Text>
          </View>
          <View style={styles.guideTextContainer}>
            <Text style={styles.guideStepTitle}>Open Settings</Text>
            <Text style={styles.guideStepBody}>
              Go to Settings &gt; Focus on your iPhone
            </Text>
          </View>
        </View>

        <View style={styles.guideStep}>
          <View style={styles.guideNumber}>
            <Text style={styles.guideNumberText}>2</Text>
          </View>
          <View style={styles.guideTextContainer}>
            <Text style={styles.guideStepTitle}>Select a Focus Mode</Text>
            <Text style={styles.guideStepBody}>
              Choose Do Not Disturb or your preferred Focus profile
            </Text>
          </View>
        </View>

        <View style={styles.guideStep}>
          <View style={styles.guideNumber}>
            <Text style={styles.guideNumberText}>3</Text>
          </View>
          <View style={styles.guideTextContainer}>
            <Text style={styles.guideStepTitle}>Allow FlowB VIP</Text>
            <Text style={styles.guideStepBody}>
              Tap "Apps" under Allowed Notifications, then add FlowB VIP to the
              list
            </Text>
          </View>
        </View>

        <View style={styles.guideStep}>
          <View style={styles.guideNumber}>
            <Text style={styles.guideNumberText}>4</Text>
          </View>
          <View style={styles.guideTextContainer}>
            <Text style={styles.guideStepTitle}>Enable Time Sensitive</Text>
            <Text style={styles.guideStepBody}>
              Make sure "Time Sensitive Notifications" is toggled on for
              FlowB VIP
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.screenshotPlaceholder}>
        <Ionicons name="phone-portrait-outline" size={48} color={colors.textTertiary} />
        <Text style={styles.screenshotText}>iOS Focus Settings</Text>
      </View>

      <Pressable style={styles.primaryButton} onPress={finishOnboarding}>
        <Text style={styles.primaryButtonText}>Done</Text>
      </Pressable>

      <Pressable style={styles.linkButton} onPress={finishOnboarding}>
        <Text style={styles.linkText}>Skip for now</Text>
      </Pressable>
    </ScrollView>
  );

  // ── Progress Bar ────────────────────────────────────────────────────

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          style={[
            styles.progressDot,
            i <= step && styles.progressDotActive,
            i === step && styles.progressDotCurrent,
          ]}
        />
      ))}
    </View>
  );

  const stepRenderers = [
    renderWelcome,
    renderSignIn,
    renderCategories,
    renderFocusGuide,
  ];

  return (
    <View style={styles.screen}>
      {step > 0 && renderProgressBar()}
      {step > 1 && (
        <Pressable
          style={styles.backArrow}
          onPress={() => setStep((step - 1) as Step)}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
      )}
      {stepRenderers[step]()}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  stepContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },

  // Progress bar
  progressContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#333",
  },
  progressDotActive: {
    backgroundColor: colors.accentDim,
  },
  progressDotCurrent: {
    backgroundColor: colors.accent,
    width: 24,
    borderRadius: 4,
  },

  // Back arrow
  backArrow: {
    position: "absolute",
    top: 58,
    left: 16,
    zIndex: 10,
    padding: 8,
  },

  // Welcome
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: "#1a1a2e",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 18,
    fontWeight: "500",
    color: colors.accent,
    marginBottom: 16,
  },
  heroBody: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 40,
    maxWidth: 300,
  },

  // Steps
  stepTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 28,
  },

  // Input
  inputContainer: {
    gap: 12,
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 14,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    height: "100%",
  },

  // Error
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
    marginLeft: 6,
    flex: 1,
  },

  // Buttons
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  linkButton: {
    alignSelf: "center",
    paddingVertical: 14,
  },
  linkText: {
    fontSize: 14,
    color: colors.textTertiary,
  },

  // Categories
  categoryList: {
    gap: 2,
    marginBottom: 24,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  categoryLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#252525",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  categoryLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.text,
  },

  // Focus Guide
  guideCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    gap: 20,
  },
  guideStep: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  guideNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 1,
  },
  guideNumberText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
  guideTextContainer: {
    flex: 1,
  },
  guideStepTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 2,
  },
  guideStepBody: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  // Screenshot placeholder
  screenshotPlaceholder: {
    height: 160,
    backgroundColor: colors.card,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderStyle: "dashed",
  },
  screenshotText: {
    fontSize: 13,
    color: colors.textTertiary,
    marginTop: 8,
  },
});
