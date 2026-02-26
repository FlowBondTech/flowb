import { useState, useCallback } from "react";
import { updatePreferences } from "../api/client";
import { searchCities, type City } from "../../../shared/data/cities";


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

const BOT_LINK = "https://t.me/Flow_b_bot?startapp=home";

interface Props {
  onComplete: () => void;
  onNavigateCrew?: (action: "browse" | "create") => void;
}

export function OnboardingScreen({ onComplete, onNavigateCrew }: Props) {
  const [step, setStep] = useState(0); // 0=welcome, 1=where-based, 2=where-now, 3=interests, 4=crew, 5=share, 6=done
  const [homeCity, setHomeCity] = useState("");
  const [homeCountry, setHomeCountry] = useState("");
  const [currentCity, setCurrentCity] = useState("");
  const [currentCountry, setCurrentCountry] = useState("");
  const [destinationCity, setDestinationCity] = useState("");
  const [destinationCountry, setDestinationCountry] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [cityResults, setCityResults] = useState<City[]>([]);
  const [activeField, setActiveField] = useState<"home" | "current" | "destination">("home");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const totalSteps = 6;
  const progressPercent = Math.min((step / totalSteps) * 100, 100);
  const tg = (window as any).Telegram?.WebApp;

  const handleCitySearch = useCallback((query: string) => {
    setCitySearch(query);
    if (query.length >= 2) {
      setCityResults(searchCities(query, 8));
    } else {
      setCityResults([]);
    }
  }, []);

  const selectCity = useCallback((city: City) => {
    if (activeField === "home") {
      setHomeCity(city.name);
      setHomeCountry(city.country);
    } else if (activeField === "current") {
      setCurrentCity(city.name);
      setCurrentCountry(city.country);
    } else {
      setDestinationCity(city.name);
      setDestinationCountry(city.country);
    }
    setCitySearch("");
    setCityResults([]);
  }, [activeField]);

  const toggleInterest = useCallback((id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const finishOnboarding = useCallback(
    async (crewAction?: "browse" | "create") => {
      setSaving(true);
      try {
        await updatePreferences({
          home_city: homeCity || undefined,
          home_country: homeCountry || undefined,
          current_city: currentCity || undefined,
          current_country: currentCountry || undefined,
          destination_city: destinationCity || undefined,
          destination_country: destinationCountry || undefined,
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
    [homeCity, homeCountry, currentCity, currentCountry, destinationCity, destinationCountry, selectedInterests, onComplete, onNavigateCrew],
  );

  const handleShareTelegram = () => {
    const text = "I'm using FlowB for EthDenver! Find events, build your crew, earn points.";
    tg?.openTelegramLink?.(
      `https://t.me/share/url?url=${encodeURIComponent(BOT_LINK)}&text=${encodeURIComponent(text)}`,
    );
  };

  const handleShareX = () => {
    const text = "I'm using FlowB for EthDenver! Find events, build your crew, earn points.";
    tg?.openLink?.(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(BOT_LINK)}`,
    );
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(BOT_LINK);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1500);
    } catch {}
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

          <div className="onboarding-highlights">
            <div className="onboarding-highlight">
              <span className="onboarding-highlight-icon">{"\u26A1"}</span>
              <span className="onboarding-highlight-text">Discover live events & side events</span>
            </div>
            <div className="onboarding-highlight">
              <span className="onboarding-highlight-icon">{"\uD83D\uDC65"}</span>
              <span className="onboarding-highlight-text">Find your Crew & coordinate IRL</span>
            </div>
            <div className="onboarding-highlight">
              <span className="onboarding-highlight-icon">{"\u2B50"}</span>
              <span className="onboarding-highlight-text">Earn points across all platforms</span>
            </div>
          </div>

          <button
            className="btn btn-primary btn-block"
            onClick={() => setStep(1)}
            style={{ marginTop: 16 }}
          >
            Get Started
          </button>

          <div className="onboarding-portal-hint" style={{ marginTop: 16, textAlign: "center" }}>
            <span
              style={{ color: "var(--accent-light)", fontWeight: 600, cursor: "pointer" }}
              onClick={() => tg?.openLink?.("https://flowb.me/settings?from=telegram")}
            >
              Already in the flow? Sign into your flow
            </span>
            <div style={{ fontSize: 11, color: "var(--hint)", marginTop: 4 }}>
              Syncs your accounts across platforms — powered by FlowBond.Tech
            </div>
          </div>
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
        {/* Step 1: Where are you based? */}
        {step === 1 && (
          <div className="onboarding-step">
            <div className="onboarding-step-header">
              <div className="onboarding-step-emoji">{"\uD83C\uDFE0"}</div>
              <h2 className="onboarding-step-title">Where are you based?</h2>
              <p className="onboarding-step-desc">
                Connect with people from your home city after events
              </p>
            </div>

            <div style={{ position: "relative" }}>
              <input
                type="text"
                className="onboarding-input"
                placeholder="Search your city..."
                value={citySearch || homeCity}
                onChange={(e) => {
                  handleCitySearch(e.target.value);
                  if (!e.target.value) { setHomeCity(""); setHomeCountry(""); }
                }}
                onFocus={() => { setActiveField("home"); setCitySearch(homeCity); }}
                style={{
                  width: "100%", padding: "12px 16px", borderRadius: 12,
                  border: "1px solid var(--border, #333)", background: "var(--bg-secondary, #1a1a2e)",
                  color: "var(--text, #fff)", fontSize: 15, outline: "none",
                }}
              />
              {cityResults.length > 0 && (
                <div style={{
                  position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10,
                  background: "var(--bg-secondary, #1a1a2e)", borderRadius: 12,
                  border: "1px solid var(--border, #333)", maxHeight: 200, overflowY: "auto",
                  marginTop: 4,
                }}>
                  {cityResults.map((city) => (
                    <button
                      key={`${city.name}-${city.country}`}
                      onClick={() => selectCity(city)}
                      style={{
                        display: "block", width: "100%", padding: "10px 16px",
                        background: "none", border: "none", color: "var(--text, #fff)",
                        textAlign: "left", cursor: "pointer", fontSize: 14,
                      }}
                    >
                      {city.name}, {city.countryName}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {homeCity && (
              <div style={{ marginTop: 12, padding: "8px 16px", borderRadius: 8, background: "var(--bg-tertiary, #252547)", fontSize: 14, color: "var(--accent-light, #3b82f6)" }}>
                {"\uD83D\uDCCD"} {homeCity}, {homeCountry}
              </div>
            )}

            <div className="onboarding-actions">
              <button className="btn btn-primary btn-block" onClick={() => { setCitySearch(""); setCityResults([]); setStep(2); }}>
                {homeCity ? "Next" : "Skip"}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Where are you now / heading? */}
        {step === 2 && (
          <div className="onboarding-step">
            <div className="onboarding-step-header">
              <div className="onboarding-step-emoji">{"\u2708\uFE0F"}</div>
              <h2 className="onboarding-step-title">Where are you now?</h2>
              <p className="onboarding-step-desc">
                Find events and people wherever you go
              </p>
            </div>

            {/* Current city */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: "var(--hint)", marginBottom: 4, display: "block" }}>Current city</label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  className="onboarding-input"
                  placeholder="Where are you right now?"
                  value={activeField === "current" ? (citySearch || currentCity) : currentCity}
                  onChange={(e) => { handleCitySearch(e.target.value); if (!e.target.value) { setCurrentCity(""); setCurrentCountry(""); } }}
                  onFocus={() => { setActiveField("current"); setCitySearch(currentCity); }}
                  style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "1px solid var(--border, #333)", background: "var(--bg-secondary, #1a1a2e)", color: "var(--text, #fff)", fontSize: 15, outline: "none" }}
                />
                {activeField === "current" && cityResults.length > 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10, background: "var(--bg-secondary, #1a1a2e)", borderRadius: 12, border: "1px solid var(--border, #333)", maxHeight: 200, overflowY: "auto", marginTop: 4 }}>
                    {cityResults.map((city) => (
                      <button key={`${city.name}-${city.country}`} onClick={() => selectCity(city)} style={{ display: "block", width: "100%", padding: "10px 16px", background: "none", border: "none", color: "var(--text, #fff)", textAlign: "left", cursor: "pointer", fontSize: 14 }}>
                        {city.name}, {city.countryName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Destination city */}
            <div>
              <label style={{ fontSize: 13, color: "var(--hint)", marginBottom: 4, display: "block" }}>Where are you heading next?</label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  className="onboarding-input"
                  placeholder="Next destination (optional)"
                  value={activeField === "destination" ? (citySearch || destinationCity) : destinationCity}
                  onChange={(e) => { handleCitySearch(e.target.value); if (!e.target.value) { setDestinationCity(""); setDestinationCountry(""); } }}
                  onFocus={() => { setActiveField("destination"); setCitySearch(destinationCity); }}
                  style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "1px solid var(--border, #333)", background: "var(--bg-secondary, #1a1a2e)", color: "var(--text, #fff)", fontSize: 15, outline: "none" }}
                />
                {activeField === "destination" && cityResults.length > 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10, background: "var(--bg-secondary, #1a1a2e)", borderRadius: 12, border: "1px solid var(--border, #333)", maxHeight: 200, overflowY: "auto", marginTop: 4 }}>
                    {cityResults.map((city) => (
                      <button key={`${city.name}-${city.country}`} onClick={() => selectCity(city)} style={{ display: "block", width: "100%", padding: "10px 16px", background: "none", border: "none", color: "var(--text, #fff)", textAlign: "left", cursor: "pointer", fontSize: 14 }}>
                        {city.name}, {city.countryName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="onboarding-actions">
              <button className="btn btn-secondary" onClick={() => { setCitySearch(""); setCityResults([]); setStep(1); }}>Back</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { setCitySearch(""); setCityResults([]); setStep(3); }}>
                {currentCity || destinationCity ? "Next" : "Skip"}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Interests (multi-select) */}
        {step === 3 && (
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
              <button className="btn btn-secondary" onClick={() => setStep(2)}>
                Back
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setStep(4)}>
                {selectedInterests.length > 0 ? "Next" : "Skip"}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Crew */}
        {step === 4 && (
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
                      setStep(5);
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
              <button className="btn btn-secondary" onClick={() => setStep(3)}>
                Back
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Share & Invite */}
        {step === 5 && (
          <div className="onboarding-step">
            <div className="onboarding-step-header">
              <div className="onboarding-step-emoji">{"\uD83D\uDCE3"}</div>
              <h2 className="onboarding-step-title">Tell your crew</h2>
              <p className="onboarding-step-desc">
                Let your friends know you're on FlowB for EthDenver
              </p>
            </div>

            <div className="onboarding-options">
              <button className="onboarding-option" onClick={handleShareTelegram}>
                <span className="onboarding-option-emoji">{"\u2708\uFE0F"}</span>
                <span className="onboarding-option-label">Share on Telegram</span>
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
              <button className="btn btn-secondary" onClick={() => setStep(4)}>
                Back
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setStep(6)}>
                {linkCopied ? "Next" : "Skip"}
              </button>
            </div>
          </div>
        )}

        {/* Step 6: Done */}
        {step === 6 && (
          <div className="onboarding-step" style={{ textAlign: "center" }}>
            <div className="onboarding-step-header">
              <div className="onboarding-done-emoji">{"\uD83C\uDF89"}</div>
              <h2 className="onboarding-step-title">You're all set!</h2>
              <p className="onboarding-step-desc">
                Your FlowB experience is ready. Explore events, join a crew, and earn points at EthDenver.
              </p>
            </div>

            <div className="onboarding-done-summary">
              {homeCity && (
                <div className="onboarding-done-item">
                  {"\uD83C\uDFE0"} Based in {homeCity}
                </div>
              )}
              {currentCity && (
                <div className="onboarding-done-item">
                  {"\uD83D\uDCCD"} Currently in {currentCity}
                </div>
              )}
              {destinationCity && (
                <div className="onboarding-done-item">
                  {"\u2708\uFE0F"} Heading to {destinationCity}
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
