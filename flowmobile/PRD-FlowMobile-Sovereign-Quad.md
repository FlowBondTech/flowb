# FlowMobile Sovereign Quad - Product Requirements Document

**Version**: 1.0
**Date**: 2026-03-09
**Status**: Draft
**Classification**: Open Source

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Overview](#2-product-overview)
3. [Core Systems Architecture](#3-core-systems-architecture)
4. [Technical Specifications](#4-technical-specifications)
5. [Bill of Materials](#5-bill-of-materials)
6. [Build Tiers](#6-build-tiers)
7. [Open Source Strategy](#7-open-source-strategy)
8. [Comparable Vehicles](#8-comparable-vehicles)
9. [Regulatory & Legal](#9-regulatory--legal)
10. [Community & Governance](#10-community--governance)

---

## 1. Executive Summary

### Vision

The FlowMobile Sovereign Quad is a regenerative, military-grade, off-grid sovereign vehicle platform. It converges three domains into a single open-source, community-buildable quad motorcycle:

1. **Regenerative Mobile Technology** - Electric drivetrain, regen braking, solar harvesting, open-source motor controllers
2. **Military-Grade Sustainability** - MIL-STD-810H durability, EMP hardening, mesh communications, signature management
3. **Off-Grid Sovereignty** - Energy/water/food/digital independence, encrypted comms, offline crypto wallet

No production ATV or UTV currently offers V2H bidirectional power, integrated solar, modular swappable batteries, regenerative suspension, agricultural sensor suites, or open-source hardware/software. The FlowMobile fills this white space.

### Mission

Build the world's first fully open-source, community-manufactured sovereign vehicle platform that enables individuals and cooperatives to achieve mobility independence while regenerating the land they traverse.

### Target Users

| Segment | Primary Need | Key Features |
|---------|-------------|--------------|
| **Homesteaders & Off-Gridders** | Energy independence, water access, land management | V2H power export, water purification, solar charging |
| **Regenerative Farmers** | Soil health, cover cropping, field monitoring | Seed dispersal, soil sensors, biochar integration |
| **Emergency Responders** | Comms in disaster zones, mobile power | Mesh networking, satellite backup, exportable power |
| **Maker Communities** | Open-source platform, local manufacturing | Full BOM, build guides, cooperative ownership |
| **Preppers & Resilience Groups** | Self-sufficiency, EMP hardening, off-grid comms | Faraday protection, multi-fuel, encrypted storage |
| **Military/Security Contractors** | Ruggedized transport, tactical comms | MIL-STD-810H, ATAK integration, signature management |

---

## 2. Product Overview

### Form Factor

Quad motorcycle (ATV) with modular attachment points. Four-wheel, single or dual rider, with rear cargo/utility platform. Designed for road, trail, and cross-country operation.

### Modular Architecture

The Sovereign Quad uses a hub-and-spoke architecture where the core vehicle platform supports modular subsystem bays:

```
                        SOLAR CANOPY (200-400W)
                              |
        ┌─────────────────────┼─────────────────────┐
        |                     |                     |
   ┌────┴────┐          ┌────┴────┐          ┌────┴────┐
   | COMMS   |          | DIGITAL |          | WATER   |
   | BAY     |          | SOV BAY |          | BAY     |
   | (front) |          | (center)|          | (rear)  |
   └────┬────┘          └────┬────┘          └────┬────┘
        |                     |                     |
   ┌────┴─────────────────────┴─────────────────────┴────┐
   |              CORE VEHICLE PLATFORM                   |
   |  ┌──────┐  ┌──────────┐  ┌──────┐  ┌──────────┐    |
   |  |MOTOR |  | BATTERY  |  |MOTOR |  | BATTERY  |    |
   |  |FRONT |  | MODULE 1 |  |REAR  |  | MODULE 2 |    |
   |  └──────┘  └──────────┘  └──────┘  └──────────┘    |
   |                                                      |
   |  ┌──────────────────────────────────────────────┐   |
   |  |  VESC CONTROLLERS  |  BMS  |  POWER DIST    |   |
   |  └──────────────────────────────────────────────┘   |
   └──────────────────────────────────────────────────────┘
        |         |         |         |
     ┌──┴──┐   ┌──┴──┐   ┌──┴──┐   ┌──┴──┐
     |WHEEL|   |WHEEL|   |WHEEL|   |WHEEL|
     | FL  |   | FR  |   | RL  |   | RR  |
     └─────┘   └─────┘   └─────┘   └─────┘
```

### Design Principles

1. **Sovereignty First** - Every system works offline. No cloud dependency. User owns all data.
2. **Regenerative by Default** - The vehicle should leave the land better than it found it.
3. **Right to Repair** - Every component replaceable with hand tools. No proprietary fasteners.
4. **Scalable Complexity** - Tier 1 ($5K) is a rideable electric quad. Tier 3 ($35K) is a sovereign mobile platform.
5. **Community Buildable** - Can be assembled in a makerspace with welding, basic electrical, and hand tools.

---

## 3. Core Systems Architecture

### 3A. Powertrain

#### Motor System

| Component | Specification | Source | Price |
|-----------|--------------|--------|-------|
| Hub Motors (x2 or x4) | QS Motor 5kW BLDC, 48-72V | QS Motor / AliExpress | $350-500 each |
| Motor Controller | VESC 6.9, 100A cont / 200A peak, FOC | vesc-project.com | $150-300 each |
| High-Power Controller (alt) | Axiom VESC-compatible, 400V/300A/100kW | Hackaday.io | $300-600 |
| Throttle | Hall-effect twist grip or thumb throttle | Generic EV supply | $15-30 |
| Regen Braking | Software-controlled via VESC firmware | Built into VESC | Included |

**VESC Configuration**: The VESC (Vedder Electronic Speed Controller) is the heart of the open-source powertrain. Created by Benjamin Vedder, it supports:
- Field-Oriented Control (FOC) for maximum efficiency
- Four control modes: Current, Duty Cycle, Speed, Position
- Built-in protections: under/over voltage, over current, thermal throttling
- USB-C, CAN bus, UART communication
- Three adjustable regenerative braking levels
- Fully open-source firmware: github.com/vedderb/bldc

**Regenerative Braking**: Production electric ATVs (Can-Am Outlander Electric, Polaris Ranger XP Kinetic) achieve 10-33% energy recovery through regen braking. The VESC firmware provides three configurable levels:
- Level 1: Minimal regen, coast-like feel
- Level 2: Moderate regen, suitable for most terrain
- Level 3: Maximum regen, can bring vehicle to stop without friction brakes

#### Battery System

| Component | Specification | Source | Price |
|-----------|--------------|--------|-------|
| Cells | LiFePO4 (LFP) prismatic, 3.2V nominal | EVE, CATL, BYD | $80-120/kWh |
| Module Config (Tier 1) | 16S1P, 48V 100Ah = 4.8 kWh | DIY assembly | $400-500 per module |
| Module Config (Tier 2) | 16S2P, 48V 200Ah = 9.6 kWh | DIY assembly | $800-1,000 per module |
| BMS | Libre Solar BMS (open-source), 16S, 100A | github/LibreSolar | $50-150 |
| BMS (alt) | ENNOID-BMS, medium-high voltage, scalable | ENNOID | $100-300 |
| BMS (certified) | foxBMS, TUV road-homologated | foxbms.org | $200-500 |
| Enclosure | IP68 aluminum die-cast, Faraday shielded | Custom/Alibaba | $100-300 per module |
| Connectors | Anderson SB350 for hot-swap | Anderson Power | $20-40 per set |

**Modular Battery Architecture**: Each 48V/5kWh module is independently:
- Hot-swappable in the field in under 2 minutes
- Usable as a standalone portable power station (with integrated DC-AC inverter)
- Chargeable independently via solar, grid, or generator
- Combinable in parallel: 2-6 modules = 10-30 kWh total

**Chemistry Choice**: LiFePO4 (LFP) chosen over NMC/NCA for:
- Superior thermal stability (no thermal runaway)
- 2,000-5,000 cycle life (vs. 500-1,500 for NMC)
- No cobalt or nickel (ethical sourcing)
- Better cold-weather performance
- Lower cost per cycle

**Reference Pricing**:
- Vatrer 12V 200Ah LFP: $400-430
- GoldenMate 12V 200Ah LFP: $400-430
- Renogy 12V 200Ah LFP: $400-430

### 3B. Energy Harvesting

#### Solar Integration

| Component | Specification | Source | Price |
|-----------|--------------|--------|-------|
| Vehicle-Integrated Panels | 200-400W flexible monocrystalline, ETFE coating | BougeRV / Renogy | $200-600 |
| Deployable Panel Kit | 400-800W foldable/rollable CIGS thin-film | PowerFilm / P3 Solar | $500-2,000 |
| Charge Controller | MPPT 48V, 30-60A | Victron / EPEver | $100-200 |
| Mounting | Bonded to body panels (integrated) or quick-deploy rack | Custom | $50-100 |

**Solar Output Estimate**:
- Vehicle-integrated (1-1.5 m2): 300-500 Wh/day in good conditions
- Deployable kit (2-4 m2): 1,500-3,000 Wh/day in good conditions
- Combined: 1,800-3,500 Wh/day = 20-40% daily energy offset

**Military Reference**: The GREENS (Ground Renewable Expeditionary Energy Network System) provides 300W continuous / 1,600W full array for Marine Corps field operations. The Sovereign Quad's solar matches or exceeds this capability.

#### Regenerative Suspension

| Component | Specification | Source | Price |
|-----------|--------------|--------|-------|
| Electromagnetic Dampers | Linear generators in shock bodies, 100-300W continuous off-road | Custom / ClearMotion concept | $500-1,500 per corner |
| Piezoelectric Elements | Supplemental sensors, 16 microW/cm2 | Various | $50-200 total |

**Energy Recovery**: On rough terrain, electromagnetic regenerative suspension harvests 100-300W continuously. Over an 8-hour workday: 0.8-2.4 kWh, representing 9-27% battery extension for a 9 kWh pack.

#### Vehicle-to-Home (V2H) Power Export

| Component | Specification | Source | Price |
|-----------|--------------|--------|-------|
| Bidirectional Inverter | 5-10 kW, 48V DC to 120/240V AC, split-phase | EG4 / Growatt | $800-2,000 |
| Transfer Switch | Manual or automatic, 30A/50A | Reliance / Generac | $200-500 |
| Outlets | NEMA 14-50, NEMA 5-20, USB-C PD | Standard | $50-100 |

A 10-20 kWh battery pack powers a home for 4-12 hours on essential loads. No production ATV currently offers V2H.

### 3C. Ruggedization

#### MIL-STD-810H Design Compliance

| Test Method | Description | Target |
|-------------|-------------|--------|
| 514.8 - Vibration | Random/sinusoidal from vehicle operation | 2-5g RMS, 20-40g peak shock |
| 516.8 - Shock | Impact, crash, drop scenarios | 40g half-sine, 11ms |
| 510.7 - Sand & Dust | Airborne particle exposure | Dust-tight all electronics |
| 501/502/503 - Temperature | Operating temperature range | -32C to +49C (-25F to +120F) |
| 507.6 - Humidity | Prolonged high-humidity | 95% RH, 60C, 10 days |
| 509.7 - Salt Fog | Salt spray corrosion | 500+ hours salt spray |

**Compliance Approach**: Design to MIL-STD-810H, test critical subsystems through accredited labs. Full certification is $50K-200K per campaign. Pragmatic approach: "Designed to MIL-STD-810H" with documented test evidence on critical systems.

#### IP Ratings

| System | Target Rating | Protection Level |
|--------|--------------|-----------------|
| Battery Management | IP68 | Continuous submersion |
| Main ECU / VESC | IP67 | Temporary submersion (1m, 30min) |
| Communications Electronics | IP67 | Temporary submersion |
| Connectors | IP67 minimum | Sealed when mated |
| General Electronics | IP65 | Dust-tight, low-pressure water jets |

#### EMP Hardening

| Protection Layer | Method | Cost |
|-----------------|--------|------|
| Critical Electronics Enclosures | Aluminum die-cast Faraday cages, IP67 | $200-2,000 per enclosure |
| Power Line Protection | Multi-layer Surge Protection Devices (SPDs) | $200-1,000 per system |
| Signal Line Protection | Ferrite chokes on all wiring harnesses | $5-50 per cable |
| Antenna Protection | Gas discharge tubes + TVS diodes on antenna feeds | $50-200 per antenna |
| Cabling | Shielded twisted-pair throughout | 2-5x standard cable cost |
| Emergency Cover | TitanRF Faraday fabric vehicle cover | $200-500 |

**Total EMP hardening cost**: $2,000-5,000 for comprehensive protection. Compliant with MIL-STD-188-125 (High-Altitude EMP Protection) design principles.

#### Frame & Materials

| Component | Material | Treatment | Rationale |
|-----------|----------|-----------|-----------|
| Main Frame | 4130 Chromoly steel tube | Phosphate + epoxy primer + powder coat | Strength-to-weight, weldable, repairable |
| Structural Nodes | 6061-T6 Aluminum | Type III hard anodize (50-75 micron) | 336+ hr salt spray, weight savings |
| Body Panels | Hemp fiber composite, bio-resin matrix | UV-stable clear coat | Renewable, CO2 negative, impact-resistant |
| Skid Plates | UHMWPE (Ultra-High Molecular Weight Polyethylene) | None needed (self-lubricating) | 88% lighter than steel, highest impact strength |
| Accent Panels | Recycled carbon fiber | Clear coat | 70% lower carbon footprint than virgin CF |
| Fasteners | Grade 8 steel | Zinc-nickel electroplating | 1,000+ hr salt spray |
| Seals | Bio-based rubber / silicone | N/A | Renewable sourcing |
| Insulation | Mycelium composite | Sealed | Grown from agricultural waste, fire-resistant |

### 3D. Water Systems

| Component | Specification | Source | Price |
|-----------|--------------|--------|-------|
| Primary Filter | Sawyer Squeeze, 0.1 micron, 100K gallon lifetime | Sawyer Products | $35 |
| Gravity Filter (camp) | Sawyer gravity system, 1-2L/min | Sawyer Products | $50-70 |
| UV Purifier | SteriPEN or inline UV-C, 12V powered | SteriPEN / Custom | $50-150 |
| 12V Pump | Shurflo or equivalent diaphragm pump, 3.5 GPM | Shurflo | $80-150 |
| Storage Tank | Collapsible 20-50 gallon bladder, food-grade | Hydrapak / Generic | $50-150 |
| Rainwater Collection | Integrated channels on canopy/body panels | Custom fabrication | $50-100 |
| Pre-Filter | Sediment screen, 50-100 micron | Generic | $10-20 |

**Water Capacity**:
- Filtration: 1-3 gallons per minute from any freshwater source
- UV purification: Bacteria/virus kill via UV-C exposure
- Rainwater: Collected from solar canopy into storage bladder
- Emergency: Atmospheric water generation possible with vehicle power (1-2 kW, 5-20 L/day depending on humidity)

**Military Reference**: The compact Aspen 2000DM ROWPU concept (10-50 GPH from freshwater) is the design target. The Sawyer system provides 99.99999% bacteria and 99.9999% protozoa removal at a fraction of the cost.

### 3E. Communications

#### Primary: Meshtastic Mesh Network

| Component | Specification | Source | Price |
|-----------|--------------|--------|-------|
| Nodes (x4-8) | Heltec LoRa 32 V3 or LILYGO T-Beam | Heltec / LILYGO | $20-50 each |
| Antenna | 915 MHz (NA) / 868 MHz (EU), 3-6 dBi | Various | $10-20 each |
| Solar Relay Node | Meshtastic node + 5W solar + 3000mAh battery | DIY assembly | $50-100 each |
| Encryption | AES-256-CTR per channel, shared keys via QR | Built into firmware | Free |

**Capabilities**: Text messaging, GPS tracking, telemetry, team coordination. 10+ km line-of-sight range per node. Mesh relay extends range indefinitely. Open-source protocol and firmware.

#### Secondary: Satellite Backup

| Option | Hardware | Monthly | Capabilities |
|--------|----------|---------|-------------|
| Starlink Mini | $249 | $50/mo (Regional Roam) | 5-50 Mbps broadband, 20-75W draw |
| Iridium GO! exec | $1,200-1,500 | $55-200/mo | Voice, SMS, email, SOS, true global coverage |
| Garmin inReach Mini 2 | $350-400 | $15-50/mo | SOS, tracking, basic messaging |

#### Tactical: ATAK Integration

| Component | Specification | Source | Price |
|-----------|--------------|--------|-------|
| Software | ATAK-CIV (Android Tactical Assault Kit - Civilian) | DoD GitHub (free) | Free |
| Tablet | Samsung Galaxy Tab Active4 Pro, MIL-STD-810H | Samsung | $500-700 |
| Mount | RAM Mount X-Grip or custom handlebar mount | RAM Mounts | $50-100 |
| GPS Antenna | External active GNSS, multi-constellation | u-blox / Generic | $30-80 |

**ATAK Features**: Real-time team tracking, route planning, terrain analysis, satellite imagery overlay, sensor data integration, mesh messaging. goTenna Pro X2 integration for off-grid mesh comms with ATAK.

#### Enhanced: LoRa/Ham Radio

| Component | Specification | Source | Price |
|-----------|--------------|--------|-------|
| goTenna Pro X2 | 100+ mi range (aerial relay), ATAK-integrated | goTenna | $150-300 per unit |
| Yaesu FT-65R | VHF/UHF dual band handheld, 5W | Yaesu | $80-100 |
| Mobile VHF/UHF | 25-50W mobile radio, 144/430 MHz | Yaesu / Kenwood | $200-400 |

### 3F. Digital Sovereignty

#### Compute Platform

| Component | Specification | Source | Price |
|-----------|--------------|--------|-------|
| Primary SBC | Raspberry Pi 5, 8GB RAM | raspberrypi.com | $80-100 |
| Backup SBC | Raspberry Pi Zero 2 W | raspberrypi.com | $15-20 |
| Storage | 1TB NVMe SSD, hardware encrypted | Samsung / WD | $80-120 |
| Backup Storage | 256GB microSD, A2 rated | SanDisk | $25-40 |

#### Software Stack

| Layer | Software | Purpose |
|-------|----------|---------|
| OS | Raspberry Pi OS (Debian-based) | Base operating system |
| File Server | Nextcloud | Self-hosted cloud storage, calendar, contacts |
| Password Manager | Vaultwarden (Bitwarden-compatible) | Encrypted credential storage |
| VPN | WireGuard | Encrypted tunnel for all network traffic |
| DNS | Pi-hole | Network-wide ad/tracker blocking |
| Mesh Dashboard | Meshtastic Web UI | Network monitoring and messaging |
| Maps | Organic Maps / OSMAnd (offline) | Offline navigation with OSM data |
| Crypto Wallet | Electrum (BTC), Phantom (SOL) | Offline-capable cryptocurrency |
| Encryption | LUKS full-disk + VeraCrypt volumes | AES-256 data at rest |
| Monitoring | Grafana + Prometheus | Vehicle telemetry dashboard |

#### Data Sovereignty Principles

1. All vehicle telemetry stored locally on encrypted storage
2. User controls what data (if any) is transmitted externally
3. Mesh network keys managed by user, not central authority
4. Offline-first: all critical functions work without internet
5. No telemetry to manufacturers, no cloud dependency
6. Self-destructable data containers via VeraCrypt hidden volumes

### 3G. Shelter & Tools

#### Deployable Shelter

| Component | Specification | Source | Price |
|-----------|--------------|--------|-------|
| Tarp Shelter | 10x12 silnylon tarp, ridgeline setup | Kelty / Paria | $50-150 |
| Hammock System | ENO DoubleNest + Atlas straps | ENO | $70-100 |
| Ground Shelter | Bivy sack, waterproof breathable | OR / SOL | $80-200 |
| Deployable Canopy | 10x10 pop-up with solar panel mount points | Custom / Modified | $100-300 |

#### Field Repair Tools

| Component | Specification | Source | Price |
|-----------|--------------|--------|-------|
| 3D Printer | Creality Ender 3 V3 SE (compact, 12V operable) | Creality | $180-250 |
| Filament | PLA, PETG, TPU spools (1kg each) | Various | $20-30 each |
| Hand Tools | Metric socket set, wrenches, hex keys, multimeter | Various | $100-300 |
| Welding | Battery-powered stick welder (Amico MMA-160) | Amico | $150-250 |
| Tire Repair | Plug kit, 12V compressor, spare tube | Various | $50-100 |

#### Earthbag / Field Construction Tools

| Component | Specification | Source | Price |
|-----------|--------------|--------|-------|
| Earthbag Supply | Polypropylene bags, 18x30" (100 count) | CalEarth / Amazon | $30-60 |
| Tamper | Manual hand tamper, 8x8" steel plate | Hardware store | $25-40 |
| Barbed Wire | 4-point galvanized, 1,320 ft roll | Hardware store | $50-80 |
| Slider/Form | Adjustable bag form for consistent fills | DIY / CalEarth | $20-50 |

### 3H. Regenerative Agriculture

#### Seed Dispersal

| Component | Specification | Source | Price |
|-----------|--------------|--------|-------|
| Broadcast Seeder | ATV-mount spinner type, 50-200 lb hopper | Chapin / Buyers | $200-500 |
| Pneumatic Seeder | APV precision air seeder (premium option) | APV America | $3,000-8,000 |
| Seed Storage | Sealed bins with desiccant, organized by species | Generic | $30-50 |
| Cover Crop Mix | Multi-species blend: clover, rye, radish, vetch | Local seed supplier | $3-8/lb |

#### Soil Sensing

| Component | Specification | Source | Price |
|-----------|--------------|--------|-------|
| Soil EC Sensor | On-the-go electrical conductivity probe | Veris / DIY | $200-5,000 |
| Soil Moisture | Capacitive probe, 12V, data-logged | Decagon/METER | $100-500 |
| GPS/RTK | Sub-centimeter positioning for field mapping | u-blox F9P | $200-400 |
| Data Logger | Arduino/ESP32 based, SD card + LoRa telemetry | DIY | $30-80 |

#### Mobile Biochar Micro-Unit

| Component | Specification | Source | Price |
|-----------|--------------|--------|-------|
| Micro Kiln | TLUD (Top-Lit Updraft) design, 5-gallon batch | DIY / Biochar Bob plans | $50-200 |
| Quench System | 12V pump, water spray nozzle | Generic | $30-50 |
| Inoculant Tank | 5-gallon compost tea / nutrient solution | Generic | $20-30 |
| Biochar Spreader | Gravity-fed rear-mount hopper | DIY / Modified seeder | $100-200 |

**Note**: Full pyrolysis trailers (Applied Carbon, Mobile Biochar Systems) are $15,000-200,000+ and too large for ATV mounting. The micro-kiln approach produces 1-5 gallons of biochar per batch and can be operated at camp while the vehicle charges via solar.

---

## 4. Technical Specifications

### Vehicle Dimensions

| Specification | Tier 1 (Basic) | Tier 2 (Standard) | Tier 3 (Full Sovereign) |
|--------------|---------------|-------------------|------------------------|
| Length | 78" (198 cm) | 84" (213 cm) | 90" (229 cm) |
| Width | 46" (117 cm) | 48" (122 cm) | 50" (127 cm) |
| Height | 44" (112 cm) | 48" (122 cm) | 52" (132 cm) w/ canopy |
| Wheelbase | 50" (127 cm) | 52" (132 cm) | 54" (137 cm) |
| Ground Clearance | 10" (25 cm) | 11" (28 cm) | 12" (30 cm) |
| Seat Height | 32" (81 cm) | 33" (84 cm) | 33" (84 cm) |

### Weight

| Specification | Tier 1 | Tier 2 | Tier 3 |
|--------------|--------|--------|--------|
| Curb Weight | 450 lb (204 kg) | 750 lb (340 kg) | 1,100 lb (500 kg) |
| Payload Capacity | 400 lb (181 kg) | 600 lb (272 kg) | 800 lb (363 kg) |
| GVWR | 850 lb (386 kg) | 1,350 lb (612 kg) | 1,900 lb (862 kg) |
| Towing Capacity | 500 lb (227 kg) | 1,000 lb (454 kg) | 1,500 lb (680 kg) |

### Performance

| Specification | Tier 1 | Tier 2 | Tier 3 |
|--------------|--------|--------|--------|
| Motor Power | 5 kW (6.7 hp) | 10 kW (13.4 hp) | 20 kW (26.8 hp) |
| Peak Power | 10 kW (13.4 hp) | 20 kW (26.8 hp) | 40 kW (53.6 hp) |
| Top Speed | 25 mph (40 km/h) | 40 mph (64 km/h) | 55 mph (89 km/h) |
| Battery Capacity | 4.8 kWh (1 module) | 9.6 kWh (2 modules) | 19.2 kWh (4 modules) |
| Range (road) | 25-40 mi (40-64 km) | 50-80 mi (80-129 km) | 80-140 mi (129-225 km) |
| Range (off-road) | 15-25 mi (24-40 km) | 30-50 mi (48-80 km) | 50-90 mi (80-145 km) |
| Charge Time (L2) | 2 hrs (20-80%) | 3-4 hrs (20-80%) | 6-8 hrs (20-80%) |
| Charge Time (solar) | 8-12 hrs (20-80%) | 12-16 hrs (20-80%) | Full day+ |
| V2H Export Power | 1 kW | 3 kW | 5-10 kW |
| Exportable Energy | 3.5 kWh | 7 kWh | 14+ kWh |

### Drivetrain

| Specification | Value |
|--------------|-------|
| Drive | 2WD rear (Tier 1), AWD (Tier 2-3) |
| Motors | Hub motor (rear) or dual hub motors (AWD) |
| Controller | VESC 6.9 (Tier 1-2), Axiom 100kW (Tier 3) |
| Transmission | Direct drive (hub motors), no gearbox |
| Regen Braking | 3 adjustable levels via VESC, 10-33% energy recovery |
| Mechanical Brakes | Hydraulic disc, 4-piston caliper, 220mm rotors |

### Electrical System

| Specification | Value |
|--------------|-------|
| System Voltage | 48V nominal (Tier 1-2), 72V (Tier 3) |
| Battery Chemistry | LiFePO4 (LFP) |
| BMS | Open-source (Libre Solar / ENNOID / foxBMS) |
| Auxiliary | 12V bus via DC-DC converter for accessories |
| Solar Input | MPPT controller, 48V/30-60A |
| Shore Charging | J1772 adapter or direct 48V charger |
| Wiring | Shielded twisted-pair, MIL-SPEC connectors |

### Suspension & Chassis

| Specification | Value |
|--------------|-------|
| Front Suspension | Double A-arm, adjustable coilover, 10" travel |
| Rear Suspension | Swingarm or trailing arm, adjustable coilover, 10" travel |
| Frame | 4130 chromoly tube space frame |
| Tires | 25x8-12 (front), 25x10-12 (rear), all-terrain |
| Steering | Rack and pinion, manual |

---

## 5. Bill of Materials

### BOM Summary by Subsystem (Tier 2 Configuration)

| Subsystem | Component Count | Cost Range | % of Total |
|-----------|----------------|-----------|------------|
| A. Powertrain (motors, controllers) | 8-12 | $1,500-3,000 | 10-15% |
| B. Battery System | 6-10 | $2,000-4,000 | 15-20% |
| C. Frame & Suspension | 15-25 | $2,000-4,000 | 15-20% |
| D. Body & Materials | 10-15 | $800-1,500 | 5-10% |
| E. Energy Harvesting (solar) | 5-8 | $500-1,200 | 5-8% |
| F. Electronics & Wiring | 20-30 | $800-1,500 | 5-10% |
| G. Communications | 8-12 | $500-2,000 | 5-12% |
| H. Digital Sovereignty | 5-8 | $200-400 | 2-3% |
| I. Water Systems | 6-10 | $250-600 | 2-4% |
| J. Shelter & Tools | 10-15 | $500-1,200 | 4-8% |
| K. Agriculture | 5-10 | $300-800 | 2-5% |
| L. EMP Hardening | 8-12 | $500-2,000 | 3-10% |
| **TOTAL BOM** | **~120-170 parts** | **$9,850-22,200** | **100%** |
| Assembly & Integration | -- | $2,000-5,000 | -- |
| **TOTAL VEHICLE** | -- | **$11,850-27,200** | -- |

Detailed BOM with individual components, source URLs, and open-source alternatives is provided in the companion document: `BOM.md`

---

## 6. Build Tiers

### Tier 1: Basic Electric Quad ($5,000-8,000)

**"The Starter"** - A rideable electric quad with basic sovereignty features.

| System | Included | Excluded |
|--------|----------|----------|
| Powertrain | Single 5kW hub motor, VESC 6.9, 48V | AWD, Axiom controller |
| Battery | 1x 48V/100Ah LFP module (4.8 kWh), Libre Solar BMS | Modular hot-swap, V2H |
| Frame | Chromoly tube frame, basic suspension | Type III anodize, UHMWPE skids |
| Body | Steel/aluminum sheet panels | Hemp composite, recycled CF |
| Solar | 100W flexible panel, basic PWM controller | Deployable kit, MPPT |
| Comms | 2x Meshtastic nodes | ATAK, satellite, goTenna |
| Digital | Raspberry Pi Zero 2 W, basic encrypted storage | Nextcloud, full stack |
| Water | Sawyer Squeeze filter | Pump, UV, rainwater collection |
| Shelter | Basic tarp | Hammock system, bivy |
| Agriculture | None | Seeder, sensors, biochar |
| EMP | None | Faraday cages, SPDs |

**Target Build Time**: 2-4 weeks
**Skill Level**: Intermediate (welding, basic electrical)
**Tools Required**: MIG welder, angle grinder, soldering iron, hand tools

### Tier 2: Standard Sovereign Quad ($12,000-18,000)

**"The Homesteader"** - Full sovereignty stack with regenerative capabilities.

| System | Included | Excluded |
|--------|----------|----------|
| Powertrain | 2x 5kW hub motors (AWD), 2x VESC 6.9, regen braking | 20kW peak, Axiom |
| Battery | 2x 48V/100Ah modules (9.6 kWh), hot-swap, V2H (3kW) | 4-module config |
| Frame | Chromoly tube, Type III anodized nodes, UHMWPE skids | Full MIL-STD testing |
| Body | Hemp composite panels, bio-resin | Recycled CF accents |
| Solar | 300W integrated + 400W deployable, MPPT controller | 1,200W full deploy |
| Comms | 4x Meshtastic + ATAK tablet + Garmin inReach | Starlink, Iridium GO!, goTenna Pro |
| Digital | Raspberry Pi 5, Nextcloud, WireGuard, full sovereignty stack | Redundant SBC |
| Water | Sawyer + UV purifier + 12V pump + 20-gal bladder | Rainwater collection, ROWPU |
| Shelter | Tarp + hammock + deployable canopy with solar mounts | Earthbag tools |
| Agriculture | Broadcast seeder, soil moisture sensor, GPS logger | Pneumatic seeder, full soil EC |
| EMP | Faraday enclosures on critical electronics, basic SPDs | Full wiring shielding |

**Target Build Time**: 4-8 weeks
**Skill Level**: Advanced (welding, electrical, composite layup)
**Tools Required**: TIG/MIG welder, vacuum bag for composites, electronics bench, 3D printer helpful

### Tier 3: Full Sovereign Quad ($25,000-35,000)

**"The Expeditionary"** - Military-grade sovereign platform with full regenerative integration.

| System | Included |
|--------|----------|
| Powertrain | 4x 5kW hub motors (true 4WD, per-wheel torque vectoring), VESC 6.9 x4, Axiom backup controller |
| Battery | 4x 48V/100Ah modules (19.2 kWh), hot-swap, V2H (5-10kW), modular expandable |
| Frame | Full chromoly space frame, Type III anodized aluminum nodes, UHMWPE skid plates, zinc-nickel fasteners |
| Body | Hemp composite panels + recycled carbon fiber accent/structural panels, mycelium insulation, CARC-equiv powder coat |
| Solar | 400W integrated + 800W deployable (1,200W total), dual MPPT controllers |
| Comms | 8x Meshtastic nodes + ATAK + Starlink Mini + Iridium GO! exec + goTenna Pro X2 + VHF/UHF ham radio |
| Digital | Raspberry Pi 5 + Pi Zero 2W backup, 1TB encrypted NVMe, full sovereignty stack, offline crypto wallets |
| Water | Full system: Sawyer + UV + 12V pump + 50-gal bladder + rainwater collection from canopy |
| Shelter | Complete: tarp + hammock + bivy + deployable canopy + earthbag tools + field repair 3D printer |
| Agriculture | Broadcast seeder + soil EC sensor + RTK GPS + biochar micro-kiln + inoculant system |
| EMP | Full hardening: Faraday cages on all electronics, SPDs on every circuit, shielded cabling throughout, TitanRF cover |
| Regen Suspension | Electromagnetic regenerative dampers, 100-300W continuous off-road harvesting |
| Navigation | Multi-GNSS + IMU dead reckoning + VIO camera + offline maps |
| IR/Thermal | FLIR Scout TK or equivalent for night navigation and rescue |

**Target Build Time**: 2-6 months
**Skill Level**: Expert (welding, electrical, composites, programming)
**Tools Required**: Full fabrication shop, electronics lab, composite layup area, CNC helpful

---

## 7. Open Source Strategy

### Licensing

| Asset Type | License | Rationale |
|-----------|---------|-----------|
| Hardware Designs (CAD, schematics) | CERN-OHL-S v2 (Strong Reciprocal) | Ensures derivatives remain open |
| Software & Firmware | GPL v3 | Copyleft ensures community benefits |
| Documentation | Creative Commons CC-BY-SA 4.0 | Free sharing with attribution |
| Build Guides | Creative Commons CC-BY-SA 4.0 | Enables translation and adaptation |
| BOM & Sourcing Data | Public Domain (CC0) | Maximum accessibility |

### Repository Structure

```
flowmobile/
  hardware/
    cad/          -- FreeCAD/OpenSCAD files for frame, brackets, mounts
    schematics/   -- KiCad electrical schematics
    pcb/          -- Custom PCB designs (BMS interface, sensor boards)
    3d-print/     -- STL/STEP files for printable components
  firmware/
    vesc/         -- VESC configuration profiles
    bms/          -- BMS firmware customizations
    meshtastic/   -- Meshtastic node configurations
    sovereignty/  -- Raspberry Pi sovereignty stack scripts
  docs/
    build-guide/  -- Step-by-step assembly instructions
    bom/          -- Bill of materials with sourcing
    specs/        -- Technical specifications
    safety/       -- Safety guidelines and warnings
  community/
    governance/   -- Cooperative bylaws, decision frameworks
    workshops/    -- Workshop curriculum for build events
```

### Community Contribution Model

1. **Design Reviews** - All major design changes go through community review on GitHub
2. **Build Reports** - Builders publish build logs with photos, lessons learned, modifications
3. **Regional Chapters** - Local groups organize build events, share tools, pool purchasing
4. **Component Testing** - Community members test and rate components, update BOM
5. **Translation** - Build guides translated into multiple languages by community
6. **Skill Shares** - Welding, composites, electrical workshops before build events

### Key Open Source Projects Leveraged

| Project | URL | Role in Sovereign Quad |
|---------|-----|----------------------|
| VESC Project | vesc-project.com | Motor controller firmware and hardware |
| Libre Solar BMS | github.com/LibreSolar | Battery management system |
| foxBMS | foxbms.org | Certified BMS option |
| ENNOID-BMS | ennoid.me | Scalable BMS for higher voltage |
| Meshtastic | meshtastic.org | Mesh communication protocol |
| ATAK-CIV | github.com/deptofdefense | Tactical awareness kit |
| Nextcloud | nextcloud.com | Self-hosted cloud platform |
| WireGuard | wireguard.com | VPN tunnel |
| Pi-hole | pi-hole.net | DNS-level ad/tracker blocking |
| KiCad | kicad.org | Electronic design automation |
| FreeCAD | freecad.org | 3D CAD modeling |
| OpenSCAD | openscad.org | Parametric 3D design |
| Marlin/Klipper | marlinfw.org | 3D printer firmware |

---

## 8. Comparable Vehicles

### Military Comparison

| Feature | MRZR Alpha | Sovereign Quad (Tier 3) |
|---------|-----------|------------------------|
| **Type** | Military UTV, 4-seat | Civilian quad, 1-2 seat |
| **Power** | 118 HP turbo diesel | 20 kW (26.8 hp) electric |
| **Range** | 225-300 mi (diesel) | 80-140 mi (electric) + solar |
| **Payload** | 2,000 lb | 800 lb |
| **Weight** | 3,140 lb (curb) | 1,100 lb (curb) |
| **Ground Clearance** | 12" | 12" |
| **Air-Droppable** | Yes | Yes (under 1,500 lb GVWR) |
| **Fuel** | Multi-fuel diesel | Solar + grid + any DC source |
| **Noise** | Diesel engine | Silent (electric) |
| **V2H Power Export** | Via generator | 5-10 kW bidirectional |
| **Open Source** | No | Yes, fully |
| **Price** | ~$50,000+ (gov contract) | $25,000-35,000 (DIY) |

### Commercial EV Comparison

| Feature | Vanderhall Brawley GTS | Polaris Ranger XP Kinetic | Sovereign Quad (Tier 3) |
|---------|----------------------|--------------------------|------------------------|
| **Type** | Luxury UTV | Utility UTV | Sovereign quad |
| **Power** | 404 hp quad-motor | Not disclosed | 20 kW (26.8 hp) |
| **Battery** | 40-60 kWh | 14.9-29.8 kWh | 19.2 kWh (expandable) |
| **Range** | 140-200 mi | 45-80 mi | 80-140 mi |
| **Regen Braking** | Yes | Yes | Yes (3 levels) |
| **V2H** | No | No | Yes, 5-10 kW |
| **Solar** | No | No | Yes, 1,200W |
| **Mesh Comms** | No | No | Yes, Meshtastic + ATAK |
| **Open Source** | No | No | Yes, fully |
| **Water Purification** | No | No | Yes |
| **Off-Grid Digital** | No | No | Yes, full sovereignty stack |
| **EMP Hardening** | No | No | Yes |
| **Price** | $34,950-49,995 | $25,999-37,499 | $25,000-35,000 |

### Unique Sovereign Quad Capabilities (No Competitor Offers)

1. V2H bidirectional power export from an ATV
2. Integrated solar charging + deployable array
3. Modular hot-swappable battery architecture
4. Regenerative electromagnetic suspension
5. Open-source hardware and software (entire vehicle)
6. Encrypted mesh communications with ATAK
7. On-board water purification
8. EMP-hardened electronics
9. Agricultural sensor and seed dispersal integration
10. Self-hosted digital sovereignty stack
11. Field-printable replacement parts (3D printer)
12. Biochar production capability

---

## 9. Regulatory & Legal

### Vehicle Registration

| Jurisdiction | Classification | Requirements |
|-------------|---------------|-------------|
| **Federal (US)** | Low-speed vehicle (LSV) if <25 mph; off-highway vehicle (OHV) if not street-legal | No FMVSS certification needed for OHV. LSV needs FMVSS 500 compliance |
| **State (varies)** | ATV / OHV / LSV depending on speed and equipment | Title, registration, insurance requirements vary by state |
| **Off-Road Only** | No registration in most states if operated only on private land | Liability considerations still apply |

**Strategy**: Register as OHV/ATV for trail access. Add lighting, mirrors, turn signals for LSV street-legal conversion where permitted. Some states (AZ, UT, MT, NH) allow ATVs on public roads.

### Communications Licensing

| Technology | License Required | Cost | Process |
|-----------|-----------------|------|---------|
| Meshtastic (LoRa) | None (ISM band 915 MHz) | Free | Unlicensed operation |
| goTenna | None (ISM band) | Free | Unlicensed operation |
| VHF/UHF Ham Radio | FCC Technician license | $35 exam fee | Study + exam (35 questions) |
| Starlink | None (consumer service) | Subscription | Sign up online |
| Iridium | None (consumer service) | Subscription | Sign up online |
| CB Radio | None | Free | Unlicensed operation |

**Recommendation**: All operators should obtain at minimum an FCC Technician ham license ($35, 35-question exam). This unlocks VHF/UHF bands with significantly more power and range than unlicensed alternatives.

### Drone Regulations (if drone attachment added)

| Requirement | Rule |
|------------|------|
| Registration | Required for drones >250g (FAA Part 107 or recreational) |
| Remote ID | Required for all drones as of March 2024 |
| Airspace | Class G (uncontrolled) below 400 ft AGL without authorization |
| Commercial Use | Part 107 certification required |
| Night Flight | Permitted with anti-collision lighting |

### Right to Repair

The Sovereign Quad is designed from the ground up for owner repair and modification:

- No proprietary diagnostic tools required (VESC Tool is free/open-source)
- No DRM on replacement parts
- No software locks on performance (all firmware open-source)
- No dealer-only service requirements
- Standard fasteners throughout (metric hex, no proprietary)
- Published torque specs, wiring diagrams, and service procedures
- 3D-printable replacement brackets and mounts

### Intellectual Property

- All original designs released under CERN-OHL-S v2 (hardware) and GPL v3 (software)
- No patents filed or enforced by the project
- Community contributions licensed under same terms
- Third-party components used under their respective open-source licenses
- "FlowMobile Sovereign Quad" name may be trademarked for quality assurance (not to restrict use)

---

## 10. Community & Governance

### Cooperative Ownership Model

The FlowMobile project operates as a **multi-stakeholder cooperative**:

| Stakeholder Class | Role | Governance Weight |
|-------------------|------|------------------|
| **Builder Members** | Individuals who have built or are building a Sovereign Quad | 40% of voting power |
| **Developer Members** | Contributors to hardware designs, firmware, documentation | 30% of voting power |
| **Community Members** | Supporters, advocates, workshop participants | 20% of voting power |
| **Steward Members** | Long-term maintainers, treasury managers | 10% of voting power |

### Decision Framework

| Decision Type | Process | Tool |
|---------------|---------|------|
| Day-to-day operations | Steward team consensus | Signal group chat |
| Design changes (minor) | Developer review + merge | GitHub PR review |
| Design changes (major) | Community vote (72hr) | Loomio |
| Financial decisions (>$1K) | Member vote (1 week) | Loomio |
| Governance changes | Supermajority (75%) | Loomio + in-person |
| Emergency decisions | Steward team (3/5 agreement) | Signal |

### Time Banking

Build labor is tracked via a time banking system:

| Activity | Time Credits (per hour) |
|----------|----------------------|
| Welding / Fabrication | 1.0 |
| Electrical / Wiring | 1.0 |
| Composite Layup | 1.0 |
| Design / CAD Work | 1.0 |
| Documentation Writing | 1.0 |
| Teaching / Mentoring | 1.2 (bonus for knowledge transfer) |
| Community Organizing | 0.8 |
| Testing / QA | 1.0 |

Credits are redeemable for: build labor on your vehicle, components from group buys, workshop attendance, consulting time.

### Mutual Aid Integration

The Sovereign Quad network functions as a mutual aid network:

1. **Tool Libraries** - Shared welding equipment, composite molds, jigs, and fixtures
2. **Group Purchasing** - Bulk buys on LFP cells, VESC controllers, solar panels
3. **Skills Exchange** - Welders help electricians, electricians help programmers
4. **Emergency Response** - Sovereign Quad owners deploy for disaster relief (mobile power, water, comms)
5. **Land Access** - Network of properties for testing, camping, agricultural demo
6. **Salvage Network** - Members share leads on EV battery packs, military surplus, scrap materials

### Revenue Sustainability

| Revenue Stream | Description | Projected Annual |
|---------------|-------------|-----------------|
| Kit Sales | Pre-cut frame kits, wiring harnesses, BOM bundles | $50K-200K |
| Workshops | 2-day build workshops ($200-500/person, 10-20 people) | $30K-100K |
| Consulting | Custom builds, farm integration, emergency preparedness | $20K-80K |
| Documentation | Premium detailed build videos, CAD file packages | $10K-40K |
| Carbon Credits | Biochar carbon sequestration credits from fleet operations | $5K-50K |
| Merchandise | T-shirts, stickers, patches, field guides | $5K-20K |

---

## Appendices

### Appendix A: Standards Reference

| Standard | Description | Application |
|----------|-------------|-------------|
| MIL-STD-810H | Environmental engineering considerations and laboratory tests | Vehicle durability testing |
| MIL-STD-461G | EMI characteristics of subsystems | Electromagnetic compatibility |
| MIL-STD-464C | Electromagnetic environmental effects | System-level EMC |
| MIL-STD-188-125 | High-altitude EMP protection | EMP hardening design |
| MIL-STD-171F | Finishing of metal and wood surfaces | Corrosion protection |
| IP67/IP68 | Ingress Protection (IEC 60529) | Electronics enclosure rating |
| SAE J1211 | Environmental practices for electronic equipment | Off-road electronics |
| AES-256 | Advanced Encryption Standard, 256-bit | Communications and storage |
| CERN-OHL-S v2 | Open Hardware License, Strong Reciprocal | Hardware design licensing |
| GPL v3 | GNU General Public License | Software licensing |
| CC-BY-SA 4.0 | Creative Commons Attribution-ShareAlike | Documentation licensing |

### Appendix B: Key Suppliers

| Category | Supplier | URL | Key Products |
|----------|----------|-----|-------------|
| Motor Controllers | VESC Project | vesc-project.com | VESC 6.9, firmware |
| Motors | QS Motor | qsmotor.com | Hub motors, mid-drive |
| LFP Cells | EVE Energy | evebattery.com | Prismatic LFP cells |
| BMS | Libre Solar | github.com/LibreSolar | Open-source BMS |
| Solar Panels | BougeRV | bougerv.com | Flexible panels |
| Solar (military) | PowerFilm | powerfilmsolar.com | CIGS rollable panels |
| Mesh Comms | Meshtastic | meshtastic.org | LoRa mesh firmware |
| Satellite | Starlink | starlink.com | Starlink Mini |
| Water Filter | Sawyer Products | sawyer.com | Squeeze filter |
| Composites | Entropy Resins | entropyresins.com | Bio-based epoxy |
| UHMWPE | Interstate Plastics | interstateplastics.com | Sheet/rod stock |
| Faraday Fabric | TitanRF | mosequipment.com | Shielding fabric |
| Surplus | GovPlanet | govplanet.com | Military surplus |
| 3D Printing | Creality | creality.com | Field printers |

### Appendix C: Safety Warnings

1. **High Voltage**: 48-72V battery systems can deliver lethal current. Disconnect and verify zero voltage before any electrical work.
2. **Lithium Batteries**: LFP cells are among the safest lithium chemistries but still require proper BMS protection, fusing, and ventilation.
3. **Welding**: All frame welding should be performed by qualified welders. Non-destructive testing (dye penetrant) recommended on critical joints.
4. **Composites**: Bio-resin and composite work requires proper ventilation, eye protection, and skin protection.
5. **Off-Road Operation**: This vehicle has a high center of gravity when fully loaded. Roll-over risk increases on slopes >30 degrees.
6. **EMP Protection**: EMP hardening reduces risk but does not guarantee protection against all electromagnetic threats.
7. **Water Purification**: Sawyer filters remove bacteria and protozoa but NOT viruses or chemicals. UV purification addresses viruses. Chemical contamination requires activated carbon filtration.
8. **Radio Licensing**: Operating on amateur radio bands without a license is a federal offense (47 USC 301). Obtain appropriate licenses before transmitting.

---

*This document is released under Creative Commons CC-BY-SA 4.0. The FlowMobile Sovereign Quad is an open-source project. Build at your own risk. No warranty expressed or implied.*
