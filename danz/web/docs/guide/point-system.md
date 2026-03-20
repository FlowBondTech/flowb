# Dance Movement Point System

Complete design document for DANZ's dance-to-earn point and scoring system.

## Core Problem Space

A dance-to-earn point system must balance **technical feasibility**, **artistic expression**, **fairness across skill levels**, and **anti-gaming mechanics** while remaining **fun and engaging**.

---

## 1. Movement Detection Paradigms

### Sensor Modalities

| Method | Pros | Cons | Accuracy |
|--------|------|------|----------|
| **Phone Accelerometer/Gyro** | Universal, no extra hardware | Limited to phone position, noisy | 60-75% |
| **Camera/Pose Estimation** | Full body tracking, rich data | Privacy concerns, lighting dependent | 80-90% |
| **Wearables** | Precise, multi-point tracking | Cost barrier, friction | 85-95% |
| **Audio Beat Matching** | Simple, universal | Doesn't verify actual movement | 40-50% |
| **Hybrid (Phone + Camera)** | Balanced accuracy/accessibility | Complexity | 75-85% |

### Movement Primitives to Track

```
ATOMIC MOVEMENTS
├── Amplitude (how big)
├── Velocity (how fast)
├── Rhythm Sync (beat alignment)
├── Duration (sustained effort)
├── Variation (pattern diversity)
└── Complexity (movement layering)

COMPOSITE PATTERNS
├── Isolations (single body part)
├── Waves (sequential body flow)
├── Hits (sharp accent points)
├── Grooves (rhythmic repetition)
└── Transitions (movement connections)
```

---

## 2. Scoring Architecture Options

### Option A: Beat-Centric Model

```
Score = Σ (BeatHit × Accuracy × Multiplier)

Where:
- BeatHit: 1 if movement detected on beat, 0 otherwise
- Accuracy: 0.0-1.0 timing precision
- Multiplier: streak bonus, difficulty modifier
```

**Pros**: Simple, rhythm-game familiar, clear feedback
**Cons**: Penalizes freestyle, favors repetitive patterns

### Option B: Energy-Expenditure Model

```
Score = ∫ (MovementIntensity × Duration) dt

Where:
- MovementIntensity: acceleration magnitude normalized
- Duration: time spent actively dancing
```

**Pros**: Rewards effort, accessible to all skill levels
**Cons**: Gameable by shaking phone, ignores artistry

### Option C: Multi-Dimensional Composite (Recommended)

```
Score = w₁(Rhythm) + w₂(Energy) + w₃(Variety) + w₄(Skill) + w₅(Social)

Weights dynamically adjusted per:
- Song difficulty
- User skill tier
- Challenge mode
- Community voting
```

**Pros**: Holistic, rewards multiple aspects
**Cons**: Complex tuning, harder to communicate

### Option D: AI-Judged Artistic Merit

```
Score = NeuralNetwork(PoseSequence, AudioFeatures, StyleModel)

Trained on:
- Professional dancer annotations
- User engagement signals
- Style-specific aesthetics
```

**Pros**: Can appreciate artistry, style-aware
**Cons**: Black box, bias risk, compute intensive

---

## 3. Fairness & Accessibility Framework

### Skill Tier System

```
TIER STRUCTURE
├── Novice (0-1000 XP)
│   └── Scoring emphasis: participation, basic rhythm
├── Mover (1000-5000 XP)
│   └── Scoring emphasis: consistency, energy
├── Dancer (5000-20000 XP)
│   └── Scoring emphasis: technique, variety
├── Artist (20000-100000 XP)
│   └── Scoring emphasis: creativity, style
└── Legend (100000+ XP)
    └── Scoring emphasis: innovation, influence
```

### Adaptive Difficulty

```python
difficulty_multiplier = base_difficulty × (1 + skill_tier × 0.15)
point_ceiling = tier_max × song_difficulty
normalized_score = raw_score / difficulty_multiplier
```

### Accessibility Modes

| Mode | Modification | Target Users |
|------|--------------|--------------|
| Seated Mode | Upper body only scoring | Wheelchair users |
| Low Motion | Reduced amplitude requirements | Limited mobility |
| Audio Cues | Haptic + sound beat guidance | Visual impairment |
| Simplified | 4 movements max | Cognitive accessibility |

---

## 4. Anti-Cheating Architecture

### Threat Model

```
CHEATING VECTORS
├── Mechanical (phone shaker devices)
├── Replay (pre-recorded movement data)
├── Spoofing (fake sensor data injection)
├── Collusion (coordinated fake validation)
└── Automation (scripted movement patterns)
```

### Defense Layers

```
LAYER 1: Signal Analysis
├── Entropy check (natural movement = high entropy)
├── Frequency analysis (human range: 0.5-8 Hz)
├── Jerk detection (d³x/dt³ patterns)
└── Cross-sensor correlation (acc vs gyro consistency)

LAYER 2: Behavioral
├── Session variance (same exact pattern = sus)
├── Improvement curve (skill should evolve)
├── Social graph (isolated accounts = flag)
└── Time-of-day patterns (human schedules)

LAYER 3: Challenge-Response
├── Random beat challenges
├── Mirror movement prompts
├── Speed variation tests
└── Style switch requests

LAYER 4: Community
├── Video verification (random sample)
├── Stake-weighted peer review
├── Reputation scoring
└── Dispute resolution DAO
```

---

## 5. Token Economics Integration

### Earning Structure

```
DAILY EARNING POTENTIAL (example)

Base Rate: 10 $DANZ per 10-min session
Multipliers:
  × Streak bonus (1.1 - 2.0x for daily streaks)
  × Skill tier (1.0 - 1.5x based on tier)
  × Challenge completion (1.2 - 3.0x for special events)
  × Social bonus (1.1x for group sessions)
  × NFT boosts (varies by equipment rarity)

Daily Cap: 100 $DANZ (prevents farming, ensures scarcity)
Weekly Bonus Pool: Top performers share bonus allocation
```

### Point → Token Conversion

```
Points (off-chain, instant)
    ↓
XP (progression, permanent)
    ↓
Claimable $DANZ (on-chain, daily batch)
    ↓
Staked $DANZ (governance, yield)
```

---

## 6. Gamification Mechanics

### Engagement Loops

```
MICRO LOOP (seconds)
Beat hit → Visual feedback → Dopamine → Next beat

SHORT LOOP (minutes)
Song complete → Score reveal → Comparison → Play again

MEDIUM LOOP (hours/days)
Daily challenge → Streak maintain → Reward claim → Return

LONG LOOP (weeks/months)
Skill progression → Tier unlock → New content → Mastery goal
```

### Social Mechanics

| Feature | Point Modifier | Purpose |
|---------|----------------|---------|
| Duet Mode | +20% both dancers | Social engagement |
| Battle Mode | Winner +50%, Loser +10% | Competition |
| Crew Challenges | Shared pool bonus | Community building |
| Teach Mode | Teacher +30% if student improves | Knowledge transfer |
| Live Audience | +5% per viewer (capped) | Content creation |

---

## 7. Technical Implementation

### Real-Time Processing Pipeline

```
Sensor Data (60Hz)
    ↓
Noise Filter (Kalman/Low-pass)
    ↓
Feature Extraction (peaks, rhythm, energy)
    ↓
Beat Alignment (audio sync)
    ↓
Movement Classification (ML model)
    ↓
Score Calculation (weighted formula)
    ↓
Anti-Cheat Validation
    ↓
UI Feedback (<50ms latency critical)
```

### Data Models

```typescript
interface DanceSession {
  id: string;
  userId: string;
  songId: string;
  startTime: timestamp;
  duration: number;

  // Raw metrics
  movementData: MovementFrame[];
  beatHits: BeatHit[];

  // Calculated scores
  rhythmScore: number;      // 0-100
  energyScore: number;      // 0-100
  varietyScore: number;     // 0-100
  technicalScore: number;   // 0-100

  // Final outputs
  totalPoints: number;
  xpEarned: number;
  tokensClaimable: number;

  // Validation
  antiCheatFlags: string[];
  verificationStatus: 'pending' | 'verified' | 'flagged';
}

interface MovementFrame {
  timestamp: number;
  accelerometer: { x: number; y: number; z: number };
  gyroscope: { x: number; y: number; z: number };
  magnitude: number;
  beatPhase: number; // 0-1, where in beat cycle
}

interface BeatHit {
  beatIndex: number;
  timing: number;        // ms offset from perfect
  accuracy: number;      // 0-1 score
  movementType: string;  // detected movement category
}
```

---

## 8. Implementation Phases

### Phase 1: MVP (Launch)
- Energy-based scoring (phone accelerometer)
- Beat sync bonus (simple rhythm detection)
- Basic anti-cheat (entropy + frequency)
- Daily caps, simple streaks

### Phase 2: Enhancement
- Add camera pose estimation (opt-in)
- Multi-dimensional scoring
- Skill tiers with adaptive difficulty
- Social features (duets, battles)

### Phase 3: Advanced
- AI artistic merit scoring
- Style-specific judging models
- DAO-governed scoring parameters
- Cross-platform wearable support

---

## 9. Key Design Principles

1. **Effort should always be rewarded** → No zero-point sessions
2. **Skill should be recognized but not gatekeep** → Tier-normalized scoring
3. **Fun > Optimization** → Discourage min-maxing behaviors
4. **Transparency** → Show exactly how points calculated
5. **Community ownership** → DAO can adjust weights over time

---

## 10. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Session Completion Rate | >85% | Sessions finished / started |
| Daily Active Dancers | Growth 10% MoM | Unique dancing users |
| Streak Retention | >40% 7-day | Users maintaining streaks |
| Cheat Detection Rate | <1% false positive | Flagged accounts / total |
| Score Distribution | Normal curve | Gini coefficient <0.4 |
| Social Multiplier Usage | >30% sessions | Sessions with social features |
