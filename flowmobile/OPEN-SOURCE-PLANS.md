# FlowMobile Sovereign Quad - Open Source Subsystem Plans

**Version**: 1.0
**Date**: 2026-03-09
**Status**: Technical Build Guide
**Classification**: Open Source
**Companion Documents**: PRD-FlowMobile-Sovereign-Quad.md, BOM.md, SOURCES.md

---

## Table of Contents

1. [VESC Motor Controller Setup & Configuration](#1-vesc-motor-controller-setup--configuration)
2. [LiFePO4 BMS Wiring & Configuration](#2-lifepo4-bms-wiring--configuration)
3. [Meshtastic Node Configuration](#3-meshtastic-node-configuration)
4. [Raspberry Pi Sovereignty Stack Setup](#4-raspberry-pi-sovereignty-stack-setup)
5. [Vehicle Telemetry System](#5-vehicle-telemetry-system)
6. [EMP Protection Wiring](#6-emp-protection-wiring)

---

## 1. VESC Motor Controller Setup & Configuration

### 1.1 Overview

The VESC (Vedder Electronic Speed Controller) is the core open-source motor controller for the FlowMobile powertrain. Created by Benjamin Vedder, the VESC firmware provides Field-Oriented Control (FOC) for maximum efficiency, configurable regenerative braking, CAN bus multi-motor coordination, and comprehensive fault protection. The entire firmware is open-source at github.com/vedderb/bldc.

### 1.2 Hardware Selection by Tier

| Tier | Controller | Specs | Use Case | Est. Price |
|------|-----------|-------|----------|------------|
| **T1-T2** | VESC 6.9 | 100A continuous, 200A peak, up to 60V | Single/dual 5kW hub motors at 48V | $150-300 each |
| **T3** | Axiom Controller | 400V, 300A, 100kW | High-voltage quad-motor configuration | $300-600 |
| **Budget** | Flipsky 75100 | 75V/100A, VESC 6 compatible | Cost-reduced builds, proven in EV community | $100-200 |

**Selection criteria**: Match controller current rating to motor peak current draw. A QS Motor 5kW hub motor at 48V draws approximately 104A at full power (5000W / 48V). The VESC 6.9 at 100A continuous with 200A peak handles this with headroom for burst acceleration.

### 1.3 Wiring Diagram

#### Single Motor (Tier 1)

```
POWER PATH:
[BATTERY +] ──── [200A FUSE] ──── [PRECHARGE CIRCUIT] ──── [VESC B+]
[BATTERY -] ──── [SHUNT RESISTOR] ──── [VESC B-]

MOTOR PHASES (3-phase, match wire gauge to current: 8 AWG minimum for 100A):
[VESC MOTOR A] ──── [HUB MOTOR PHASE A]
[VESC MOTOR B] ──── [HUB MOTOR PHASE B]
[VESC MOTOR C] ──── [HUB MOTOR PHASE C]

HALL SENSORS (for low-speed startup, 6-pin JST connector):
[VESC HALL 1] ──── [MOTOR HALL SENSOR 1]
[VESC HALL 2] ──── [MOTOR HALL SENSOR 2]
[VESC HALL 3] ──── [MOTOR HALL SENSOR 3]
[VESC 5V]     ──── [HALL SENSOR POWER]
[VESC GND]    ──── [HALL SENSOR GND]
[VESC TEMP]   ──── [MOTOR TEMPERATURE SENSOR] (NTC 10K thermistor if available)

CAN BUS (for BMS telemetry, even on single-motor builds):
[VESC CAN-H] ──── [CAN BUS HIGH] ──── [TO BMS CAN-H]
[VESC CAN-L] ──── [CAN BUS LOW]  ──── [TO BMS CAN-L]

THROTTLE (Hall-effect, 3-wire):
[THROTTLE SIGNAL] ──── [VESC ADC1 INPUT]
[THROTTLE 5V]     ──── [VESC 5V OUTPUT]
[THROTTLE GND]    ──── [VESC GND]

REGEN BRAKING LEVEL SELECT (3-position toggle switch):
[SWITCH COMMON]  ──── [VESC ADC2 INPUT]
[POSITION 1]     ──── Voltage divider output 1.0V (Level 1: Light regen)
[POSITION 2]     ──── Voltage divider output 2.5V (Level 2: Moderate regen)
[POSITION 3]     ──── Voltage divider output 4.0V (Level 3: Maximum regen)
```

#### Precharge Circuit Detail

```
PURPOSE: Prevent inrush current surge to VESC capacitors on power-up.
Without precharge, connecting a 48V pack to large capacitors draws
hundreds of amps for milliseconds, welding connectors and damaging FETs.

CIRCUIT:
                     ┌── [PRECHARGE RELAY (NC)] ── [50 ohm 50W RESISTOR] ──┐
[BATTERY +] ── [FUSE] ──┤                                                    ├── [VESC B+]
                     └── [MAIN CONTACTOR (NO)] ────────────────────────────┘
                                    |
                             [CONTROL SIGNAL from MCU or timer]

SEQUENCE:
1. Close precharge relay (current flows through 50 ohm resistor)
2. Wait 2-5 seconds (capacitors charge to ~95% battery voltage)
3. Close main contactor (full current path now available)
4. Open precharge relay (no longer needed)

SIMPLE ALTERNATIVE (no MCU):
Use a 555 timer circuit with 3-second delay to switch main contactor.
Timer triggers on key-switch activation.
```

### 1.4 VESC Tool Configuration Steps

#### Step 1: Initial Connection and Motor Detection

```
PREREQUISITES:
- VESC Tool installed (vesc-project.com/vesc_tool, available for Windows/Mac/Linux)
- USB-C cable connected from VESC to computer
- Motor connected to VESC (phases and hall sensors)
- Battery connected (or bench power supply 48V 10A minimum)

PROCEDURE:
1. Open VESC Tool, click "Connect" (auto-detects USB serial port)
2. Navigate to: Motor Settings > FOC > General
3. Click "Run Detection" (wizard measures motor parameters automatically):
   - Motor resistance (R)
   - Motor inductance (L)
   - Motor flux linkage (lambda)
   - Hall sensor table (if hall sensors connected)
4. Detection takes 30-60 seconds. Motor will make whirring noises. This is normal.
5. Review detected values. Click "Apply" then "Write Motor Configuration"

EXPECTED VALUES for QS Motor 5kW 48V hub motor:
- Resistance: 0.01-0.05 ohm (low resistance = high current motor)
- Inductance: 20-100 uH
- Flux linkage: 0.01-0.05 Wb
- Motor poles: 20-40 (typical for hub motors, detect automatically)
- Hall sensor mode: 120 degree (most common)
```

#### Step 2: Current and Voltage Limits

```
NAVIGATE TO: Motor Settings > FOC > General

MOTOR CURRENT LIMITS:
- Motor Current Max:        100A   (matches VESC continuous rating)
- Motor Current Max Brake:  -60A   (maximum regen current through motor)
  NOTE: Start conservative at -30A, increase after testing brake feel

BATTERY CURRENT LIMITS:
- Battery Current Max:      100A   (must not exceed BMS discharge limit)
- Battery Current Max Regen: -40A  (must not exceed BMS charge limit)
  NOTE: This is how fast regen charges the battery. Higher = more
  aggressive regen braking but more stress on battery.

ERPM LIMIT:
- Max ERPM: Calculate as (max RPM) * (motor pole pairs)
  For a 48V motor with KV=10, max RPM ~ 480
  With 20 pole pairs: Max ERPM = 480 * 20 = 9600
  Set to: 10000 ERPM (with 10% headroom)
  This prevents over-speed which can generate dangerous back-EMF

ABSOLUTE MAXIMUM CURRENT:
- Set to 150A (hardware protection, triggers fault above this)

Click "Write Motor Configuration" after all changes.
```

#### Step 3: Battery Settings

```
NAVIGATE TO: Motor Settings > FOC > General > Battery

VOLTAGE THRESHOLDS (for 16S LiFePO4 pack):
- Battery Cutoff Start:     42.0V  (2.625V/cell - begin power reduction)
- Battery Cutoff End:       40.0V  (2.500V/cell - full power cutoff)
  NOTE: LFP voltage curve is flat (3.2-3.3V) during most of discharge.
  Below 2.5V/cell risks irreversible cell damage.

- Max Input Voltage:        58.4V  (3.65V/cell * 16 = absolute max)
  NOTE: This protects VESC FETs from overvoltage during regen on full battery.

IMPORTANT: If battery is fully charged (58.4V) and regen braking is applied,
voltage could spike above max. Set Max Input Voltage to 58.4V and the VESC
will automatically limit regen current to prevent overvoltage.

Click "Write Motor Configuration" after changes.
```

#### Step 4: Regenerative Braking Configuration

```
NAVIGATE TO: Motor Settings > FOC > General

REGEN PARAMETERS (already set in Step 2, detailed explanation here):
- Motor Current Max Brake:  -30A to -60A
  This is the maximum current the motor generates during regen.
  Higher magnitude = stronger braking force.
  Start at -30A and increase in -10A increments until brake feel is satisfactory.

- Battery Current Max Regen: -20A to -40A
  This is how fast energy flows back to the battery.
  Must not exceed BMS maximum charge current.
  If BMS allows 100A charge, set to -40A for conservative regen charging.

THREE-LEVEL REGEN SWITCH WIRING:
Use ADC2 input with voltage divider to select regen level.

NAVIGATE TO: App Settings > ADC > ADC2

Configure three voltage ranges:
  Level 1 (Light):    ADC2 = 0.5-1.5V → Motor brake current = -15A
  Level 2 (Moderate): ADC2 = 2.0-3.0V → Motor brake current = -35A
  Level 3 (Maximum):  ADC2 = 3.5-4.5V → Motor brake current = -60A

IMPLEMENTATION:
Use VESC custom firmware or VESC app scripting (Lisp) to read ADC2
and dynamically set motor brake current. Example VESC Lisp script:

  (loopwhile t
    (let ((adc2 (get-adc 1)))
      (if (< adc2 1.5)
        (conf-set 'si-motor-current-min -15.0)
        (if (< adc2 3.0)
          (conf-set 'si-motor-current-min -35.0)
          (conf-set 'si-motor-current-min -60.0))))
    (sleep 0.1))

Upload via: VESC Tool > VESC Dev Tools > Lisp Scripting
```

#### Step 5: Throttle Mapping

```
NAVIGATE TO: App Settings > ADC

APPLICATION: ADC (analog throttle input)
CONTROL MODE: Current (recommended for smooth control)
  Alternative: Current No Reverse (prevents accidental reverse)

ADC INPUT CONFIGURATION:
- Voltage Start (throttle released): 0.8V
  Measure actual voltage from throttle at rest position.
  Add 0.1V margin above measured resting voltage.

- Voltage End (throttle full):        4.2V
  Measure actual voltage from throttle at full position.
  Subtract 0.1V margin below measured full voltage.

- Voltage Center:                     Not used in single-direction mode
- Deadband:                           15% (prevents creep from throttle noise)

SAFETY SETTINGS:
- Safe Start:           ENABLED (must release throttle to zero before motor starts)
- Voltage Fault Min:    0.3V   (detects disconnected throttle wire)
- Voltage Fault Max:    4.7V   (detects short to 5V)
  If voltage is below 0.3V or above 4.7V, VESC assumes throttle fault
  and cuts motor power. This prevents runaway if throttle wire breaks.

THROTTLE CURVE (optional, improves ride feel):
- Positive Ramping:     0.1 (gradual acceleration, seconds to full current)
- Negative Ramping:     0.05 (quicker deceleration response)
- These values control how fast current ramps up/down when throttle moves.

Click "Write App Configuration" after changes.
```

#### Step 6: CAN Bus for Multi-Motor Configuration

```
NAVIGATE TO: App Settings > General > CAN

FOR EACH VESC, assign a unique CAN ID:
- VESC 0: CAN ID = 0 (Master - reads throttle, distributes commands)
- VESC 1: CAN ID = 1 (Slave - Front-Right or Rear)
- VESC 2: CAN ID = 2 (Slave - for quad motor)
- VESC 3: CAN ID = 3 (Slave - for quad motor)

CAN BUS SETTINGS (same on all VESCs):
- CAN Baud Rate:        500K (standard for automotive CAN)
- CAN Status Rate:      50 Hz (sends RPM, current, voltage to other VESCs)
- Send Status:          ENABLED on ALL VESCs

MASTER VESC CONFIGURATION (VESC 0 only):
NAVIGATE TO: App Settings > ADC
- Set as primary throttle reader
- Enable "Send CAN Status" and "Multiple VESCs over CAN"
- Set "CAN Motor Count": 2 (dual), or 4 (quad)
- Set "CAN Motor IDs": 1 (dual) or 1,2,3 (quad)
- Current distribution: Equal by default

SLAVE VESC CONFIGURATION (VESC 1, 2, 3):
NAVIGATE TO: App Settings > General
- Application: No App (receives commands from Master via CAN)
- CAN Status Rate: 50 Hz

CAN BUS WIRING:
Use twisted-pair wire (CAT5 ethernet wire works for prototyping)
Terminate each end of the CAN bus with 120 ohm resistor between CAN-H and CAN-L.

[VESC 0] ─── CAN-H ───┬─── [VESC 1] ─── CAN-H ───┬─── [VESC 2] ─── CAN-H ───┬─── [VESC 3]
         ─── CAN-L ───┘                ─── CAN-L ───┘                ─── CAN-L ───┘
    [120R termination]                                                    [120R termination]

Maximum CAN bus length: 5 meters at 500K baud (sufficient for quad vehicle)
```

### 1.5 Dual/Quad Motor AWD Configuration

```
TOPOLOGY:

VESC 0 (Master, Front-Left)  ←─── CAN BUS ───→  VESC 1 (Front-Right)
                              ←─── CAN BUS ───→  VESC 2 (Rear-Left)
                              ←─── CAN BUS ───→  VESC 3 (Rear-Right)

CONTROL FLOW:
1. Master VESC 0 reads throttle (ADC1) and brake level (ADC2) inputs
2. Master calculates target motor current based on throttle position
3. Master sends current command to all slave VESCs over CAN bus
4. Each VESC runs independent FOC control loop on its motor
5. Each VESC reports wheel speed (ERPM) back over CAN status messages
6. Master monitors all wheel speeds for traction control

TRACTION CONTROL (via VESC Lisp scripting on Master):

Algorithm:
- Read ERPM from all 4 motors via CAN status messages
- Calculate average wheel speed
- If any wheel exceeds average by > 20%, reduce its current command
- Proportional reduction: current_reduction = (wheel_erpm - avg_erpm) * gain
- Gain factor: 0.1 (tune for terrain - higher = more aggressive TC)

Example VESC Lisp script for basic traction control:

  (loopwhile t
    (let ((rpm0 (canget-rpm 0))
          (rpm1 (canget-rpm 1))
          (rpm2 (canget-rpm 2))
          (rpm3 (canget-rpm 3))
          (avg (/ (+ rpm0 rpm1 rpm2 rpm3) 4.0))
          (threshold (* avg 1.2)))
      ;; Reduce current to any wheel spinning > 20% above average
      (if (> rpm1 threshold)
        (canset-current-rel 1 (* (get-adc 0) 0.5))  ; 50% current
        (canset-current-rel 1 (get-adc 0)))           ; full current
      ;; Repeat for VESCs 2 and 3
    )
    (sleep 0.02))  ; 50 Hz control loop

DIFFERENTIAL STEERING ASSIST (optional):
For zero-turn or tight steering, reduce inner wheel speed proportional
to steering angle. Requires steering position sensor on ADC3.
```

### 1.6 Safety Checklist Before First Power-Up

```
PRE-POWER CHECKLIST:
[ ] All phase wires secure and insulated (no exposed copper)
[ ] Hall sensor connector fully seated
[ ] Battery fuse installed and rated at 200A DC
[ ] Precharge circuit functional (test with multimeter on VESC B+ capacitors)
[ ] CAN bus terminated with 120 ohm at each end
[ ] Throttle returns to zero when released (test with multimeter on signal wire)
[ ] Motor free to rotate (wheel lifted off ground or motor unmounted)
[ ] Kill switch wired and functional (cuts main contactor)
[ ] All VESC firmware updated to same version
[ ] Motor detection completed successfully

FIRST POWER-UP SEQUENCE:
1. Lift all wheels off ground (jack stands or workbench)
2. Enable precharge, wait 3 seconds
3. Close main contactor
4. Connect VESC Tool via USB
5. Slowly advance throttle, verify correct motor rotation direction
6. If direction is wrong: swap any two motor phase wires (A/B or B/C)
7. Test regen braking: spin wheel by hand, observe deceleration
8. Test throttle fault: disconnect throttle wire, verify motor stops
9. Test CAN communication: verify all slave VESCs show in VESC Tool
10. Lower vehicle, test at walking speed in open area
```

---

## 2. LiFePO4 BMS Wiring & Configuration

### 2.1 Overview

The Battery Management System protects LiFePO4 cells from overvoltage, undervoltage, overcurrent, short circuit, and thermal abuse. It performs cell balancing to keep all cells at equal state of charge. For the Sovereign Quad, we support three open-source BMS options by tier.

### 2.2 BMS Selection by Tier

| Tier | BMS | Config | Current Rating | Key Features | Est. Price |
|------|-----|--------|----------------|--------------|------------|
| **T1-T2** | Libre Solar BMS | 16S, configurable | 100A charge/discharge | Open-source hardware + firmware, CAN bus, passive balancing | $50-150 |
| **T1-T2** | ENNOID-BMS (alt) | 16S, scalable | Configurable up to 200A | Open-source, active balancing option, flexible topology | $100-300 |
| **T3** | foxBMS | Automotive-certified | 100A+ | Open-source, TUV road-homologated, SoC estimation, CAN telemetry | $200-500 |

### 2.3 Cell Pack Wiring (16S LiFePO4)

#### 16S1P Configuration (Tier 1: 4.8 kWh per module)

```
CELL PACK ASSEMBLY (16 cells in series):

Each cell: 3.2V nominal, 100Ah, prismatic LiFePO4 (EVE LF100LA or equivalent)
Pack voltage: 3.2V * 16 = 51.2V nominal (40V empty, 58.4V full)
Pack energy: 51.2V * 100Ah = 5,120 Wh (5.1 kWh)

SERIES WIRING:

Cell 1 [-] ─── Cell 1 [+/─] ─── Cell 2 [+/─] ─── ... ─── Cell 16 [+]
  |                |                |                          |
  GND             BAL1            BAL2                       BAL16
  |                |                |                          |
  └────────────────┴────────────────┴──── ... ────────────────┘
                          TO BMS BALANCE CONNECTOR
                          (17-pin: GND + 16 cell taps)

CRITICAL ASSEMBLY NOTES:
- Use nickel-plated copper busbars (not welded tabs) for prismatic cells
- Torque busbar bolts to manufacturer spec (typically 4-6 Nm)
- Apply dielectric grease to busbar connections to prevent corrosion
- Install fiber insulation sheets between each cell (prevents short circuit)
- Alternate cell orientation (+ left, - left, + left...) to minimize busbar length
- Use heat-shrink tubing on all exposed terminals

BALANCE WIRE CONNECTION ORDER:
ALWAYS connect balance wires BEFORE connecting main power leads.
Start from Cell 1 negative (GND), then each cell junction in order.
Wire gauge: 22 AWG is sufficient (balance current is only 100-200mA)

Wire #  Connection Point              Expected Voltage (vs GND)
------  -------------------------     -------------------------
0       Cell 1 negative (GND)         0V
1       Cell 1 positive / Cell 2 neg  3.2V
2       Cell 2 positive / Cell 3 neg  6.4V
3       Cell 3 positive / Cell 4 neg  9.6V
...
16      Cell 16 positive              51.2V (full pack voltage)
```

#### Main Power Path

```
DISCHARGE PATH:
[PACK -] ──── [CURRENT SHUNT (200A/75mV)] ──── [BMS LOW-SIDE MOSFETs] ──── [OUTPUT -]
[PACK +] ──── [200A DC FUSE] ──── [OUTPUT +]

CHARGE PATH:
[CHARGER +] ──── [OUTPUT +] (same terminal)
[CHARGER -] ──── [OUTPUT -] (BMS controls charge enable via MOSFETs)

CURRENT SHUNT:
- Purpose: Measures pack current for SoC estimation and overcurrent protection
- Type: 200A/75mV shunt resistor (standard value)
- Placement: Between pack negative and BMS low-side FETs
- Connected to BMS current sense inputs (typically differential analog input)

BMS MOSFET BANK:
- Libre Solar BMS uses N-channel MOSFETs on the low side (negative path)
- Typical: 4-8 MOSFETs in parallel for 100A+ capability
- MOSFETs provide: charge enable, discharge enable, short circuit disconnect
- Response time: < 200 microseconds for short circuit (hardware comparator)

WIRING GAUGE:
- Main power cables: 4/0 AWG tinned copper (good for 200A continuous)
- Short runs (< 0.5m) inside enclosure: 2 AWG acceptable at 100A
- All crimped terminals: Use hydraulic crimper, not hammer-type
- Apply heat-shrink with adhesive lining to all crimps
```

### 2.4 BMS Configuration Parameters

#### Libre Solar BMS Configuration

```yaml
# ──────────────────────────────────────────────────
# Libre Solar BMS Configuration File
# FlowMobile Sovereign Quad - 16S LiFePO4
# ──────────────────────────────────────────────────

# Cell Chemistry
cell_type: LiFePO4
num_cells: 16

# ── Voltage Thresholds ──────────────────────────
# These values are CRITICAL for cell longevity and safety.
# LFP cells have a narrow usable voltage range (2.5-3.65V).
# The flat discharge curve (3.2-3.3V for 80% of capacity) makes
# precise voltage monitoring essential.

cell_overvoltage:           3.65    # V - Disconnect charge FET
cell_overvoltage_recovery:  3.55    # V - Resume charging
cell_overvoltage_delay:     2       # seconds - Filter noise/transients

cell_undervoltage:          2.50    # V - Disconnect load FET
cell_undervoltage_recovery: 2.70    # V - Resume discharging
cell_undervoltage_delay:    2       # seconds

# Pack-level thresholds (calculated from cell thresholds):
# Pack overvoltage:  3.65V * 16 = 58.4V
# Pack undervoltage: 2.50V * 16 = 40.0V

# ── Current Limits ──────────────────────────────

charge_current_max:         100     # A - Maximum charge rate (1C for 100Ah cells)
discharge_current_max:      100     # A - Maximum discharge (1C continuous)

# Overcurrent protection:
overcurrent_charge:         120     # A - Trip threshold (120% of max)
overcurrent_discharge:      150     # A - Trip threshold (150% of max)
overcurrent_delay:          5       # seconds - Time before disconnect

# Short circuit protection (hardware-level, not configurable on all BMS):
short_circuit_current:      400     # A - Immediate MOSFET disconnect
short_circuit_delay:        200     # microseconds - Hardware comparator response

# ── Temperature Protection ──────────────────────
# LFP cells must NOT be charged below 0C (risk of lithium plating).
# This is the single most important temperature limit.

charge_temp_max:            45      # C - Disconnect charge above this
charge_temp_min:            0       # C - CRITICAL: No charging below 0C
discharge_temp_max:         60      # C - Disconnect load above this
discharge_temp_min:         -20     # C - LFP can discharge to -20C (reduced capacity)

temp_sensor_count:          4       # Minimum 4 NTC 10K sensors per module
temp_sensor_placement:              # Place on: cell 1, cell 8, cell 16, and BMS FETs

# ── Cell Balancing ──────────────────────────────
# Passive balancing: Bleeder resistors discharge high cells.
# Active balancing (ENNOID): Transfers charge from high to low cells.
# For Libre Solar: Passive balancing only.

balance_method:             passive
balance_start_voltage:      3.40    # V - Begin balancing when any cell reaches this
balance_max_difference:     0.010   # V - Target: all cells within 10mV of each other
balance_current:            100     # mA - Per-cell passive balancing current
balance_min_voltage:        3.20    # V - Don't balance below this (wastes energy)
balance_during_charge:      true    # Balance while charging (most effective)
balance_during_discharge:   false   # Don't balance during discharge (negligible effect)

# ── Communication ───────────────────────────────
can_bus_enabled:            true
can_bus_id:                 0x10    # BMS CAN address (avoid conflict with VESC IDs 0-3)
can_baud_rate:              500000  # 500K baud (match VESC CAN settings)
can_status_rate:            10      # Hz - BMS telemetry broadcast rate

# CAN messages broadcast:
# - Pack voltage, current, SOC percentage
# - Min/max cell voltage and which cell
# - Min/max temperature and which sensor
# - Fault flags (OV, UV, OC, OT, short circuit)

# ── State of Charge Estimation ──────────────────
soc_method:                 coulomb_counting  # Integrates current over time
soc_reset_voltage:          3.45    # V/cell - Reset SOC to 100% when all cells reach this during charge
soc_empty_voltage:          2.80    # V/cell - Reset SOC to 0% when any cell reaches this
```

#### foxBMS Setup (Tier 3 - Automotive Certified)

```
foxBMS provides automotive-grade BMS functionality on STM32 hardware.
Open-source at github.com/foxBMS.

ADDITIONAL FEATURES OVER LIBRE SOLAR:
- Redundant cell voltage measurement (two independent ADC channels)
- Model-based SOC estimation (Extended Kalman Filter)
- Contactor state machine with pre-charge sequencing
- Diagnostic trouble codes (DTC) with CAN reporting
- ISO 26262 ASIL-B design methodology
- Thermal management output (cooling fan / heater control)

SETUP PROCEDURE:
1. Flash foxBMS firmware to STM32F4 or STM32H7 BMS master board
2. Connect cell voltage sense wires (same as Libre Solar wiring)
3. Connect current sense shunt (same placement)
4. Connect temperature sensors (NTC 10K, minimum 4 per module)
5. Configure via foxBMS configuration tool (JSON config file):
   - Same voltage/current/temperature parameters as above
   - Additional: Enable redundant measurement validation
   - Additional: Configure contactor control outputs
   - Additional: Set DTC thresholds and logging
6. CAN bus telemetry uses standard foxBMS protocol
   - Compatible with Grafana/Prometheus via CAN-to-MQTT bridge
```

### 2.5 Hot-Swap Battery Module Design

```
PURPOSE: Enable field replacement of battery modules without tools or
shutdown. Each module is a self-contained unit with integrated BMS,
protection, and status indication.

MODULE ENCLOSURE (IP68 Aluminum Die-Cast):
┌──────────────────────────────────────────────────────┐
│                                                      │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐           │
│  │ CELL  │ │ CELL  │ │ CELL  │ │ CELL  │ ... x16   │
│  │  1    │ │  2    │ │  3    │ │  4    │  in series │
│  └───────┘ └───────┘ └───────┘ └───────┘           │
│                                                      │
│  ┌──────────────┐  ┌──────────────────────┐         │
│  │     BMS      │  │  TEMPERATURE SENSORS │         │
│  │    BOARD     │  │     NTC 10K x4       │         │
│  └──────────────┘  └──────────────────────┘         │
│                                                      │
│  ┌───────────────────────────────────────┐           │
│  │   ANDERSON SB350 CONNECTOR            │           │
│  │   (EXTERNAL, IP67 SEALED BOOT)        │  <─── Quick-disconnect
│  │   350A rated, color-coded (RED = +)   │       for hot-swap
│  └───────────────────────────────────────┘           │
│                                                      │
│  ┌──────────────┐  ┌──────────────────┐             │
│  │ STATUS LEDs  │  │   CAN BUS PORT   │             │
│  │  x3 (sealed) │  │  (M12 connector) │             │
│  └──────────────┘  └──────────────────┘             │
│                                                      │
│  ┌──────────────────────────────────────┐            │
│  │  LIFTING HANDLES (x2, fold-flat)     │            │
│  └──────────────────────────────────────┘            │
│                                                      │
│  Weight: ~45 kg (100 lbs) per module                 │
│  Dimensions: ~400mm x 300mm x 200mm                  │
│                                                      │
└──────────────────────────────────────────────────────┘

LED STATUS INDICATORS:
GREEN  = OK, state of charge > 20%
YELLOW = Balancing active OR state of charge 5-20%
RED    = Fault condition (check CAN bus for fault code)

CAN BUS REPORTS (per module):
- State of charge (SOC): 0-100%
- Pack voltage: 40.0-58.4V
- Pack current: -100A to +100A (negative = charging)
- Min/max cell voltage and cell number
- Min/max temperature and sensor number
- Fault flags: OV, UV, OC, OT, SC, comm_fail
- Cycle count: Total charge/discharge cycles

HOT-SWAP PROCEDURE:
1. Vehicle can remain powered (other modules sustain load)
2. Disconnect CAN bus M12 connector
3. Pull Anderson SB350 connector (spring-loaded contacts break cleanly)
4. Lift module out using fold-flat handles
5. Slide replacement module into bay
6. Connect Anderson SB350 (keyed, cannot reverse polarity)
7. Connect CAN bus M12 connector
8. BMS auto-negotiates with vehicle system within 2 seconds
9. LED turns GREEN when ready

PARALLEL MODULE CONNECTION:
Modules connect in parallel to vehicle power bus.
Each module has its own BMS controlling charge/discharge independently.
Diode OR-ing is NOT required (BMS MOSFETs prevent reverse current).
Voltage matching: All modules must be within 2V of each other before parallel connection.
The BMS handles this automatically by refusing to close output FETs if pack
voltage differs from bus voltage by more than 2V.
```

### 2.6 Charging Configurations

```
CHARGING SOURCES:

1. GRID CHARGER (fastest):
   - Use 48V CC/CV charger, 20-50A
   - Charge voltage: 57.6V (3.60V/cell, not full 3.65V for cycle life)
   - Charge time: 100Ah / 50A = 2 hours (80% in ~1.5 hours)
   - Recommended: Mean Well HLG-600H-48 or EV charger module

2. SOLAR (daily top-up):
   - 200-800W panel array through MPPT charge controller
   - Victron SmartSolar MPPT 150/60 or EPEver Tracer 6415AN
   - MPPT set to 48V LFP profile: absorption 57.6V, float 54.4V
   - Daily harvest: 1-3.5 kWh depending on panel size and sun hours

3. REGENERATIVE BRAKING (in-motion):
   - VESC regen feeds current back through main power path
   - BMS treats regen as charging (same current limits apply)
   - Typical regen: 200-500W during deceleration
   - Energy recovery: 10-33% of energy used on hilly terrain

4. VEHICLE-TO-VEHICLE (emergency):
   - Connect two vehicles via Anderson SB350 jumper cable
   - Donor vehicle's BMS manages discharge
   - Recipient vehicle's BMS manages charge
   - Current limited to safe level by both BMS units
```

---

## 3. Meshtastic Node Configuration

### 3.1 Overview

Meshtastic is an open-source mesh networking project that uses LoRa radio for long-range, low-power text messaging, GPS tracking, and telemetry without cellular infrastructure. It provides AES-256 encrypted communication with no monthly fees. Each node costs $25-50 and achieves 10+ km range per hop with mesh relay extending coverage indefinitely.

### 3.2 Hardware Build

#### Vehicle-Mounted Node

```
COMPONENTS PER NODE:
┌────────────────────────────────────────────────────────┐
│ Component                    │ Source      │ Est. Price │
├──────────────────────────────┼────────────┼────────────┤
│ Heltec WiFi LoRa 32 V3      │ Heltec     │ $20-25     │
│ 915 MHz antenna, 3-6 dBi    │ Various    │ $5-10      │
│   (868 MHz for EU region)   │            │            │
│ SMA pigtail cable (15cm)    │ Generic    │ $3         │
│ IP67 ABS enclosure          │ Generic    │ $5-10      │
│ USB-C cable (to Pi or 12V)  │ Generic    │ $3         │
│ SMA bulkhead connector      │ Generic    │ $2-3       │
└──────────────────────────────┴────────────┴────────────┘
Total per vehicle node: ~$40-55

ASSEMBLY:
1. Mount Heltec board inside IP67 enclosure using standoffs
2. Drill hole for SMA bulkhead connector on enclosure wall
3. Connect SMA pigtail from board to bulkhead connector
4. Drill hole for USB-C bulkhead passthrough (for power/data)
5. Mount antenna externally on vehicle roll bar or antenna mast
6. Route USB-C to Raspberry Pi (serial data) or 12V-to-5V buck converter

ANTENNA PLACEMENT:
- Mount as high as possible on vehicle (top of roll bar)
- Vertical orientation for omnidirectional ground-plane pattern
- Keep minimum 0.5m from metal body panels
- Use ground-plane antenna (5.8 dBi) for maximum range
```

#### Solar Relay Node (Fixed Infrastructure)

```
COMPONENTS:
┌────────────────────────────────────────────────────────┐
│ Component                    │ Source      │ Est. Price │
├──────────────────────────────┼────────────┼────────────┤
│ Heltec WiFi LoRa 32 V3      │ Heltec     │ $20-25     │
│ 915 MHz antenna, 6 dBi      │ Various    │ $8-15      │
│ 5W solar panel (6V output)  │ Various    │ $8-12      │
│ TP4056 charge module w/DW01 │ Generic    │ $1-2       │
│ 18650 Li-ion cell 3000mAh+  │ Samsung/LG │ $3-5       │
│ 18650 holder                │ Generic    │ $1         │
│ Weatherproof enclosure IP67 │ Generic    │ $5-10      │
│ N-type to SMA adapter       │ Generic    │ $3-5       │
│ Pole mount bracket           │ Generic    │ $5-10      │
└──────────────────────────────┴────────────┴────────────┘
Total per relay node: ~$55-90

POWER BUDGET:
- Average current draw: 50-100mA (transmit bursts ~300mA, sleep ~20mA)
- Solar input: 5W panel * 5 peak sun hours = 25Wh/day
- Battery capacity: 3.7V * 3.0Ah = 11.1Wh
- Runtime without sun: 11.1Wh / (0.075A * 3.7V) = ~40 hours
- With solar: Indefinite operation in most climates (> 3 sun hours/day)

ASSEMBLY:
1. Solder TP4056 charge module between solar panel and 18650 holder
2. Connect TP4056 output to Heltec board VIN and GND pins
3. Mount board in weatherproof enclosure with silica gel packets
4. Route antenna cable through waterproof cable gland
5. Mount solar panel on top of enclosure or angled bracket
6. Mount entire assembly on pole, tree, or building with clear line of sight
7. Elevation is everything: 10m height doubles effective range
```

### 3.3 Firmware Flash & Configuration

```bash
#!/bin/bash
# ──────────────────────────────────────────────────
# Meshtastic Node Configuration Script
# FlowMobile Sovereign Quad
# ──────────────────────────────────────────────────

# Prerequisites: Python 3.8+, USB drivers for CH340/CP2102
# Install Meshtastic CLI
pip install meshtastic

# ── Flash Firmware ──────────────────────────────
# Connect node via USB-C cable
# This downloads and flashes the latest stable Meshtastic firmware
meshtastic --firmware-update
# Follow on-screen prompts to select device type (Heltec V3)

# ── Region Configuration ────────────────────────
# CRITICAL: Must match your regulatory region
# US/Canada: US (915 MHz)
# Europe: EU_868 (868 MHz)
# Australia: ANZ (915-928 MHz)
meshtastic --set lora.region US

# ── Radio Preset ────────────────────────────────
# LONG_FAST: Good balance of range and throughput
#   - Range: 5-15 km typical, 20+ km line-of-sight
#   - Data rate: ~6.8 kbps
#   - Good for: General use, vehicle convoys
#
# LONG_SLOW: Maximum range, lower throughput
#   - Range: 15-30+ km line-of-sight
#   - Data rate: ~0.2 kbps
#   - Good for: Relay nodes in remote areas
#
# MEDIUM_FAST: Shorter range, higher throughput
#   - Range: 3-8 km typical
#   - Data rate: ~16 kbps
#   - Good for: Dense mesh, more frequent updates
meshtastic --set lora.modem_preset LONG_FAST

# ── Device Role ─────────────────────────────────
# CLIENT: Normal mobile node (default)
#   - Sends/receives messages, reports position
#   - Sleeps between transmissions to save power
#
# ROUTER: Fixed relay node
#   - Always listening, rebroadcasts all messages
#   - Higher power consumption but extends mesh range
#   - Use for solar-powered hilltop relays
#
# CLIENT_MUTE: Receives but doesn't rebroadcast
#   - Reduces mesh congestion in dense networks
#   - Good for passive monitoring nodes

# For vehicle-mounted nodes:
meshtastic --set device.role CLIENT

# For fixed solar relay nodes:
# meshtastic --set device.role ROUTER

# ── Channel Configuration ───────────────────────
# Create encrypted channel for convoy/group communication
meshtastic --ch-set name "FlowMobile" --ch-index 0

# Generate random AES-256 encryption key for the channel
meshtastic --ch-set psk random --ch-index 0

# Share channel configuration with other nodes:
# This generates a URL/QR code containing channel name + encryption key
# Share this URL with trusted members ONLY (it contains the encryption key)
meshtastic --qr
# Or get shareable URL:
meshtastic --ch-url

# To join an existing channel on a new node:
# meshtastic --ch-url "https://meshtastic.org/e/#..."

# ── Position Reporting ──────────────────────────
# Enable GPS and periodic position broadcasts
meshtastic --set position.gps_enabled true

# Position broadcast interval (seconds)
# 120 = every 2 minutes (good for moving vehicles)
# 300 = every 5 minutes (good for stationary relay nodes)
meshtastic --set position.position_broadcast_secs 120

# Smart position: Also broadcast on significant movement
meshtastic --set position.position_broadcast_smart_enabled true

# ── Telemetry ───────────────────────────────────
# Enable environment sensor telemetry (if BME280/BMP280 connected)
meshtastic --set telemetry.environment_measurement_enabled true
meshtastic --set telemetry.environment_update_interval 300  # Every 5 min

# Device metrics (battery voltage, channel utilization)
meshtastic --set telemetry.device_update_interval 300  # Every 5 min

# ── Node Identity ───────────────────────────────
# Set a human-readable name for this node (shows in mesh network)
meshtastic --set-owner "FlowQuad-1"
# Or for relay: meshtastic --set-owner "Relay-Hilltop-A"

# ── Power Optimization ──────────────────────────
# For vehicle nodes (USB powered, no battery concern):
meshtastic --set power.ls_secs 0  # Disable light sleep (always listening)

# For solar relay nodes (battery conservation):
# meshtastic --set power.ls_secs 300  # Light sleep after 5 min idle
# meshtastic --set power.min_wake_secs 10  # Minimum wake time

# ── Verify Configuration ────────────────────────
echo "=== Current Configuration ==="
meshtastic --info

echo ""
echo "=== Node List (nearby nodes) ==="
meshtastic --nodes

echo ""
echo "Configuration complete. Test with: meshtastic --sendtext 'Hello from FlowQuad'"
```

### 3.4 Network Topology for Convoy Operations

```
CONVOY MESH NETWORK:

  [VEHICLE 1]            [VEHICLE 2]            [VEHICLE 3]
  "FlowQuad-1"           "FlowQuad-2"           "FlowQuad-3"
   CLIENT node            CLIENT node             CLIENT node
   6 dBi antenna          6 dBi antenna           6 dBi antenna
       |                      |                       |
       └────── LoRa MESH ─────┴────── LoRa MESH ──────┘
                               |
                        [FIXED RELAY]
                        "Relay-Hill-A"
                         ROUTER node
                       solar powered
                     6 dBi antenna
                     on hilltop/tower
                            |
                     Range: 10+ km
                     per hop, LOS
                            |
                        [FIXED RELAY]
                        "Relay-Hill-B"
                            |
                     [HOMESTEAD BASE]
                     "Base-Station"
                      CLIENT node
                    connected to Pi
                   for data logging

RANGE ESTIMATES (LONG_FAST preset):
- Vehicle to vehicle (ground level): 2-5 km (terrain dependent)
- Vehicle to hilltop relay: 10-20 km (with clear line-of-sight)
- Relay to relay (elevated): 20-50+ km (record: 254 km with directional antennas)

MESH CAPABILITIES:
- Text messaging: Up to 228 bytes per message, store-and-forward
- GPS tracking: Real-time position of all nodes on map
- Telemetry: Battery voltage, temperature, humidity from each node
- Waypoints: Share GPS waypoints across the mesh
- Range test: Built-in RSSI/SNR measurement between nodes
- No internet required: Fully offline peer-to-peer operation

CAPACITY PLANNING:
- Maximum practical mesh size: 30-50 nodes (channel congestion above this)
- Message throughput: ~20 messages/minute across entire mesh
- Position updates from 10 vehicles at 2-min intervals: 5 messages/minute (fine)
- For larger networks: Use multiple channels or reduce broadcast frequency

ATAK INTEGRATION:
- Meshtastic Android app provides ATAK plugin
- Vehicle positions appear as markers on ATAK tactical map
- Messages route through mesh to ATAK devices
- Waypoints shared between Meshtastic and ATAK
- Requires: Android device running both Meshtastic and ATAK-CIV apps
```

### 3.5 Raspberry Pi Serial Bridge

```
PURPOSE: Connect Meshtastic node to Raspberry Pi for data logging,
web interface, and integration with vehicle telemetry system.

WIRING:
[Heltec LoRa 32 V3] ──── USB-C cable ──── [Raspberry Pi 5 USB-A port]

The Heltec board appears as a serial device on the Pi:
/dev/ttyUSB0 or /dev/ttyACM0

PYTHON INTEGRATION:
pip install meshtastic

# Example: Log all mesh messages to file and forward to MQTT
import meshtastic
import meshtastic.serial_interface
from pubsub import pub

def on_receive(packet, interface):
    """Handle incoming mesh packets"""
    print(f"Received: {packet}")
    # Forward to MQTT for Grafana/Prometheus integration
    # mqtt_client.publish("mesh/incoming", json.dumps(packet))

def on_connection(interface, topic=pub.AUTO_TOPIC):
    print("Connected to Meshtastic node")

pub.subscribe(on_receive, "meshtastic.receive")
pub.subscribe(on_connection, "meshtastic.connection.established")

interface = meshtastic.serial_interface.SerialInterface()

# Send a message
interface.sendText("Vehicle 1 online")

# Get node list
for node in interface.nodes.values():
    print(f"Node: {node['user']['longName']}, "
          f"SNR: {node.get('snr', 'N/A')}, "
          f"Position: {node.get('position', 'N/A')}")
```

---

## 4. Raspberry Pi Sovereignty Stack Setup

### 4.1 Overview

The Raspberry Pi 5 serves as the vehicle's sovereign computing platform, providing self-hosted cloud services, encrypted storage, VPN connectivity, ad/tracker blocking, vehicle telemetry dashboards, offline maps, and cryptocurrency wallet functionality. All services run locally with no cloud dependency.

### 4.2 Hardware Assembly

```
HARDWARE CONFIGURATION:

[RASPBERRY PI 5 (8GB RAM)] ──── [NVMe HAT + 1TB SSD]
        |
        ├── [Ethernet RJ45] → Vehicle LAN switch (optional, for wired devices)
        ├── [WiFi 6]        → Local access point for phones/tablets/laptops
        ├── [USB-C Power]   → 48V-to-5V/5A buck converter from vehicle battery
        ├── [USB-A #1]      → Meshtastic node serial connection
        ├── [USB-A #2]      → Available (USB drive, SDR dongle, etc.)
        └── [GPIO Header]   → Vehicle telemetry sensors (I2C, SPI, UART)

ENCLOSURE ASSEMBLY:

[IP67 ALUMINUM ENCLOSURE (acts as Faraday shield)]
┌──────────────────────────────────────────────────┐
│                                                  │
│  [Pi 5 + NVMe HAT]     [48V→5V Buck Converter]  │
│  mounted on standoffs   (Tobsun EA15-S05, 3A)   │
│                                                  │
│  ── Internal Wiring ──                           │
│  Buck output → USB-C to Pi                       │
│  Buck input  → Bulkhead Anderson PP15 connector  │
│                                                  │
│  ── Bulkhead Connectors (IP67) ──                │
│  [Anderson PP15]  → 48V power input              │
│  [RJ45 bulkhead]  → Ethernet passthrough         │
│  [USB-C bulkhead]  → Debug/maintenance access    │
│  [SMA bulkhead]   → External WiFi antenna        │
│  [Status LED]     → Green (power), Blue (WiFi)   │
│                                                  │
│  ── Grounding ──                                 │
│  Single-point chassis ground via enclosure bolt   │
│  EMI gasket on enclosure lid                     │
│                                                  │
│  ── Thermal ──                                   │
│  Thermal pad from Pi CPU to enclosure wall       │
│  Enclosure acts as heatsink (aluminum)           │
│                                                  │
└──────────────────────────────────────────────────┘

POWER SUPPLY:
- Input: 40-58V from vehicle battery (48V nominal)
- Buck converter: Tobsun EA15-S05 or similar
  - Input: 36-75V DC (wide range handles LFP voltage curve)
  - Output: 5V, 3A (15W, Pi 5 draws 5-12W typical)
  - Efficiency: >90%
- Add 1000uF electrolytic capacitor on input for voltage transient filtering
- Add TVS diode (P6KE62A) on input for surge protection
```

### 4.3 Software Installation Script

```bash
#!/bin/bash
# ══════════════════════════════════════════════════════════
# FlowMobile Sovereignty Stack Installer
# Run on fresh Raspberry Pi OS (64-bit, Bookworm or later)
# Estimated install time: 30-60 minutes (depends on internet speed)
# Storage requirement: ~20 GB for all services
# ══════════════════════════════════════════════════════════

set -e  # Exit on any error
LOG_FILE="/var/log/sovereignty-install.log"

echo "=== FlowMobile Sovereignty Stack Setup ===" | tee -a "$LOG_FILE"
echo "Started: $(date)" | tee -a "$LOG_FILE"

# ── System Update ────────────────────────────────
echo "[1/9] Updating system packages..." | tee -a "$LOG_FILE"
sudo apt update && sudo apt upgrade -y 2>&1 | tee -a "$LOG_FILE"

# ── Full-Disk Encryption Notice ──────────────────
echo "[NOTE] LUKS full-disk encryption should be configured during OS installation."
echo "       For post-install encryption of the NVMe data partition:"
echo "       sudo cryptsetup luksFormat /dev/nvme0n1p2"
echo "       sudo cryptsetup luksOpen /dev/nvme0n1p2 sovereignty_data"
echo "       sudo mkfs.ext4 /dev/mapper/sovereignty_data"
echo "       sudo mount /dev/mapper/sovereignty_data /mnt/sovereignty"

# ── Docker Installation ──────────────────────────
echo "[2/9] Installing Docker..." | tee -a "$LOG_FILE"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh 2>&1 | tee -a "$LOG_FILE"
    sudo usermod -aG docker "$USER"
    echo "Docker installed. Group membership will apply after next login."
else
    echo "Docker already installed, skipping."
fi

# ── Create Directory Structure ───────────────────
echo "[3/9] Creating sovereignty directory structure..." | tee -a "$LOG_FILE"
mkdir -p ~/sovereignty/{nextcloud,vaultwarden,monitoring,maps,backups}

# ── Nextcloud (Self-Hosted Cloud Storage) ────────
echo "[4/9] Setting up Nextcloud..." | tee -a "$LOG_FILE"
cat > ~/sovereignty/nextcloud/docker-compose.yml << 'NEXTCLOUD_EOF'
version: '3.8'
services:
  nextcloud-db:
    image: mariadb:11
    container_name: nextcloud-db
    environment:
      - MYSQL_ROOT_PASSWORD=changeme_root_password
      - MYSQL_DATABASE=nextcloud
      - MYSQL_USER=nextcloud
      - MYSQL_PASSWORD=changeme_nc_password
    volumes:
      - nextcloud_db:/var/lib/mysql
    restart: unless-stopped

  nextcloud:
    image: nextcloud:latest
    container_name: nextcloud
    ports:
      - "8080:80"
    volumes:
      - nextcloud_data:/var/www/html
      - nextcloud_files:/var/www/html/data
    environment:
      - MYSQL_HOST=nextcloud-db
      - MYSQL_DATABASE=nextcloud
      - MYSQL_USER=nextcloud
      - MYSQL_PASSWORD=changeme_nc_password
      - NEXTCLOUD_ADMIN_USER=admin
      - NEXTCLOUD_ADMIN_PASSWORD=changeme_admin_password
      - NEXTCLOUD_TRUSTED_DOMAINS=localhost 192.168.4.1
    depends_on:
      - nextcloud-db
    restart: unless-stopped

volumes:
  nextcloud_db:
  nextcloud_data:
  nextcloud_files:
NEXTCLOUD_EOF

# ── Vaultwarden (Password Manager) ──────────────
echo "[5/9] Setting up Vaultwarden..." | tee -a "$LOG_FILE"
cat > ~/sovereignty/vaultwarden/docker-compose.yml << 'VAULT_EOF'
version: '3.8'
services:
  vaultwarden:
    image: vaultwarden/server:latest
    container_name: vaultwarden
    ports:
      - "8081:80"
    volumes:
      - vw_data:/data
    environment:
      - SIGNUPS_ALLOWED=true
      - ADMIN_TOKEN=changeme_admin_token_use_argon2_hash
      - DOMAIN=http://192.168.4.1:8081
      - LOG_LEVEL=warn
    restart: unless-stopped

volumes:
  vw_data:
VAULT_EOF

# ── WireGuard VPN ────────────────────────────────
echo "[6/9] Setting up WireGuard VPN..." | tee -a "$LOG_FILE"
sudo apt install -y wireguard 2>&1 | tee -a "$LOG_FILE"

# Generate WireGuard keys
WG_PRIVATE=$(wg genkey)
WG_PUBLIC=$(echo "$WG_PRIVATE" | wg pubkey)

# Create WireGuard configuration
sudo tee /etc/wireguard/wg0.conf > /dev/null << WG_EOF
[Interface]
Address = 10.0.0.1/24
ListenPort = 51820
PrivateKey = ${WG_PRIVATE}
# Enable IP forwarding
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o wlan0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o wlan0 -j MASQUERADE

# Add peers below:
# [Peer]
# PublicKey = <peer_public_key>
# AllowedIPs = 10.0.0.2/32
WG_EOF

sudo chmod 600 /etc/wireguard/wg0.conf
echo "WireGuard public key: ${WG_PUBLIC}"
echo "WireGuard public key: ${WG_PUBLIC}" >> "$LOG_FILE"

# ── Pi-hole (DNS Ad/Tracker Blocking) ───────────
echo "[7/9] Setting up Pi-hole..." | tee -a "$LOG_FILE"
# Use Docker instead of bare-metal for easier management
cat > ~/sovereignty/pihole-compose.yml << 'PIHOLE_EOF'
version: '3.8'
services:
  pihole:
    image: pihole/pihole:latest
    container_name: pihole
    ports:
      - "53:53/tcp"
      - "53:53/udp"
      - "8082:80/tcp"
    environment:
      - TZ=America/Chicago
      - WEBPASSWORD=changeme_pihole_password
      - DNSMASQ_LISTENING=all
    volumes:
      - pihole_etc:/etc/pihole
      - pihole_dnsmasq:/etc/dnsmasq.d
    restart: unless-stopped

volumes:
  pihole_etc:
  pihole_dnsmasq:
PIHOLE_EOF

# ── Grafana + Prometheus (Vehicle Telemetry) ────
echo "[8/9] Setting up monitoring stack..." | tee -a "$LOG_FILE"

# Prometheus configuration
mkdir -p ~/sovereignty/monitoring/prometheus
cat > ~/sovereignty/monitoring/prometheus/prometheus.yml << 'PROM_CONF_EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'vehicle-telemetry'
    static_configs:
      - targets: ['host.docker.internal:9100']
        labels:
          vehicle: 'flowquad-1'

  - job_name: 'bms-telemetry'
    static_configs:
      - targets: ['host.docker.internal:9101']
        labels:
          system: 'battery'

  - job_name: 'vesc-telemetry'
    static_configs:
      - targets: ['host.docker.internal:9102']
        labels:
          system: 'powertrain'

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['host.docker.internal:9103']
        labels:
          system: 'compute'
PROM_CONF_EOF

cat > ~/sovereignty/monitoring/docker-compose.yml << 'MON_EOF'
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prom_data:/prometheus
    extra_hosts:
      - "host.docker.internal:host-gateway"
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=changeme_grafana_password
      - GF_USERS_ALLOW_SIGN_UP=false
    restart: unless-stopped

volumes:
  prom_data:
  grafana_data:
MON_EOF

# ── WiFi Access Point Configuration ─────────────
echo "[9/9] Configuring WiFi access point..." | tee -a "$LOG_FILE"
sudo apt install -y hostapd dnsmasq 2>&1 | tee -a "$LOG_FILE"

# Configure static IP for WiFi interface
sudo tee /etc/dhcpcd.conf.d/flowmobile-ap.conf > /dev/null << 'DHCP_EOF'
interface wlan0
    static ip_address=192.168.4.1/24
    nohook wpa_supplicant
DHCP_EOF

# Configure hostapd (WiFi access point)
sudo tee /etc/hostapd/hostapd.conf > /dev/null << 'HOSTAPD_EOF'
interface=wlan0
driver=nl80211
ssid=FlowMobile-Sovereignty
hw_mode=a
channel=36
wmm_enabled=0
macaddr_acl=0
auth_algs=1
ignore_broadcast_ssid=0
wpa=2
wpa_passphrase=changeme_wifi_password
wpa_key_mgmt=WPA-PSK
wpa_pairwise=CCMP
rsn_pairwise=CCMP
country_code=US
ieee80211n=1
ieee80211ac=1
HOSTAPD_EOF

# Configure dnsmasq for DHCP on AP
sudo tee /etc/dnsmasq.d/flowmobile-ap.conf > /dev/null << 'DNSMASQ_EOF'
interface=wlan0
dhcp-range=192.168.4.2,192.168.4.50,255.255.255.0,24h
server=127.0.0.1#5353
DNSMASQ_EOF

# Enable hostapd
sudo systemctl unmask hostapd
sudo systemctl enable hostapd

# ── Start All Services ──────────────────────────
echo "Starting Docker services..." | tee -a "$LOG_FILE"
cd ~/sovereignty/nextcloud && docker compose up -d 2>&1 | tee -a "$LOG_FILE"
cd ~/sovereignty/vaultwarden && docker compose up -d 2>&1 | tee -a "$LOG_FILE"
cd ~/sovereignty && docker compose -f pihole-compose.yml up -d 2>&1 | tee -a "$LOG_FILE"
cd ~/sovereignty/monitoring && docker compose up -d 2>&1 | tee -a "$LOG_FILE"

# ── Enable IP Forwarding ────────────────────────
echo "net.ipv4.ip_forward=1" | sudo tee /etc/sysctl.d/99-flowmobile.conf
sudo sysctl -p /etc/sysctl.d/99-flowmobile.conf

# ── Summary ─────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════"
echo "  FlowMobile Sovereignty Stack Installed"
echo "══════════════════════════════════════════════════"
echo ""
echo "  Connect to WiFi: FlowMobile-Sovereignty"
echo ""
echo "  Services (from connected device):"
echo "  ├── Nextcloud:    http://192.168.4.1:8080"
echo "  ├── Vaultwarden:  http://192.168.4.1:8081"
echo "  ├── Pi-hole:      http://192.168.4.1:8082/admin"
echo "  ├── Grafana:      http://192.168.4.1:3000"
echo "  ├── Prometheus:   http://192.168.4.1:9090"
echo "  └── WireGuard:    Port 51820/UDP"
echo ""
echo "  IMPORTANT: Change all default passwords in:"
echo "  ~/sovereignty/*/docker-compose.yml"
echo ""
echo "  Log file: ${LOG_FILE}"
echo "  Completed: $(date)" | tee -a "$LOG_FILE"
```

### 4.4 Offline Maps Server

```bash
#!/bin/bash
# ══════════════════════════════════════════════════
# Offline Maps Setup for FlowMobile
# Uses tileserver-gl to serve OpenStreetMap tiles locally
# ══════════════════════════════════════════════════

# Install tileserver-gl via Docker
mkdir -p ~/sovereignty/maps/tiles

# Download MBTiles for your region from openmaptiles.org
# Example regions and approximate sizes:
#   US-West:     ~5 GB
#   US-East:     ~8 GB
#   Full US:     ~25 GB
#   Full World:  ~80 GB (requires large NVMe)
#
# Download command (replace URL with your region):
# wget -O ~/sovereignty/maps/tiles/region.mbtiles \
#   "https://openmaptiles.com/downloads/dataset/osm/north-america/us/..."

# Create tileserver Docker compose
cat > ~/sovereignty/maps/docker-compose.yml << 'MAPS_EOF'
version: '3.8'
services:
  tileserver:
    image: maptiler/tileserver-gl:latest
    container_name: tileserver
    ports:
      - "8083:8080"
    volumes:
      - ./tiles:/data
    restart: unless-stopped
    command: --verbose

volumes: {}
MAPS_EOF

cd ~/sovereignty/maps && docker compose up -d

echo "Offline maps available at: http://192.168.4.1:8083"
echo "Place .mbtiles files in ~/sovereignty/maps/tiles/"
```

### 4.5 Offline Cryptocurrency Wallet Setup

```bash
#!/bin/bash
# ══════════════════════════════════════════════════
# Offline Crypto Wallet Setup
# Air-gapped signing capability for Bitcoin and Solana
# ══════════════════════════════════════════════════

# ── Bitcoin: Electrum Wallet ─────────────────────
# Electrum supports air-gapped transaction signing
echo "Installing Electrum (Bitcoin wallet)..."
sudo apt install -y python3-pyqt5 libsecp256k1-dev
pip install electrum

# Create wallet in offline mode:
# 1. Disconnect from all networks (disable WiFi, unplug Ethernet)
# 2. Launch Electrum: electrum --offline
# 3. Create new wallet with seed phrase
# 4. WRITE DOWN SEED PHRASE ON PAPER (never digitally)
# 5. Store seed phrase in separate physical location from vehicle

# Air-gapped transaction signing workflow:
# 1. Create unsigned transaction on online device
# 2. Transfer to Pi via USB drive (QR code or file)
# 3. Sign transaction on Pi (offline, with private key)
# 4. Transfer signed transaction back to online device
# 5. Broadcast signed transaction from online device

# ── Solana: CLI Wallet ───────────────────────────
echo "Installing Solana CLI tools..."
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Generate keypair offline (disconnect network first):
# solana-keygen new --outfile ~/sovereignty/wallets/solana-wallet.json
# BACKUP the keypair file to encrypted USB drive

# Create encrypted backup directory
mkdir -p ~/sovereignty/wallets
chmod 700 ~/sovereignty/wallets

echo ""
echo "SECURITY NOTES:"
echo "1. Generate all keys OFFLINE (disconnect WiFi and Ethernet)"
echo "2. Write seed phrases on paper, store in fireproof safe"
echo "3. Encrypt wallet files with: gpg -c wallet-file.json"
echo "4. Store encrypted backups on separate USB drive"
echo "5. Test recovery from backup BEFORE storing significant funds"
echo "6. LUKS encryption on NVMe protects wallets at rest"
```

### 4.6 Automatic Backup Configuration

```bash
#!/bin/bash
# ══════════════════════════════════════════════════
# Automated Backup for Sovereignty Stack
# Runs nightly, keeps 7 daily + 4 weekly backups
# ══════════════════════════════════════════════════

mkdir -p ~/sovereignty/backups/{daily,weekly}

# Create backup script
cat > ~/sovereignty/backup.sh << 'BACKUP_EOF'
#!/bin/bash
DATE=$(date +%Y-%m-%d)
DAY_OF_WEEK=$(date +%u)
BACKUP_DIR="$HOME/sovereignty/backups"

echo "Starting sovereignty backup: ${DATE}"

# Backup Nextcloud data
docker exec nextcloud-db mysqldump -u nextcloud -pchangeme_nc_password nextcloud \
  > "${BACKUP_DIR}/daily/nextcloud-db-${DATE}.sql"

# Backup Vaultwarden
docker cp vaultwarden:/data "${BACKUP_DIR}/daily/vaultwarden-${DATE}"

# Backup Grafana dashboards
docker cp grafana:/var/lib/grafana "${BACKUP_DIR}/daily/grafana-${DATE}"

# Compress daily backup
tar -czf "${BACKUP_DIR}/daily/sovereignty-${DATE}.tar.gz" \
  "${BACKUP_DIR}/daily/nextcloud-db-${DATE}.sql" \
  "${BACKUP_DIR}/daily/vaultwarden-${DATE}" \
  "${BACKUP_DIR}/daily/grafana-${DATE}" 2>/dev/null

# Cleanup temp files
rm -rf "${BACKUP_DIR}/daily/nextcloud-db-${DATE}.sql"
rm -rf "${BACKUP_DIR}/daily/vaultwarden-${DATE}"
rm -rf "${BACKUP_DIR}/daily/grafana-${DATE}"

# Weekly backup on Sundays
if [ "$DAY_OF_WEEK" -eq 7 ]; then
    cp "${BACKUP_DIR}/daily/sovereignty-${DATE}.tar.gz" \
       "${BACKUP_DIR}/weekly/sovereignty-weekly-${DATE}.tar.gz"
fi

# Retain 7 daily backups
ls -t "${BACKUP_DIR}/daily/"*.tar.gz 2>/dev/null | tail -n +8 | xargs rm -f

# Retain 4 weekly backups
ls -t "${BACKUP_DIR}/weekly/"*.tar.gz 2>/dev/null | tail -n +5 | xargs rm -f

echo "Backup complete: ${BACKUP_DIR}/daily/sovereignty-${DATE}.tar.gz"
BACKUP_EOF

chmod +x ~/sovereignty/backup.sh

# Schedule nightly backup at 3 AM
(crontab -l 2>/dev/null; echo "0 3 * * * $HOME/sovereignty/backup.sh >> /var/log/sovereignty-backup.log 2>&1") | crontab -
echo "Nightly backup scheduled at 3:00 AM"
```

---

## 5. Vehicle Telemetry System

### 5.1 Overview

The vehicle telemetry system collects real-time data from all vehicle subsystems (motor, battery, solar, GPS, environment) via an ESP32 microcontroller, publishes it over MQTT to the Raspberry Pi, and visualizes it in Grafana dashboards. This provides the rider with comprehensive situational awareness and enables long-term data logging for maintenance and optimization.

### 5.2 Sensor Integration Architecture

```
DATA FLOW:

[ESP32 TELEMETRY NODE] ──── [CAN BUS] ──── [VESC 0-3 (motor data)]
        |                                    [BMS (battery data)]
        |
        ├── [ADC CH0] ← Battery voltage divider (100K/10K = 1:11 ratio)
        ├── [ADC CH1] ← Solar panel current sensor (ACS712-30A)
        ├── [ADC CH2] ← Solar panel voltage divider (100K/10K)
        ├── [I2C BUS] ← BME280 #1 (ambient temp, humidity, pressure)
        ├── [I2C BUS] ← INA219 (DC current/power monitor, solar input)
        ├── [I2C BUS] ← INA219 #2 (DC current/power monitor, main bus)
        ├── [UART1]   ← GPS module (u-blox NEO-M9N, 10 Hz update)
        ├── [GPIO]    ← Water level sensor (ultrasonic HC-SR04)
        └── [WiFi]    → Raspberry Pi (MQTT broker at 192.168.4.1:1883)

MQTT TOPICS PUBLISHED:
  flowmobile/battery/voltage          # Pack voltage (V)
  flowmobile/battery/current          # Pack current (A, negative = charging)
  flowmobile/battery/soc              # State of charge (%)
  flowmobile/battery/temp_min         # Minimum cell temperature (C)
  flowmobile/battery/temp_max         # Maximum cell temperature (C)
  flowmobile/battery/cell_min_v       # Minimum cell voltage (V)
  flowmobile/battery/cell_max_v       # Maximum cell voltage (V)

  flowmobile/motor/0/rpm              # Motor 0 RPM
  flowmobile/motor/0/current          # Motor 0 current draw (A)
  flowmobile/motor/0/temp             # Motor 0 temperature (C)
  flowmobile/motor/0/power            # Motor 0 power output (W)
  flowmobile/motor/1/rpm              # (same for motors 1-3)

  flowmobile/solar/voltage            # Solar panel voltage (V)
  flowmobile/solar/current            # Solar input current (A)
  flowmobile/solar/power              # Solar power (W)
  flowmobile/solar/harvest_today      # Cumulative Wh harvested today

  flowmobile/gps/latitude             # Decimal degrees
  flowmobile/gps/longitude            # Decimal degrees
  flowmobile/gps/speed                # km/h
  flowmobile/gps/heading              # Degrees from north
  flowmobile/gps/altitude             # Meters above sea level
  flowmobile/gps/satellites           # Number of satellites in fix

  flowmobile/environment/temperature  # Ambient temperature (C)
  flowmobile/environment/humidity     # Relative humidity (%)
  flowmobile/environment/pressure     # Barometric pressure (hPa)
  flowmobile/environment/altitude_baro # Barometric altitude (m)

  flowmobile/water/level              # Water tank level (%)

  flowmobile/system/uptime            # System uptime (seconds)
  flowmobile/system/wifi_rssi         # WiFi signal strength (dBm)
  flowmobile/mesh/node_count          # Meshtastic nodes in range
```

### 5.3 ESP32 Telemetry Firmware

```
HARDWARE REQUIREMENTS:
- ESP32-WROOM-32 or ESP32-S3 development board
- MCP2515 CAN bus transceiver module (SPI interface)
- ACS712-30A current sensor (for solar input measurement)
- BME280 breakout board (I2C address 0x76 or 0x77)
- INA219 breakout board (I2C address 0x40 or 0x41)
- u-blox NEO-M9N GPS module (UART, 9600 baud default)
- HC-SR04 ultrasonic sensor (for water tank level)
- Voltage divider resistors: 100K + 10K (1% tolerance, 1/4W)

WIRING SUMMARY:
ESP32 Pin    Connection                    Notes
---------    --------------------------    -------------------------
GPIO 5       MCP2515 CS (SPI)              CAN bus chip select
GPIO 18      MCP2515 SCK (SPI)             SPI clock
GPIO 19      MCP2515 MISO (SPI)            SPI data in
GPIO 23      MCP2515 MOSI (SPI)            SPI data out
GPIO 2       MCP2515 INT                   CAN interrupt

GPIO 21      I2C SDA (BME280, INA219)      Shared I2C bus
GPIO 22      I2C SCL (BME280, INA219)      Shared I2C bus

GPIO 36      ADC - Battery voltage divider  ADC1_CH0 (input only)
GPIO 39      ADC - Solar current sensor     ADC1_CH3 (input only)
GPIO 34      ADC - Solar voltage divider    ADC1_CH6 (input only)

GPIO 16      UART1 RX (GPS TX)             GPS data receive
GPIO 17      UART1 TX (GPS RX)             GPS commands

GPIO 25      HC-SR04 Trigger               Water level trigger
GPIO 26      HC-SR04 Echo                  Water level echo

FIRMWARE FRAMEWORK: Arduino or ESP-IDF with these libraries:
- WiFi.h (ESP32 WiFi)
- PubSubClient (MQTT client)
- mcp_can.h (CAN bus via MCP2515)
- Wire.h (I2C for BME280, INA219)
- Adafruit_BME280.h
- Adafruit_INA219.h
- TinyGPSPlus.h (GPS NMEA parsing)

DATA ACQUISITION LOOP (pseudocode):
  every 100ms:  Read CAN bus (VESC motor data, BMS data)
  every 500ms:  Read ADC sensors (voltage, current)
  every 1000ms: Read I2C sensors (BME280, INA219)
  every 1000ms: Read GPS (position, speed, heading)
  every 5000ms: Read water level (ultrasonic)
  every 1000ms: Publish all data via MQTT to Raspberry Pi
```

### 5.4 MQTT Broker Setup (on Raspberry Pi)

```bash
#!/bin/bash
# Install Mosquitto MQTT broker on Raspberry Pi

sudo apt install -y mosquitto mosquitto-clients

# Configure Mosquitto
sudo tee /etc/mosquitto/conf.d/flowmobile.conf > /dev/null << 'MQTT_EOF'
listener 1883
allow_anonymous true
max_queued_messages 1000
persistence true
persistence_location /var/lib/mosquitto/
log_dest syslog
MQTT_EOF

# For production, add authentication:
# sudo mosquitto_passwd -c /etc/mosquitto/passwd flowmobile
# Then add to config:
# password_file /etc/mosquitto/passwd
# allow_anonymous false

sudo systemctl enable mosquitto
sudo systemctl restart mosquitto

echo "MQTT broker running on port 1883"
echo "Test with: mosquitto_sub -t 'flowmobile/#' -v"
```

### 5.5 Prometheus MQTT Exporter

```bash
#!/bin/bash
# Bridge MQTT telemetry data to Prometheus metrics
# Uses mqtt2prometheus exporter

# Install via Docker
cat > ~/sovereignty/monitoring/mqtt-exporter-compose.yml << 'EXPORTER_EOF'
version: '3.8'
services:
  mqtt-exporter:
    image: hikhvar/mqtt2prometheus:latest
    container_name: mqtt-exporter
    ports:
      - "9101:9641"
    volumes:
      - ./mqtt-exporter-config.yml:/config.yml
    command: --config /config.yml
    extra_hosts:
      - "host.docker.internal:host-gateway"
    restart: unless-stopped
EXPORTER_EOF

# Create exporter configuration
cat > ~/sovereignty/monitoring/mqtt-exporter-config.yml << 'CONFIG_EOF'
mqtt:
  server: tcp://host.docker.internal:1883
  topic_path: flowmobile/#
  qos: 0

cache:
  timeout: 300s

metrics:
  - prom_name: vehicle_battery_voltage
    mqtt_name: flowmobile/battery/voltage
    type: gauge
    help: "Battery pack voltage in volts"

  - prom_name: vehicle_battery_current
    mqtt_name: flowmobile/battery/current
    type: gauge
    help: "Battery current in amps (negative = charging)"

  - prom_name: vehicle_battery_soc
    mqtt_name: flowmobile/battery/soc
    type: gauge
    help: "Battery state of charge percentage"

  - prom_name: vehicle_motor_rpm
    mqtt_name: flowmobile/motor/+/rpm
    type: gauge
    help: "Motor RPM by motor ID"

  - prom_name: vehicle_motor_power
    mqtt_name: flowmobile/motor/+/power
    type: gauge
    help: "Motor power output in watts"

  - prom_name: vehicle_solar_power
    mqtt_name: flowmobile/solar/power
    type: gauge
    help: "Solar input power in watts"

  - prom_name: vehicle_solar_harvest_wh
    mqtt_name: flowmobile/solar/harvest_today
    type: counter
    help: "Cumulative solar harvest today in Wh"

  - prom_name: vehicle_speed_kmh
    mqtt_name: flowmobile/gps/speed
    type: gauge
    help: "Vehicle speed in km/h"

  - prom_name: vehicle_ambient_temp
    mqtt_name: flowmobile/environment/temperature
    type: gauge
    help: "Ambient temperature in Celsius"

  - prom_name: vehicle_water_level
    mqtt_name: flowmobile/water/level
    type: gauge
    help: "Water tank level percentage"
CONFIG_EOF

cd ~/sovereignty/monitoring && docker compose -f mqtt-exporter-compose.yml up -d
echo "MQTT-to-Prometheus exporter running on port 9101"
```

### 5.6 Grafana Dashboard Design

```
DASHBOARD: FlowMobile Sovereign Quad Telemetry
REFRESH RATE: 5 seconds (real-time during operation)

ROW 1: POWER OVERVIEW (4 panels)
┌──────────────┬──────────────┬──────────────┬──────────────┐
│  BATTERY SOC │  RANGE EST.  │  SOLAR INPUT │  TOTAL POWER │
│   Gauge      │   Gauge      │   Gauge      │   Stat       │
│   0-100%     │   0-200 km   │   0-800W     │   Draw/Regen │
│   Red < 20%  │   Red < 20km │   Green > 0  │   Watts      │
│   Green > 50%│   Green >100 │              │              │
└──────────────┴──────────────┴──────────────┴──────────────┘

ROW 2: BATTERY DETAIL (3 panels)
┌────────────────────┬────────────────────┬────────────────────┐
│  PACK VOLTAGE      │  PACK CURRENT      │  CELL VOLTAGES     │
│  Line graph        │  Line graph        │  Bar chart          │
│  40-58V range      │  -100A to +100A    │  16 cells, 2.5-3.7V│
│  1 hour window     │  1 hour window     │  Highlight min/max  │
│  Cutoff lines shown│  Regen = negative  │  Balance indicator  │
└────────────────────┴────────────────────┴────────────────────┘

ROW 3: MOTOR PERFORMANCE (2 panels)
┌──────────────────────────────┬──────────────────────────────┐
│  MOTOR POWER OUTPUT          │  MOTOR TEMPERATURES          │
│  Multi-line graph (4 motors) │  Multi-line graph (4 motors) │
│  0-5kW per motor             │  20-120C range               │
│  Color: FL=Blue, FR=Red,     │  Warning line at 90C         │
│         RL=Green, RR=Orange  │  Shutdown line at 110C       │
└──────────────────────────────┴──────────────────────────────┘

ROW 4: ENERGY HARVESTING (2 panels)
┌──────────────────────────────┬──────────────────────────────┐
│  SOLAR HARVEST TODAY         │  ENERGY BALANCE              │
│  Bar chart (hourly Wh)       │  Stacked area graph          │
│  Cumulative line overlay     │  Green: Solar + Regen input  │
│  Target line (expected)      │  Red: Motor consumption      │
│  Shade: sunrise to sunset    │  Blue: Net energy flow       │
└──────────────────────────────┴──────────────────────────────┘

ROW 5: NAVIGATION & ENVIRONMENT (3 panels)
┌──────────────────┬──────────────────┬──────────────────┐
│  GPS TRACK MAP   │  SPEED & HEADING │  WEATHER         │
│  Geomap panel    │  Speedometer     │  Stat panels     │
│  Trail on map    │  gauge 0-80 km/h │  Temp, Humidity, │
│  Current position│  Compass heading │  Pressure, Alt   │
│  with heading    │  line graph      │  Wind chill calc │
└──────────────────┴──────────────────┴──────────────────┘

ROW 6: SYSTEM STATUS (4 panels)
┌──────────────┬──────────────┬──────────────┬──────────────┐
│  MESH NODES  │  COMMS STATUS│  WATER LEVEL │  SYSTEM TEMP │
│  Stat panel  │  Status icons│  Gauge       │  Heatmap     │
│  Count of    │  Mesh: OK    │  0-100%      │  Pi CPU temp │
│  nearby nodes│  WiFi: OK    │  Red < 10%   │  BMS temp    │
│              │  Sat: OK/OFF │              │  Motor temps │
└──────────────┴──────────────┴──────────────┴──────────────┘

ALERTING RULES (Grafana Alerting):
- Battery SOC < 10%: CRITICAL alert
- Battery SOC < 20%: WARNING alert
- Motor temperature > 100C: CRITICAL alert
- Cell voltage < 2.7V: CRITICAL alert
- Cell voltage imbalance > 0.1V: WARNING alert
- Water level < 10%: WARNING alert
- No GPS fix for > 5 minutes: INFO alert
- Mesh node count = 0: WARNING alert (isolated from convoy)
```

---

## 6. EMP Protection Wiring

### 6.1 Overview

Electromagnetic Pulse (EMP) protection is designed to MIL-STD-188-125 (High-Altitude EMP Protection) principles. The approach uses defense-in-depth: Faraday enclosures for electronics, cascaded surge protection on all conductors entering enclosures, and shielded cabling throughout the vehicle. Total EMP hardening cost: $2,000-5,000 for comprehensive protection.

### 6.2 Protection Architecture

```
THREAT MODEL:
- E1 component: ~50 kV/m, rise time 5 ns, duration 1 us
  (High-altitude nuclear EMP, most damaging to electronics)
- E2 component: Similar to lightning, ~100 V/m, duration 1 ms
  (Handled by standard surge protection)
- E3 component: ~40 V/km on long conductors, duration 10-300 s
  (Geomagnetic induced current, affects power grid more than vehicles)

PROTECTION LAYERS (defense in depth):

Layer 1: FARADAY ENCLOSURES
  All critical electronics housed in sealed aluminum enclosures.
  Provides 60-80 dB attenuation at EMP frequencies (1 MHz - 1 GHz).

Layer 2: POINT-OF-ENTRY PROTECTION
  Every conductor entering a Faraday enclosure passes through
  surge protection devices at the enclosure wall (bulkhead mount).

Layer 3: CABLE SHIELDING
  All inter-enclosure wiring uses shielded cable with shield
  grounded at both ends (enclosure bulkhead connectors).

Layer 4: COMPONENT-LEVEL PROTECTION
  TVS diodes on every IC power pin and signal input inside enclosures.
  This is the last line of defense if outer layers are breached.

COMPLETE PROTECTION PATH FOR EACH CONDUCTOR:

[EXTERNAL WORLD / ANTENNA / POWER SOURCE]
       |
  ─────┤ LAYER 3: SHIELDED CABLE (braid or foil shield, 360-degree termination)
       |
  ─────┤ LAYER 2a: GAS DISCHARGE TUBE (GDT)
       |   Clamps voltage to ~90V, handles high energy (10-20 kA)
       |   Response time: ~1 microsecond
       |
  ─────┤ LAYER 2b: METAL OXIDE VARISTOR (MOV)
       |   Clamps voltage to ~60V, medium energy (5-10 kA)
       |   Response time: ~25 nanoseconds
       |
  ─────┤ LAYER 2c: TVS DIODE (bidirectional)
       |   Clamps voltage to ~36V (or signal-appropriate level)
       |   Response time: <1 nanosecond (fastest response)
       |
  ─────┤ LAYER 2d: FERRITE CHOKE (common mode)
       |   Suppresses high-frequency energy (>1 MHz)
       |   Does not affect DC or low-frequency signals
       |
  ═════╡ LAYER 1: FARADAY ENCLOSURE WALL (bulkhead connector, IP67)
       |
  ─────┤ LAYER 4: TVS DIODES on PCB (per IC)
       |
  [PROTECTED ELECTRONICS INSIDE ENCLOSURE]

KEY PRINCIPLE: Each successive stage clamps voltage lower and handles
less energy but responds faster. The GDT absorbs the bulk energy,
the MOV catches the remainder, and the TVS diode cleans up the residual.
```

### 6.3 Faraday Enclosure Specifications

```
MATERIAL AND CONSTRUCTION:

Material:        6061-T6 Aluminum
Wall thickness:  3mm minimum (provides structural strength + EM shielding)
Surface finish:  Bare aluminum (conductive) on mating surfaces
                 Anodized on external surfaces for corrosion (except gasket area)

Lid seal:        Conductive EMI gasket strip (knitted wire mesh or
                 conductive elastomer, e.g., Parker Chomerics)
                 Applied in continuous loop around entire lid perimeter.
                 No gaps. Gasket must maintain metal-to-metal contact.

Mounting:        Vibration-isolated using rubber grommets
                 (isolates vehicle vibration from electronics,
                  does not affect EM shielding)

CONNECTOR SPECIFICATIONS (all bulkhead-mount, IP67 rated):

┌──────────────────────────────────────────────────────────────┐
│ Conductor Type  │ Connector           │ Surge Protection     │
├─────────────────┼─────────────────────┼──────────────────────┤
│ DC Power (48V)  │ Anderson PP75       │ MOV + GDT cascade    │
│                 │ through bulkhead    │ (Bourns 2049 series)  │
│                 │                     │                       │
│ CAN Bus         │ M12 4-pin           │ TVS diode array       │
│                 │ A-coded, shielded   │ (Bourns CDSOT23-T24C) │
│                 │                     │ on CAN-H and CAN-L    │
│                 │                     │                       │
│ Ethernet        │ M12 8-pin or        │ Ethernet surge        │
│                 │ RJ45 bulkhead       │ protector inline      │
│                 │ with shield          │ (Bourns TBU-DT series)│
│                 │                     │                       │
│ USB             │ USB-C bulkhead      │ TVS diode + ferrite   │
│                 │ IP67 rated          │ on all 4 data lines   │
│                 │                     │                       │
│ Antenna (RF)    │ N-type or SMA       │ GDT inline protector  │
│                 │ bulkhead mount      │ (Huber+Suhner)        │
│                 │                     │ + DC block capacitor   │
│                 │                     │                       │
│ Sensor wires    │ M8 or M12           │ TVS diode at entry    │
│ (I2C, analog)   │ circular connector  │ + ferrite choke       │
└──────────────────────────────────────────────────────────────┘

GROUNDING:
- Single-point ground from each enclosure to vehicle chassis
- Use heavy-gauge ground strap (4 AWG braided copper)
- Ground connection point: Clean bare metal on frame, star washer
- All enclosures share common ground point on chassis
- Do NOT create ground loops (single point only)

SHIELDING EFFECTIVENESS TARGETS:
- 60 dB attenuation at 10 MHz (adequate for E1 threat)
- 40 dB attenuation at 1 GHz (adequate for most RF threats)
- 80 dB attenuation at 100 kHz (adequate for E2/E3 threats)
- Test with RF field probe if verification is needed
```

### 6.4 Vehicle-Level EMP Protection Plan

```
PROTECTED SUBSYSTEMS AND ENCLOSURES:

ENCLOSURE 1: POWERTRAIN CONTROLLER
Contents: VESC controllers (1-4), precharge relay, DC-DC converter
Size: 300mm x 250mm x 100mm
Location: Under seat or in frame tunnel
Conductors entering:
  - 48V power (2 conductors): Anderson PP75 + MOV/GDT cascade
  - Motor phases (3 per motor, 3-12 total): Bulkhead + ferrite
  - Hall sensors (5 per motor): M12 + TVS
  - Throttle ADC (3 wires): M12 + TVS
  - CAN bus (2 wires): M12 + TVS array
  - USB debug (4 wires): USB-C bulkhead + TVS

ENCLOSURE 2: BATTERY MANAGEMENT
Contents: BMS board, current shunt interface, temperature sensor hub
Size: 200mm x 150mm x 80mm
Location: Integrated into battery module enclosure (IP68)
Conductors entering:
  - Balance wires (17 wires): Sealed connector + TVS per wire
  - Current shunt sense (2 wires): Sealed connector + TVS
  - Temperature sensors (4 wires): M8 + TVS
  - CAN bus (2 wires): M12 + TVS array
  - Power output FETs (internal, no external conductor)

ENCLOSURE 3: COMMUNICATIONS
Contents: Meshtastic node, satellite modem (if equipped), ATAK tablet interface
Size: 200mm x 150mm x 80mm
Location: Behind handlebars or in dash
Conductors entering:
  - 12V power (2 wires): Anderson PP15 + MOV
  - LoRa antenna (1 coax): SMA bulkhead + GDT inline
  - Satellite antenna (1 coax): N-type bulkhead + GDT inline
  - USB to Pi (4 wires): USB-C bulkhead + TVS
  - WiFi antenna (if external): SMA + GDT

ENCLOSURE 4: SOVEREIGNTY COMPUTE
Contents: Raspberry Pi 5, NVMe SSD, WiFi module
Size: 200mm x 150mm x 80mm
Location: Under seat or in utility bay
Conductors entering:
  - 48V→5V power (2 wires): Anderson PP15 + MOV
  - Ethernet (8 wires): RJ45 bulkhead + surge protector
  - USB to Meshtastic (4 wires): USB-C bulkhead + TVS
  - USB to ESP32 telemetry (4 wires): USB-C bulkhead + TVS
  - WiFi antenna (1 coax): SMA bulkhead + GDT
  - (Optional) GPIO ribbon: Sealed DB9 + TVS per pin

ENCLOSURE 5: TELEMETRY NODE
Contents: ESP32, CAN transceiver, sensor breakout boards
Size: 150mm x 100mm x 60mm
Location: Center of vehicle, accessible to sensors
Conductors entering:
  - 12V power (2 wires): M8 + MOV
  - CAN bus (2 wires): M12 + TVS array
  - I2C sensor bus (4 wires): M8 + ferrite + TVS
  - GPS antenna (1 coax): SMA + GDT
  - Analog sensors (4 wires): M8 + TVS
  - WiFi (internal antenna, shielded by enclosure when lid closed)

CABLE SHIELDING BETWEEN ENCLOSURES:
- All inter-enclosure cables: Braided shield, minimum 85% coverage
- Shield termination: 360-degree connection at bulkhead connector
  (NOT pigtail termination, which is ineffective above 100 MHz)
- Cable routing: Follow vehicle frame (acts as additional shield)
- Maximum cable length between enclosures: 2 meters (shorter = better)
- Cable ties: Nylon (not metal, to avoid antenna effects)
```

### 6.5 Surge Protection Device (SPD) Bill of Materials

```
PER-ENCLOSURE SPD COMPONENTS:

DC POWER LINES (48V):
┌──────────────────────────────────────────────────────────────┐
│ Component              │ Part Number        │ Price   │ Qty  │
├────────────────────────┼────────────────────┼─────────┼──────┤
│ Gas Discharge Tube 90V │ Bourns 2049-09-SM  │ $3-5    │ 1    │
│ MOV 72V                │ Bourns MOV-14D721K │ $1-2    │ 1    │
│ TVS Diode 58V bidir    │ Littelfuse P6KE62A │ $0.50   │ 2    │
│ Ferrite Choke 10uH     │ Fair-Rite 0431167  │ $2-4    │ 1    │
└──────────────────────────────────────────────────────────────┘

SIGNAL LINES (CAN BUS, I2C, ANALOG):
┌──────────────────────────────────────────────────────────────┐
│ Component              │ Part Number        │ Price   │ Qty  │
├────────────────────────┼────────────────────┼─────────┼──────┤
│ TVS Diode Array (CAN)  │ Bourns CDSOT23-T24C│ $0.50   │ 1    │
│ TVS Diode Array (5V)   │ Bourns CDSOT23-T05C│ $0.50   │ 2    │
│ Ferrite bead 100 ohm   │ Murata BLM18AG     │ $0.10   │ 8    │
│ Common mode choke      │ TDK ACM2012-900    │ $1-2    │ 2    │
└──────────────────────────────────────────────────────────────┘

ANTENNA LINES (RF COAX):
┌──────────────────────────────────────────────────────────────┐
│ Component              │ Part Number        │ Price   │ Qty  │
├────────────────────────┼────────────────────┼─────────┼──────┤
│ Coax GDT protector     │ Huber+Suhner 74Z   │ $15-30  │ 1    │
│   (or PolyPhaser equiv)│ PolyPhaser IS-50NX │ $25-50  │      │
│ DC blocking capacitor  │ 100pF 1kV C0G      │ $0.50   │ 1    │
└──────────────────────────────────────────────────────────────┘

ETHERNET LINES:
┌──────────────────────────────────────────────────────────────┐
│ Component              │ Part Number        │ Price   │ Qty  │
├────────────────────────┼────────────────────┼─────────┼──────┤
│ Ethernet surge module  │ Bourns TBU-DT085   │ $5-10   │ 1    │
│ Shielded RJ45 bulkhead │ Amphenol RJFTV     │ $5-10   │ 1    │
└──────────────────────────────────────────────────────────────┘

ESTIMATED COST PER ENCLOSURE: $30-80
TOTAL FOR 5 ENCLOSURES: $150-400

ADDITIONAL VEHICLE-LEVEL PROTECTION:
┌──────────────────────────────────────────────────────────────┐
│ Component              │ Part Number        │ Price   │ Qty  │
├────────────────────────┼────────────────────┼─────────┼──────┤
│ Faraday enclosures (5) │ Hammond 1590 series│ $150-500│ 5    │
│ EMI gasket strip       │ Parker Chomerics   │ $50-100 │ 5m   │
│ Shielded cable (bulk)  │ Belden 8723        │ $200-400│ 20m  │
│ Bulkhead connectors    │ Various M8/M12/SMA │ $100-200│ 25   │
│ Ground straps (4 AWG)  │ Braided copper     │ $30-50  │ 5    │
│ TitanRF Faraday cover  │ TitanRF vehicle    │ $200-500│ 1    │
│   (emergency cover)    │   Faraday blanket  │         │      │
└──────────────────────────────────────────────────────────────┘

TOTAL EMP PROTECTION BUDGET: $880-2,150 (basic)
                              $2,000-5,000 (comprehensive with certified testing)
```

### 6.6 Testing and Verification

```
VERIFICATION METHODS (in order of cost/complexity):

1. VISUAL INSPECTION (Free):
   - Verify all enclosures have continuous EMI gaskets, no gaps
   - Verify all conductors pass through bulkhead connectors
   - Verify no unshielded wires penetrate enclosure walls
   - Verify ground straps connected with clean metal contact
   - Verify cable shields have 360-degree termination at connectors

2. CONTINUITY TESTING ($0, requires multimeter):
   - Measure resistance from enclosure lid to body: < 0.1 ohm
   - Measure resistance from enclosure to chassis ground: < 0.5 ohm
   - Measure resistance across each EMI gasket joint: < 0.01 ohm
   - Measure cable shield continuity end-to-end: < 1 ohm

3. RF FIELD STRENGTH TESTING ($50-200 for equipment):
   - Place transmitter (e.g., handheld radio) inside closed enclosure
   - Measure field strength outside with RF field meter or SDR
   - Expected: 40-60 dB reduction at 100 MHz
   - Test at multiple frequencies: 1 MHz, 10 MHz, 100 MHz, 1 GHz

4. PROFESSIONAL EMP TESTING ($5,000-50,000):
   - Conducted at accredited EMC test lab
   - MIL-STD-461G RE102/RS103 radiated emissions/susceptibility
   - MIL-STD-188-125 HEMP protection verification
   - Provides certified test report for documentation
   - Recommended for Tier 3 builds only

MAINTENANCE:
- Inspect EMI gaskets annually for compression set or corrosion
- Re-torque bulkhead connectors every 6 months (vibration loosening)
- Replace gaskets if resistance exceeds 0.1 ohm across joint
- Apply anti-oxidant compound to ground strap connections annually
```

---

## Appendix A: Component Cross-Reference

All components referenced in this document map to the BOM.md file. Key correspondences:

| This Document | BOM Reference | Description |
|---------------|--------------|-------------|
| VESC 6.9 | A4-A6 | Motor controllers |
| Axiom Controller | A7 | High-power alternative |
| Hub Motors | A1-A3 | QS Motor 5kW BLDC |
| Libre Solar BMS | B4 | Open-source BMS |
| ENNOID-BMS | B5 | Alternative BMS |
| foxBMS | B6 | Certified BMS |
| Battery Module | B1-B3 | LiFePO4 48V 100Ah |
| Anderson SB350 | B8 | Hot-swap connectors |
| Heltec LoRa 32 V3 | E1 (Comms section) | Meshtastic nodes |
| Raspberry Pi 5 | F1 (Digital section) | Sovereignty compute |
| NVMe SSD 1TB | F3 (Digital section) | Encrypted storage |

## Appendix B: Required Tools

```
MINIMUM TOOLSET FOR BUILD:

ELECTRICAL:
- Digital multimeter (voltage, current, resistance, continuity)
- Soldering station (temperature-controlled, 60W minimum)
- Wire crimper (hydraulic for 4/0 AWG, ratchet for smaller)
- Wire stripper (adjustable, 10-28 AWG)
- Heat gun (for heat-shrink tubing)
- CAN bus analyzer (optional, for debugging - e.g., PCAN USB)

MECHANICAL:
- Torque wrench (for busbar bolts, 1-10 Nm range)
- Drill press or hand drill (for enclosure bulkhead holes)
- Step drill bit set (for round connector holes in aluminum)
- Metric hex key set (for M12 connectors)
- Thread-locking compound (Loctite 243 for vibration-prone bolts)

SOFTWARE:
- VESC Tool (vesc-project.com, free)
- Meshtastic CLI and app (free)
- Arduino IDE or PlatformIO (free, for ESP32 firmware)
- Docker and docker-compose (free)
- Raspberry Pi Imager (free)
```

## Appendix C: Safety Warnings

```
HIGH VOLTAGE / HIGH CURRENT:

A 48V 100Ah LiFePO4 pack stores 5,120 Wh of energy.
At 100A discharge current, this represents 4,800W of power.

- ALWAYS disconnect battery before working on electrical system
- ALWAYS verify zero voltage with multimeter before touching conductors
- NEVER work on battery connections while wearing metal jewelry
- ALWAYS wear safety glasses when working near battery terminals
  (arc flash from short circuit can cause severe eye injury)
- Keep a Class D fire extinguisher within reach during battery work
- LiFePO4 cells are resistant to thermal runaway but can still
  produce dangerous arc flash at short-circuit currents (400A+)

48V is below the 60V DC threshold generally considered "high voltage"
in most jurisdictions, but 100A+ currents are lethal and can cause
severe burns. Treat all connections with respect.

ANTENNA AND RF:
- Never transmit on LoRa without antenna connected (damages radio)
- Observe local radio regulations (Part 95, Part 97 as applicable)
- Meshtastic on 915 MHz (US) operates under Part 15 ISM rules
  (no license required, 1W ERP max)

LITHIUM BATTERY SHIPPING:
- Individual LiFePO4 cells and modules are subject to UN3480/UN3481
  shipping regulations when shipping by air
- Always ship at 30% SOC for safety and regulatory compliance
- Label packages with lithium battery handling labels
```

---

*This document is released under the same open-source license as the FlowMobile Sovereign Quad project. Community contributions, corrections, and improvements are welcome.*
