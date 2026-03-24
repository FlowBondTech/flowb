# FlowMobile Sovereign Quad - Bill of Materials

**Version**: 1.0
**Date**: 2026-03-09
**Vehicle Class**: Regenerative Off-Grid Sovereign Quad (Motorcycle/ATV)
**Build Tiers**: T1 (Basic $5-8K) | T2 (Standard $12-18K) | T3 (Full Sovereign $25-35K)

---

## A. POWERTRAIN

| # | Component | Specification | Source | Est. Price | Open Source Alt | Build Difficulty (1-5) | Tier |
|---|-----------|---------------|--------|------------|-----------------|----------------------|------|
| A1 | QS Motor BLDC Hub Motor | 5kW, 48V, BLDC | QS Motor | $350-500 ea | - | 3 | T1 (x1) |
| A2 | QS Motor BLDC Hub Motor (2nd) | 5kW, 48V, BLDC | QS Motor | $350-500 | - | 3 | T2 (x2 total) |
| A3 | QS Motor BLDC Hub Motor (3rd+4th) | 5kW, 48V, BLDC | QS Motor | $700-1,000 | - | 3 | T3 (x4 total) |
| A4 | VESC 6.9 Motor Controller | 60V/100A, FOC | vesc-project.com | $150-300 ea | Yes (VESC Project) | 2 | T1 (x1) |
| A5 | VESC 6.9 Motor Controller (2nd) | 60V/100A, FOC | vesc-project.com | $150-300 | Yes (VESC Project) | 2 | T2 (x2 total) |
| A6 | VESC 6.9 Motor Controller (3rd+4th) | 60V/100A, FOC | vesc-project.com | $300-600 | Yes (VESC Project) | 2 | T3 (x4 total) |
| A7 | Axiom 100kW Controller | 100kW backup controller | Hackaday.io | $300-600 | Yes (Open Source) | 4 | T3 |
| A8 | Hall-effect Throttle | Thumb/twist, 0-5V | Generic | $15-30 | - | 1 | T1+ |
| A9 | Hydraulic Disc Brakes (x4) | Dual-piston caliper | Shimano/Tektro | $160-320 | - | 2 | T1+ |
| A10 | Brake Rotors 220mm (x4) | Stainless, 220mm | Generic | $60-100 | - | 1 | T1+ |
| A11 | Motor Cables and Connectors | Phase wires, sensor cables | Generic | $50-100 | - | 2 | T1+ |

### Powertrain Subtotals

| Tier | Components Included | Estimated Cost |
|------|---------------------|----------------|
| **T1** | A1, A4, A8-A11 | $785-1,350 |
| **T2** | A1-A2, A4-A5, A8-A11 | $1,285-2,150 |
| **T3** | A1-A3, A4-A6, A7-A11 | $2,285-3,750 |

---

## B. BATTERY SYSTEM

| # | Component | Specification | Source | Est. Price | Open Source Alt | Build Difficulty (1-5) | Tier |
|---|-----------|---------------|--------|------------|-----------------|----------------------|------|
| B1 | LiFePO4 Battery Module (1st) | 48V 100Ah, 4.8kWh | Vatrer/GoldenMate/Renogy | $400-500 | - | 3 | T1 (x1) |
| B2 | LiFePO4 Battery Module (2nd) | 48V 100Ah, 4.8kWh | Vatrer/GoldenMate/Renogy | $400-500 | - | 3 | T2 (x2 total) |
| B3 | LiFePO4 Battery Module (3rd+4th) | 48V 100Ah, 4.8kWh | Vatrer/GoldenMate/Renogy | $800-1,000 | - | 3 | T3 (x4 total) |
| B4 | Libre Solar BMS | 16S, 100A | github.com/LibreSolar | $50-150 | Yes (Libre Solar) | 3 | T1-T2 |
| B5 | ENNOID-BMS (alternative) | 16S, configurable | ennoid.me | $100-300 | Yes (ENNOID) | 3 | T1-T2 |
| B6 | foxBMS (certified option) | Automotive-certified | foxbms.org | $200-500 | Yes (foxBMS) | 4 | T3 |
| B7 | IP68 Battery Enclosure | Per module, sealed | Custom/Alibaba | $100-300 ea | - | 3 | T1+ |
| B8 | Anderson SB350 Connectors | Per module, 350A rated | Anderson Power | $20-40 ea | - | 1 | T1+ |
| B9 | Battery Cables 4/0 AWG | Tinned copper, flexible | Generic | $50-100 | - | 2 | T1+ |
| B10 | DC-DC Converter | 48V to 12V, 20A+ | Generic | $30-60 | - | 1 | T1+ |
| B11 | Main Fuse/Breaker | 200A DC rated | Generic | $20-40 | - | 1 | T1+ |
| B12 | Precharge Circuit | Resistor + relay, inrush limiter | DIY | $15-30 | - | 3 | T2+ |

### Battery System Subtotals

| Tier | Components Included | Estimated Cost |
|------|---------------------|----------------|
| **T1** | B1, B4, B7(x1), B8(x1), B9-B11 | $670-1,040 |
| **T2** | B1-B2, B4, B7(x2), B8(x2), B9-B12 | $1,205-1,960 |
| **T3** | B1-B3, B6, B7(x4), B8(x4), B9-B12 | $2,395-3,830 |

---

## C. FRAME & SUSPENSION

| # | Component | Specification | Source | Est. Price | Open Source Alt | Build Difficulty (1-5) | Tier |
|---|-----------|---------------|--------|------------|-----------------|----------------------|------|
| C1 | 4130 Chromoly Tube Stock | Various diameters (1", 1.25", 1.5") | Metals Supplier | $200-400 | - | 4 (welding) | T1+ |
| C2 | 6061-T6 Aluminum Nodes/Brackets | CNC or hand-cut | Metals Supplier | $100-200 | - | 4 (machining) | T1+ |
| C3 | Type III Hard Anodize | Frame nodes, corrosion protection | Anodizing Service | $200-400 | - | 1 (outsourced) | T2+ |
| C4 | Front Double A-arm Suspension Kit | Full geometry, adjustable | Custom/ATV Supplier | $300-600 | - | 4 | T1+ |
| C5 | Rear Trailing Arm/Swingarm | Heavy-duty, adjustable | Custom/ATV Supplier | $200-400 | - | 4 | T1+ |
| C6 | Coilover Shocks (x4) | Adjustable rebound/compression | Fox/DNM | $400-1,200 | - | 2 | T1+ |
| C7 | Rack and Pinion Steering | ATV-spec, sealed | ATV Supplier | $100-200 | - | 3 | T1+ |
| C8 | Steering Column + Handlebars | Steel/aluminum, adjustable | Generic | $50-100 | - | 2 | T1+ |
| C9 | Wheels 12" Alloy (x4) | Bolt pattern matched | ATV Supplier | $200-400 | - | 1 | T1+ |
| C10 | Tires (x4) | 25x8-12 front, 25x10-12 rear | Maxxis/Kenda | $240-480 | - | 1 | T1+ |
| C11 | Zinc-Nickel Fastener Set | Grade 10.9, corrosion resistant | McMaster-Carr | $100-200 | - | 1 | T2+ |
| C12 | Bearings and Bushings | Sealed, greased | Generic | $50-100 | - | 2 | T1+ |

### Frame & Suspension Subtotals

| Tier | Components Included | Estimated Cost |
|------|---------------------|----------------|
| **T1** | C1-C2, C4-C10, C12 | $1,840-3,680 |
| **T2** | C1-C12 | $2,140-4,280 |
| **T3** | C1-C12 | $2,140-4,280 |

---

## D. BODY & MATERIALS

| # | Component | Specification | Source | Est. Price | Open Source Alt | Build Difficulty (1-5) | Tier |
|---|-----------|---------------|--------|------------|-----------------|----------------------|------|
| D1 | Sheet Metal Body Panels | 16-18 gauge, mild steel/aluminum | Metals Supplier | $100-200 | - | 3 | T1 |
| D2 | Hemp Fiber Fabric | 10-20 m2, structural layup | Hemp Suppliers | $50-200 | - | 3 (layup) | T2+ |
| D3 | Bio-Based Epoxy Resin | 2-part, low VOC | entropyresins.com | $100-200 | - | 3 | T2+ |
| D4 | UHMWPE Skid Plates | Sheet stock, cut to fit | Interstate Plastics | $100-300 | - | 2 | T2+ |
| D5 | Recycled Carbon Fiber Panels | Reclaimed CF, structural | Recycled CF Suppliers | $200-500 | - | 4 | T3 |
| D6 | Mycelium Insulation Panels | Grown-to-form, thermal | Specialty Suppliers | $50-100 | - | 2 | T3 |
| D7 | Powder Coat (CARC-equiv) | Full frame coating | Coating Service | $200-400 | - | 1 (outsourced) | T2+ |
| D8 | Cerakote (small parts) | Thin-film ceramic | Coating Service | $100-200 | - | 1 (outsourced) | T3 |
| D9 | Seat | Vinyl over foam, weather resistant | ATV Supplier | $50-150 | - | 1 | T1+ |

### Body & Materials Subtotals

| Tier | Components Included | Estimated Cost |
|------|---------------------|----------------|
| **T1** | D1, D9 | $150-350 |
| **T2** | D2-D4, D7, D9 | $500-1,250 |
| **T3** | D2-D9 | $850-2,050 |

---

## E. ENERGY HARVESTING

| # | Component | Specification | Source | Est. Price | Open Source Alt | Build Difficulty (1-5) | Tier |
|---|-----------|---------------|--------|------------|-----------------|----------------------|------|
| E1 | Flexible Solar Panels (T1) | 100W, monocrystalline | BougeRV/Renogy | $80-120 | - | 1 | T1 |
| E2 | Flexible Solar Panels (T2-T3) | 300W integrated, monocrystalline | BougeRV/Renogy | $200-400 | - | 2 | T2+ |
| E3 | Deployable CIGS Solar (T2) | 400W, rollable | PowerFilm | $500-1,000 | - | 2 | T2 |
| E4 | Deployable CIGS Solar (T3) | 800W, rollable | PowerFilm/P3 Solar | $1,000-2,000 | - | 2 | T3 |
| E5 | MPPT Charge Controller | 48V/30A | Victron/EPEver | $100-150 | - | 2 | T2+ |
| E6 | PWM Controller (T1 basic) | 48V/10A | Generic | $20-40 | - | 1 | T1 |
| E7 | Solar Mounting Hardware | Custom brackets, tilt-adjust | Custom | $30-50 | - | 2 | T1+ |
| E8 | Bidirectional Inverter 3kW (T2) | 48V, pure sine, grid-tie | EG4/Growatt | $800-1,200 | - | 3 | T2 |
| E9 | Bidirectional Inverter 5-10kW (T3) | 48V, pure sine, grid-tie | EG4/Growatt | $1,200-2,000 | - | 3 | T3 |
| E10 | Transfer Switch 30A | Manual/automatic | Reliance/Generac | $200-400 | - | 2 | T2+ |
| E11 | Electromagnetic Regen Dampers (x4) | Energy recovery from suspension | Custom/ClearMotion concept | $2,000-6,000 | - | 5 | T3 |

### Energy Harvesting Subtotals

| Tier | Components Included | Estimated Cost |
|------|---------------------|----------------|
| **T1** | E1, E6, E7 | $130-210 |
| **T2** | E2-E3, E5, E7-E8, E10 | $1,830-3,200 |
| **T3** | E2, E4-E5, E7, E9-E11 | $4,530-10,450 |

---

## F. ELECTRONICS & WIRING

| # | Component | Specification | Source | Est. Price | Open Source Alt | Build Difficulty (1-5) | Tier |
|---|-----------|---------------|--------|------------|-----------------|----------------------|------|
| F1 | Main Wiring Harness | Full vehicle, labeled | Custom Build | $100-300 | - | 3 | T1+ |
| F2 | Shielded Twisted-Pair Cable | 100ft, EMI resistant | Mil-Spec Supplier | $100-200 | - | 2 | T2+ |
| F3 | MIL-SPEC Connectors (set of 20) | Environmentally sealed | Amphenol/Deutsch | $100-400 | - | 2 | T2+ |
| F4 | 12V LED Lighting Kit | Head/tail/brake/signal | Generic | $50-100 | - | 1 | T1+ |
| F5 | Instrument Display | Speed, battery, temp, VESC compatible | VESC Compatible | $50-150 | - | 2 | T1+ |
| F6 | Kill Switch / E-Stop | Mushroom button, weatherproof | Generic | $10-20 | - | 1 | T1+ |
| F7 | Key Switch / RFID Ignition | Anti-theft, waterproof | Generic | $20-50 | - | 2 | T1+ |
| F8 | Ferrite Chokes (set of 20) | Snap-on, various sizes | Generic | $30-60 | - | 1 | T2+ |

### Electronics & Wiring Subtotals

| Tier | Components Included | Estimated Cost |
|------|---------------------|----------------|
| **T1** | F1, F4-F7 | $230-620 |
| **T2** | F1-F8 | $460-1,280 |
| **T3** | F1-F8 | $460-1,280 |

---

## G. COMMUNICATIONS

| # | Component | Specification | Source | Est. Price | Open Source Alt | Build Difficulty (1-5) | Tier |
|---|-----------|---------------|--------|------------|-----------------|----------------------|------|
| G1 | Meshtastic LoRa Node (T1: x2) | 915MHz, ESP32-based | Heltec/LILYGO | $40-100 | Yes (Meshtastic) | 1 | T1 (x2) |
| G2 | Meshtastic LoRa Node (T2: +2) | 915MHz, ESP32-based | Heltec/LILYGO | $40-100 | Yes (Meshtastic) | 1 | T2 (x4 total) |
| G3 | Meshtastic LoRa Node (T3: +4) | 915MHz, ESP32-based | Heltec/LILYGO | $80-200 | Yes (Meshtastic) | 1 | T3 (x8 total) |
| G4 | LoRa Antenna 915MHz (per node) | Omnidirectional, SMA | Generic | $20-40 (T1 x2) | - | 1 | T1+ |
| G5 | LoRa Antenna 915MHz (additional) | Omnidirectional, SMA | Generic | $20-40 (T2 +2) | - | 1 | T2+ |
| G6 | LoRa Antenna 915MHz (additional) | Omnidirectional, SMA | Generic | $40-80 (T3 +4) | - | 1 | T3 |
| G7 | Solar Relay Node Kit | Self-powered mesh repeater | DIY Assembly | $50-100 ea | - | 2 | T2+ |
| G8 | Samsung Galaxy Tab Active4 Pro | ATAK-compatible, rugged | Samsung | $500-700 | - | 1 | T2+ |
| G9 | RAM Mount Tablet Mount | Vibration dampened | RAM Mounts | $50-100 | - | 1 | T2+ |
| G10 | Garmin inReach Mini 2 | Satellite messenger, SOS | Garmin | $350-400 | - | 1 | T2 |
| G11 | Starlink Mini | LEO satellite internet | Starlink | $249 | - | 1 | T3 |
| G12 | Iridium GO! exec | Satellite hotspot, global | Iridium | $1,200-1,500 | - | 1 | T3 |
| G13 | goTenna Pro X2 | Off-grid mesh networking | goTenna | $150-300 | - | 1 | T3 |
| G14 | External GNSS Antenna | Multi-band, active | u-blox | $30-80 | - | 1 | T2+ |
| G15 | VHF/UHF Ham Radio | Dual-band mobile, 50W | Yaesu/Kenwood | $200-400 | - | 2 | T3 |

### Communications Subtotals

| Tier | Components Included | Estimated Cost |
|------|---------------------|----------------|
| **T1** | G1, G4 | $60-140 |
| **T2** | G1-G2, G4-G5, G7(x2), G8-G10, G14 | $1,110-1,860 |
| **T3** | G1-G6, G7(x4), G8-G9, G11-G15 | $2,809-4,200 |

---

## H. DIGITAL SOVEREIGNTY

| # | Component | Specification | Source | Est. Price | Open Source Alt | Build Difficulty (1-5) | Tier |
|---|-----------|---------------|--------|------------|-----------------|----------------------|------|
| H1 | Raspberry Pi Zero 2 W | Quad-core, 512MB | raspberrypi.com | $15-20 | - | 2 | T1 |
| H2 | Raspberry Pi 5 8GB | Quad-core, 8GB RAM | raspberrypi.com | $80-100 | - | 2 | T2+ |
| H3 | 1TB NVMe SSD | PCIe Gen4, endurance rated | Samsung/WD | $80-120 | - | 1 | T2+ |
| H4 | 256GB microSD A2 | High-endurance, A2 speed | SanDisk | $25-40 | - | 1 | T1+ |
| H5 | IP67 Electronics Enclosure | Sealed, ventilated | Generic | $50-100 | - | 1 | T1+ |
| H6 | USB-C PD Charger/Hub | Multi-port, 100W | Generic | $20-40 | - | 1 | T1+ |

### Digital Sovereignty Subtotals

| Tier | Components Included | Estimated Cost |
|------|---------------------|----------------|
| **T1** | H1, H4-H6 | $110-200 |
| **T2** | H2-H6 | $255-400 |
| **T3** | H1-H6 | $270-420 |

---

## I. WATER SYSTEMS

| # | Component | Specification | Source | Est. Price | Open Source Alt | Build Difficulty (1-5) | Tier |
|---|-----------|---------------|--------|------------|-----------------|----------------------|------|
| I1 | Sawyer Squeeze Filter | 0.1 micron, hollow fiber | Sawyer Products | $35 | - | 1 | T1+ |
| I2 | Sawyer Gravity System | 0.1 micron, 1-gal bags | Sawyer Products | $50-70 | - | 1 | T2+ |
| I3 | UV-C Purifier (inline 12V) | Inline, virus-capable | SteriPEN/Custom | $50-150 | - | 2 | T2+ |
| I4 | Shurflo 12V Diaphragm Pump | 3.5 GPM, self-priming | Shurflo | $80-150 | - | 2 | T2+ |
| I5 | Collapsible Water Bladder (T2) | 20-gallon, BPA-free | Hydrapak | $50-100 | - | 1 | T2 |
| I6 | Collapsible Water Bladder (T3) | 50-gallon, BPA-free | Hydrapak | $100-150 | - | 1 | T3 |
| I7 | Sediment Pre-Filter | 50 micron, inline | Generic | $10-20 | - | 1 | T2+ |
| I8 | Plumbing Fittings and Hose | Quick-connect, food-grade | Hardware Store | $30-50 | - | 2 | T1+ |
| I9 | Rainwater Collection Channels | Custom fabricated, frame-integrated | Custom Fabrication | $50-100 | - | 3 | T3 |

### Water Systems Subtotals

| Tier | Components Included | Estimated Cost |
|------|---------------------|----------------|
| **T1** | I1, I8 | $65-85 |
| **T2** | I1-I5, I7-I8 | $305-560 |
| **T3** | I1-I4, I6-I9 | $405-690 |

---

## J. SHELTER & TOOLS

| # | Component | Specification | Source | Est. Price | Open Source Alt | Build Difficulty (1-5) | Tier |
|---|-----------|---------------|--------|------------|-----------------|----------------------|------|
| J1 | Silnylon Tarp 10x12 | Waterproof, ultralight | Kelty/Paria | $50-150 | - | 1 | T1+ |
| J2 | Hammock + Straps | Double, 400lb capacity | ENO | $70-100 | - | 1 | T2+ |
| J3 | Bivy Sack | Waterproof, breathable | OR/SOL | $80-200 | - | 1 | T3 |
| J4 | Deployable Canopy 10x10 | Modified for vehicle mount | Custom/Modified | $100-300 | - | 2 | T2+ |
| J5 | 3D Printer | Creality Ender 3 V3 SE | Creality | $180-250 | - | 2 | T3 |
| J6 | Filament PLA/PETG/TPU | 3 spools, 1kg each | Various | $60-90 | - | 1 | T3 |
| J7 | Hand Tool Set (metric) | Wrenches, sockets, hex keys | Various | $100-200 | - | 1 | T2+ |
| J8 | Battery Stick Welder | 12V/48V compatible | Amico | $150-250 | - | 3 | T3 |
| J9 | 12V Air Compressor | Portable, 150 PSI | Generic | $30-60 | - | 1 | T2+ |
| J10 | Tire Repair Kit | Plugs, patches, tools | Generic | $15-30 | - | 1 | T1+ |
| J11 | Earthbag Set | Bags, wire, tamper | CalEarth/Amazon | $80-150 | - | 2 | T3 |

### Shelter & Tools Subtotals

| Tier | Components Included | Estimated Cost |
|------|---------------------|----------------|
| **T1** | J1, J10 | $65-180 |
| **T2** | J1-J2, J4, J7, J9-J10 | $365-840 |
| **T3** | J1-J11 | $915-1,780 |

---

## K. AGRICULTURE

| # | Component | Specification | Source | Est. Price | Open Source Alt | Build Difficulty (1-5) | Tier |
|---|-----------|---------------|--------|------------|-----------------|----------------------|------|
| K1 | Broadcast Seeder (ATV mount) | 12V, hopper, adjustable spread | Chapin/Buyers | $200-500 | - | 2 | T2+ |
| K2 | Soil EC Sensor | Electrical conductivity, DIY or commercial | DIY / Veris | $200-500 (DIY) | - | 3 | T2+ |
| K3 | Soil Moisture Probe (capacitive) | Multi-depth, data output | Decagon/METER | $100-500 | - | 2 | T2+ |
| K4 | RTK GPS Module | u-blox F9P, cm-level accuracy | u-blox | $200-400 | - | 3 | T3 |
| K5 | Data Logger (ESP32 based) | Multi-sensor, SD logging | DIY | $30-80 | Yes (ESP32 OSS) | 3 | T2+ |
| K6 | TLUD Biochar Micro-Kiln | Top-Lit UpDraft, portable | DIY Plans | $50-200 | Yes (open plans) | 3 | T3 |
| K7 | Quench System | 12V pump + spray nozzle | Generic | $30-50 | - | 2 | T3 |
| K8 | Inoculant Tank (5-gal) | HDPE, sealed lid | Generic | $20-30 | - | 1 | T3 |
| K9 | Biochar Spreader Hopper | Modified/DIY, gravity-fed | DIY/Modified | $100-200 | - | 3 | T3 |
| K10 | Cover Crop Seed Mix | 50 lb bag, regional blend | Local Seed Supplier | $150-400 | - | 1 | T2+ |

### Agriculture Subtotals

| Tier | Components Included | Estimated Cost |
|------|---------------------|----------------|
| **T1** | - | $0 |
| **T2** | K1-K3, K5, K10 | $680-1,980 |
| **T3** | K1-K10 | $1,080-2,860 |

---

## L. EMP HARDENING

| # | Component | Specification | Source | Est. Price | Open Source Alt | Build Difficulty (1-5) | Tier |
|---|-----------|---------------|--------|------------|-----------------|----------------------|------|
| L1 | Aluminum Die-Cast Faraday Enclosures | x3 (T2) / x5 (T3), sealed gasket | Custom/Alibaba | $600-1,500 (T2 x3) | - | 2 | T2+ |
| L2 | Surge Protection Devices (set) | MOV + TVS, multi-stage | Various | $200-1,000 | - | 2 | T2+ |
| L3 | Gas Discharge Tubes (x4) | Antenna line protection | Various | $50-200 | - | 3 | T3 |
| L4 | TitanRF Faraday Fabric | Vehicle cover, full Faraday | mosequipment.com | $200-500 | - | 1 | T3 |
| L5 | Shielded Cable Upgrade | Full vehicle replacement | Mil-Spec Supplier | $200-400 | - | 3 | T3 |

### EMP Hardening Subtotals

| Tier | Components Included | Estimated Cost |
|------|---------------------|----------------|
| **T1** | - | $0 |
| **T2** | L1(x3), L2 | $800-2,500 |
| **T3** | L1(x5), L2-L5 | $1,650-3,600 |

---

## COST SUMMARY

### Subsystem Totals by Tier

| Subsystem | T1 (Basic) | T2 (Standard) | T3 (Full Sovereign) |
|-----------|------------|----------------|---------------------|
| **A. Powertrain** | $785-1,350 | $1,285-2,150 | $2,285-3,750 |
| **B. Battery System** | $670-1,040 | $1,205-1,960 | $2,395-3,830 |
| **C. Frame & Suspension** | $1,840-3,680 | $2,140-4,280 | $2,140-4,280 |
| **D. Body & Materials** | $150-350 | $500-1,250 | $850-2,050 |
| **E. Energy Harvesting** | $130-210 | $1,830-3,200 | $4,530-10,450 |
| **F. Electronics & Wiring** | $230-620 | $460-1,280 | $460-1,280 |
| **G. Communications** | $60-140 | $1,110-1,860 | $2,809-4,200 |
| **H. Digital Sovereignty** | $110-200 | $255-400 | $270-420 |
| **I. Water Systems** | $65-85 | $305-560 | $405-690 |
| **J. Shelter & Tools** | $65-180 | $365-840 | $915-1,780 |
| **K. Agriculture** | $0 | $680-1,980 | $1,080-2,860 |
| **L. EMP Hardening** | $0 | $800-2,500 | $1,650-3,600 |
| | | | |
| **Parts Subtotal** | **$4,105-7,855** | **$10,935-22,260** | **$19,789-39,190** |

### Assembly & Integration Estimates

| Phase | T1 (Basic) | T2 (Standard) | T3 (Full Sovereign) |
|-------|------------|----------------|---------------------|
| Frame welding & fabrication | $500-1,000 | $800-1,500 | $1,000-2,000 |
| Suspension assembly | $200-400 | $300-500 | $400-600 |
| Powertrain integration | $200-400 | $400-800 | $600-1,200 |
| Battery installation | $100-200 | $200-400 | $400-800 |
| Wiring & electronics | $200-400 | $400-800 | $600-1,200 |
| Body panels & finishing | $100-200 | $300-600 | $500-1,000 |
| Solar & energy systems | $50-100 | $200-400 | $400-800 |
| Communications setup | $50-100 | $100-200 | $200-400 |
| Water & shelter systems | $50-100 | $100-200 | $200-400 |
| Agriculture systems | - | $100-200 | $200-400 |
| EMP hardening | - | $200-400 | $400-800 |
| Testing & commissioning | $100-200 | $200-400 | $400-800 |
| | | | |
| **Assembly Subtotal** | **$1,550-3,100** | **$3,300-6,400** | **$5,300-10,400** |

### Grand Totals

| | T1 (Basic) | T2 (Standard) | T3 (Full Sovereign) |
|---|------------|----------------|---------------------|
| **Parts** | $4,105-7,855 | $10,935-22,260 | $19,789-39,190 |
| **Assembly & Integration** | $1,550-3,100 | $3,300-6,400 | $5,300-10,400 |
| **Grand Total** | **$5,655-10,955** | **$14,235-28,660** | **$25,089-49,590** |
| **Target Range** | **$5K-8K** | **$12K-18K** | **$25K-35K** |

### Notes on Target Pricing

- **T1 target ($5K-8K)**: Achievable at low-end estimates with self-fabrication and sourcing budget components. Frame is the largest cost driver; using salvaged ATV parts can reduce C-section costs significantly.
- **T2 target ($12K-18K)**: Achievable at low-to-mid estimates. Key cost drivers are the bidirectional inverter (E8), deployable solar (E3), ATAK tablet (G8), and EMP hardening (L1-L2). Phased purchasing recommended.
- **T3 target ($25K-35K)**: Achievable at low-to-mid estimates. Electromagnetic regen dampers (E11) are the single highest-cost item and can be deferred. Iridium GO! (G12) and Starlink (G11) represent significant comms costs with recurring subscription fees not included here.

### Recurring Costs (Not Included Above)

| Service | Monthly Cost | Tier |
|---------|-------------|------|
| Garmin inReach subscription | $12-50/mo | T2 |
| Starlink Mini service | $50-120/mo | T3 |
| Iridium GO! exec service | $75-150/mo | T3 |
| Cover crop seed (annual) | $150-400/yr | T2+ |
| 3D printer filament (as needed) | $20-30/spool | T3 |

---

*FlowMobile Sovereign Quad BOM v1.0 -- All prices in USD, estimated as of 2026. Prices vary by supplier, quantity, and market conditions. Open source alternatives noted where available. Build difficulty rated 1 (plug-and-play) to 5 (specialist skills/tooling required).*
