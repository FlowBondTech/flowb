import { useState, useCallback } from "react";
import { updatePreferences } from "../api/client";
import { composeCast, shareToX, copyToClipboard, hapticImpact, hapticSelection } from "../lib/farcaster";

const ARRIVAL_OPTIONS = [
  { value: "already-here", label: "I'm already here", emoji: "\uD83C\uDFD4\uFE0F" },
  { value: "feb-17", label: "Feb 17 (Opening Day)", emoji: "\uD83C\uDF89" },
  { value: "feb-18-20", label: "Feb 18-20 (Main Event)", emoji: "\uD83D\uDCC5" },
  { value: "feb-21-plus", label: "Feb 21+ (Late arrival)", emoji: "\uD83D\uDE80" },
  { value: "remote", label: "Attending remotely", emoji: "\uD83C\uDF10" },
];

const INTEREST_CATEGORIES = [
  { id: "defi", label: "DeFi", emoji: "\uD83D\uDCB0" },
  { id: "nft", label: "NFTs & Art", emoji: "\uD83C\uDFA8" },
  { id: "ai", label: "AI & Agents", emoji: "\uD83E\uDD16" },
  { id: "social", label: "Social & DAOs", emoji: "\uD83D\uDC65" },
  { id: "infra", label: "Infrastructure", emoji: "\u26D3\uFE0F" },
  { id: "gaming", label: "Gaming", emoji: "\uD83C\uDFAE" },
  { id: "privacy", label: "Privacy & ZK", emoji: "\uD83D\uDD10" },
  { id: "rwa", label: "Real World Assets", emoji: "\uD83C\uDFE0" },
  { id: "music", label: "Music & Culture", emoji: "\uD83C\uDFB5" },
  { id: "dev", label: "Dev Tooling", emoji: "\uD83D\uDD27" },
  { id: "hackathon", label: "Hackathon/Building", emoji: "\uD83D\uDEE0\uFE0F" },
  { id: "parties", label: "Parties & Networking", emoji: "\uD83C\uDF7E" },
];

const CREW_OPTIONS = [
  { value: "browse", label: "Browse Crews", emoji: "\uD83D\uDD0D", sub: "Find a crew to join" },
  { value: "create", label: "Create a Crew", emoji: "\u2728", sub: "Start your own squad" },
  { value: "skip", label: "Skip for now", emoji: "", sub: "You can join later" },
];

const MINIAPP_URL = "https://flowb-farcaster.netlify.app";

interface Props {
  onComplete: () => void;
  onNavigateCrew?: (action: "browse" | "create") => void;
}

export function OnboardingScreen({ onComplete, onNavigateCrew }: Props) {
  const [step, setStep] = useState(0); // 0=welcome, 1=when, 2=interests, 3=crew, 4=share, 5=done
  const [arrivalDate, setArrivalDate] = useState<string>("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const totalSteps = 5;
  const progressPercent = Math.min(((step) / totalSteps) * 100, 100);

  const toggleInterest = useCallback((id: string) => {
    hapticSelection();
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const finishOnboarding = useCallback(
    async (crewAction?: "browse" | "create") => {
      hapticImpact("medium");
      setSaving(true);
      try {
        await updatePreferences({
          arrival_date: arrivalDate || undefined,
          interest_categories: selectedInterests.length > 0 ? selectedInterests : undefined,
          onboarding_complete: true,
        });
      } catch (err) {
        console.error("Failed to save preferences:", err);
      }

      try {
        localStorage.setItem("flowb_onboarded", "1");
      } catch {}

      setSaving(false);
      onComplete();

      if (crewAction && onNavigateCrew) {
        onNavigateCrew(crewAction);
      }
    },
    [arrivalDate, selectedInterests, onComplete, onNavigateCrew],
  );

  const handleShareFarcaster = () => {
    composeCast(
      "I'm using FlowB for EthDenver! Find events, build your crew, earn points.",
      [MINIAPP_URL],
    );
  };

  const handleShareX = () => {
    shareToX(
      "I'm using FlowB for EthDenver! Find events, build your crew, earn points.",
      MINIAPP_URL,
    );
  };

  const handleCopyLink = async () => {
    const ok = await copyToClipboard(MINIAPP_URL);
    if (ok) {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1500);
    }
  };

  // Welcome screen
  if (step === 0) {
    return (
      <div className="onboarding">
        <div className="onboarding-content">
          <div className="onboarding-hero">
            <div className="onboarding-logo">FlowB</div>
            <div className="onboarding-tagline">Your EthDenver companion</div>
          </div>

          <div className="onboarding-features">
            <div className="onboarding-feature">
              <span className="onboarding-feature-icon">{"\u26A1"}</span>
              <div>
                <div className="onboarding-feature-title">Live Events</div>
                <div className="onboarding-feature-desc">See what's happening now and next</div>
              </div>
            </div>
            <div className="onboarding-feature">
              <span className="onboarding-feature-icon">{"\uD83D\uDC65"}</span>
              <div>
                <div className="onboarding-feature-title">Squad Up</div>
                <div className="onboarding-feature-desc">Create or join a crew, coordinate IRL</div>
              </div>
            </div>
            <div className="onboarding-feature">
              <span className="onboarding-feature-icon">{"\u2B50"}</span>
              <div>
                <div className="onboarding-feature-title">Earn Points</div>
                <div className="onboarding-feature-desc">Check in, explore, climb the leaderboard</div>
              </div>
            </div>
          </div>

          <button
            className="btn btn-primary btn-block"
            onClick={() => setStep(1)}
            style={{ marginTop: 24 }}
          >
            Get Started
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding">
      {/* Progress bar */}
      <div className="onboarding-progress">
        <div className="progress-bar" style={{ height: 3 }}>
          <div
            className="progress-fill"
            style={{ width: `${progressPercent}%`, transition: "width 0.3s ease" }}
          />
        </div>
        <div className="onboarding-step-label">
          Step {step} of {totalSteps}
        </div>
      </div>

      <div className="onboarding-content">
        {/* Step 1: When are you arriving */}
        {step === 1 && (
          <div className="onboarding-step">
            <div className="onboarding-step-header">
              <div className="onboarding-step-emoji">{"\uD83D\uDCC5"}</div>
              <h2 className="onboarding-step-title">When are you arriving?</h2>
              <p className="onboarding-step-desc">
                We'll tailor your event feed to your schedule
              </p>
            </div>

            <div className="onboarding-options">
              {ARRIVAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`onboarding-option ${arrivalDate === opt.value ? "onboarding-option-selected" : ""}`}
                  onClick={() => setArrivalDate(opt.value)}
                >
                  <span className="onboarding-option-emoji">{opt.emoji}</span>
                  <span className="onboarding-option-label">{opt.label}</span>
                  {arrivalDate === opt.value && (
                    <span className="onboarding-option-check">{"\u2713"}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="onboarding-actions">
              <button className="btn btn-primary btn-block" onClick={() => setStep(2)}>
                {arrivalDate ? "Next" : "Skip"}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Interests (multi-select) */}
        {step === 2 && (
          <div className="onboarding-step">
            <div className="onboarding-step-header">
              <div className="onboarding-step-emoji">{"\uD83C\uDFAF"}</div>
              <h2 className="onboarding-step-title">What are you into?</h2>
              <p className="onboarding-step-desc">
                Pick your interests to personalize your feed
              </p>
            </div>

            <div className="onboarding-chips">
              {INTEREST_CATEGORIES.map((cat) => {
                const active = selectedInterests.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    className={`onboarding-chip ${active ? "onboarding-chip-active" : ""}`}
                    onClick={() => toggleInterest(cat.id)}
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {selectedInterests.length > 0 && (
              <div style={{ fontSize: 13, color: "var(--hint)", textAlign: "center", marginTop: 8 }}>
                {selectedInterests.length} selected
              </div>
            )}

            <div className="onboarding-actions">
              <button className="btn btn-secondary" onClick={() => setStep(1)}>
                Back
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setStep(3)}>
                {selectedInterests.length > 0 ? "Next" : "Skip"}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Crew */}
        {step === 3 && (
          <div className="onboarding-step">
            <div className="onboarding-step-header">
              <div className="onboarding-step-emoji">{"\uD83D\uDC65"}</div>
              <h2 className="onboarding-step-title">Find your crew</h2>
              <p className="onboarding-step-desc">
                Crews help you coordinate with friends at EthDenver
              </p>
            </div>

            <div className="onboarding-options">
              {CREW_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className="onboarding-option"
                  onClick={() => {
                    if (opt.value === "skip") {
                      setStep(4);
                    } else {
                      finishOnboarding(opt.value as "browse" | "create");
                    }
                  }}
                >
                  {opt.emoji && <span className="onboarding-option-emoji">{opt.emoji}</span>}
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div className="onboarding-option-label">{opt.label}</div>
                    <div style={{ fontSize: 12, color: "var(--hint)", marginTop: 2 }}>{opt.sub}</div>
                  </div>
                  <span style={{ color: "var(--hint)", fontSize: 16 }}>{"\u203A"}</span>
                </button>
              ))}
            </div>

            <div className="onboarding-actions">
              <button className="btn btn-secondary" onClick={() => setStep(2)}>
                Back
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Share & Invite */}
        {step === 4 && (
          <div className="onboarding-step">
            <div className="onboarding-step-header">
              <div className="onboarding-step-emoji">{"\uD83D\uDCE3"}</div>
              <h2 className="onboarding-step-title">Tell your crew</h2>
              <p className="onboarding-step-desc">
                Let your friends know you're on FlowB for EthDenver
              </p>
            </div>

            <div className="onboarding-options">
              <button className="onboarding-option" onClick={handleShareFarcaster}>
                <span className="onboarding-option-emoji">{"\uD83D\uDFEA"}</span>
                <span className="onboarding-option-label">Share on Farcaster</span>
                <span style={{ color: "var(--hint)", fontSize: 16 }}>{"\u203A"}</span>
              </button>
              <button className="onboarding-option" onClick={handleShareX}>
                <span className="onboarding-option-emoji">{"\uD83D\uDC26"}</span>
                <span className="onboarding-option-label">Share on X</span>
                <span style={{ color: "var(--hint)", fontSize: 16 }}>{"\u203A"}</span>
              </button>
              <button className="onboarding-option" onClick={handleCopyLink}>
                <span className="onboarding-option-emoji">{"\uD83D\uDD17"}</span>
                <span className="onboarding-option-label">
                  {linkCopied ? "Copied!" : "Copy Link"}
                </span>
                {linkCopied && (
                  <span style={{ color: "var(--green)", fontSize: 12, fontWeight: 600 }}>{"\u2713"}</span>
                )}
              </button>
            </div>

            <div className="onboarding-actions">
              <button className="btn btn-secondary" onClick={() => setStep(3)}>
                Back
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setStep(5)}>
                {linkCopied ? "Next" : "Skip"}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Done */}
        {step === 5 && (
          <div className="onboarding-step" style={{ textAlign: "center" }}>
            <div className="onboarding-step-header">
              <div className="onboarding-done-emoji">{"\uD83C\uDF89"}</div>
              <h2 className="onboarding-step-title">You're all set!</h2>
              <p className="onboarding-step-desc">
                Your FlowB experience is ready. Explore events, join a crew, and earn points at EthDenver.
              </p>
            </div>

            <div className="onboarding-done-summary">
              {arrivalDate && (
                <div className="onboarding-done-item">
                  {"\uD83D\uDCC5"} {ARRIVAL_OPTIONS.find((o) => o.value === arrivalDate)?.label || arrivalDate}
                </div>
              )}
              {selectedInterests.length > 0 && (
                <div className="onboarding-done-item">
                  {"\uD83C\uDFAF"} {selectedInterests.length} interest{selectedInterests.length !== 1 ? "s" : ""} selected
                </div>
              )}
            </div>

            <button
              className="btn btn-primary btn-block"
              onClick={() => finishOnboarding()}
              disabled={saving}
              style={{ marginTop: 24 }}
            >
              {saving ? "Saving..." : "Explore Events"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
