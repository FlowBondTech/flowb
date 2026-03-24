# FlowMobile Sovereign Quad - Development Roadmap

A phased development plan for building a sovereign, off-grid electric quad vehicle with communications, water purification, solar harvesting, military hardening, and community replication.

---

## Phase 1: Proof of Concept (Months 1-4, Budget: $5,000-8,000)

**Objective**: Build a rideable electric quad frame with battery and motor.

### Milestones

#### 1.1 Frame Design & Fabrication (Month 1-2)
- Design frame in FreeCAD based on reference ATV geometry
- Source 4130 chromoly tube stock
- Weld frame at makerspace (or outsource to fabricator)
- Basic suspension: front double A-arm, rear swingarm
- Install rack and pinion steering

**Deliverable**: Rolling chassis with suspension and steering

#### 1.2 Powertrain Integration (Month 2-3)
- Install single 5kW hub motor (rear wheel)
- Wire VESC 6.9 controller
- Configure VESC Tool: motor detection, throttle mapping, regen braking
- Install throttle and brake controls

**Deliverable**: Powered chassis, can move under its own power

#### 1.3 Battery Module v1 (Month 2-3)
- Build first 48V/100Ah LFP module (16S1P from prismatic cells)
- Install Libre Solar BMS
- Build IP67 enclosure with Anderson SB350 connector
- Install precharge circuit and main fuse

**Deliverable**: One complete battery module, bench-tested

#### 1.4 Integration & Testing (Month 3-4)
- Mount battery module in frame
- Wire complete electrical system (48V main bus, 12V auxiliary)
- Install basic sheet metal body panels
- Road test: range, speed, braking, handling
- Document: build log, photos, measurements, lessons learned

**Deliverable**: Rideable Tier 1 electric quad with documented performance

### Go/No-Go Criteria
- Vehicle achieves 15+ mph top speed
- Range exceeds 15 miles on flat terrain
- Regen braking functional (measurable energy recovery)
- Frame and suspension survive 50 miles of mixed terrain without failure
- Battery module holds charge and balances cells properly
- Total cost under $8,000

### Risk Factors
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Frame geometry needs iteration for stability | Medium | Medium | Test with sandbag ballast before full build-out; adjust geometry early |
| Hub motor requires different KV rating for desired speed/torque | Medium | Low | Order motor with return policy; have backup KV option identified |
| BMS configuration needs tuning for cell balancing | High | Low | Budget extra bench-testing time; Libre Solar community has config guides |
| Welding quality issues at makerspace | Low | High | Get test welds inspected; have backup fabricator quoted |
| Component lead times delay integration | Medium | Medium | Order long-lead items (motor, cells, BMS) in week 1 |

### Estimated Timeline
| Task | Month 1 | Month 2 | Month 3 | Month 4 |
|------|---------|---------|---------|---------|
| Frame Design & Fabrication | ======= | ======= | | |
| Powertrain Integration | | ======= | ======= | |
| Battery Module v1 | | ======= | ======= | |
| Integration & Testing | | | ======= | ======= |

---

## Phase 2: Sovereignty Stack (Months 4-8, Budget: $4,000-7,000)

**Objective**: Add communications, digital sovereignty, and water systems.

### Milestones

#### 2.1 Communications Network (Month 4-5)
- Build 4 Meshtastic nodes (2 vehicle-mounted, 2 relay)
- Configure channel encryption (AES-256)
- Deploy solar relay node at test site
- Install ATAK/CivTAK on ruggedized Android tablet
- Mount tablet on vehicle with RAM mount
- Test: mesh range, message delivery, GPS tracking

**Deliverable**: Working encrypted mesh network with ATAK integration

#### 2.2 Digital Sovereignty Platform (Month 5-6)
- Set up Raspberry Pi 5 in IP67 Faraday enclosure
- Install sovereignty stack: Nextcloud, Vaultwarden, WireGuard, Pi-hole
- Configure full-disk encryption (LUKS)
- Install Grafana + Prometheus for vehicle telemetry
- Build ESP32 telemetry node for vehicle data collection
- Install offline maps (OSM tiles for local region)

**Deliverable**: Self-hosted digital platform accessible via vehicle WiFi AP

#### 2.3 Water Purification System (Month 6-7)
- Install Sawyer Squeeze filter system
- Add UV-C purification stage
- Install 12V Shurflo pump
- Mount 20-gallon collapsible bladder
- Plumb complete water system with quick-disconnect fittings
- Test: flow rate, filter performance, pump reliability

**Deliverable**: Working on-board water purification producing potable water

#### 2.4 Second Battery Module + V2H (Month 7-8)
- Build second 48V/100Ah battery module
- Install bidirectional inverter (3 kW)
- Wire transfer switch for V2H capability
- Add NEMA outlets to vehicle
- Test: V2H power export, module hot-swap, dual-module range

**Deliverable**: 9.6 kWh battery system with V2H power export

### Go/No-Go Criteria
- Meshtastic mesh delivers messages reliably at 2+ km range
- ATAK shows real-time position tracking of all mesh nodes
- Nextcloud accessible from any device on vehicle WiFi
- Water system produces potable water at 1+ GPM
- V2H system exports 3 kW to standard household loads
- Hot-swap: battery module swappable in under 3 minutes
- All new systems survive 100 miles of off-road operation

### Risk Factors
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Meshtastic range limited by terrain | High | Medium | Use 900MHz band for better penetration; elevate relay nodes; test multiple antenna types |
| Raspberry Pi power/heat issues in sealed enclosure | Medium | Medium | Add passive heatsink and thermal pad to enclosure wall; monitor temps via Grafana |
| Water system plumbing leaks under vibration | High | Low | Use push-to-connect fittings with locking clips; pressure test before each ride |
| Second battery module adds weight affecting handling | Medium | Medium | Mount low and center in frame; re-test suspension with added weight |
| VESC thermal limits under sustained V2H load | Low | High | Add dedicated cooling fan; set thermal rollback in VESC Tool |

### Estimated Timeline
| Task | Month 4 | Month 5 | Month 6 | Month 7 | Month 8 |
|------|---------|---------|---------|---------|---------|
| Communications Network | ======= | ======= | | | |
| Digital Sovereignty Platform | | ======= | ======= | | |
| Water Purification System | | | ======= | ======= | |
| Second Battery + V2H | | | | ======= | ======= |

---

## Phase 3: Regenerative Systems (Months 8-14, Budget: $3,000-6,000)

**Objective**: Add solar harvesting, agricultural capabilities, and field tools.

### Milestones

#### 3.1 Solar Integration (Month 8-10)
- Bond 300W flexible panels to body surfaces
- Build 400W deployable ground array with quick-deploy frame
- Install MPPT charge controller (48V/30A)
- Wire solar into battery charging circuit
- Test: daily harvest in various conditions, charging rate, panel durability

**Deliverable**: 700W total solar with vehicle-integrated and deployable panels

#### 3.2 Agricultural Systems (Month 10-12)
- Install ATV-mount broadcast seeder
- Build soil moisture sensor with ESP32 data logger
- Install GPS logger for field mapping
- Build TLUD biochar micro-kiln (off-vehicle, camp use)
- Test: seeding coverage, soil data collection, biochar production

**Deliverable**: Working agricultural suite with data logging

#### 3.3 Shelter & Field Tools (Month 11-13)
- Build deployable canopy with solar panel mount points
- Assemble shelter kit (tarp, hammock, bivy)
- Mount 3D printer for field repairs (12V operation from vehicle battery)
- Assemble hand tool kit and tire repair system
- Test: shelter deployment time, 3D printer functionality off vehicle power

**Deliverable**: Complete field-deployable shelter and repair capability

#### 3.4 Body Panel Upgrade (Month 12-14)
- Lay up hemp fiber composite panels with bio-resin
- Fabricate UHMWPE skid plates
- Install upgraded panels on vehicle
- Apply powder coat to frame
- Test: impact resistance, water resistance, UV durability

**Deliverable**: Bio-composite body panels installed and tested

### Go/No-Go Criteria
- Solar produces 1,500+ Wh/day in sunny conditions
- Seeder covers 30+ ft width at reasonable travel speed
- Soil sensor data logs correctly with GPS correlation
- 3D printer successfully produces a replacement bracket from vehicle power
- Hemp composite panels survive 500 miles off-road without failure
- UHMWPE skid plates protect underbody from rock impacts
- Biochar kiln produces usable biochar from local biomass

### Risk Factors
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Flexible solar panels delaminate on rough terrain | Medium | High | Use automotive-grade adhesive; add mechanical fastener backup; test panels on vibration rig first |
| Hemp composite requires proper resin cure for water resistance | Medium | Medium | Do small test layups first; control cure temperature; seal with marine-grade clear coat |
| 3D printer precision affected by vehicle vibration during setup | Low | Low | Use leveling feet with vibration damping; print only when vehicle is stationary and level |
| Agricultural sensor calibration complexity | Medium | Low | Use pre-calibrated sensor modules; document calibration procedure; build self-test routine |
| Deployable solar array wind vulnerability | Medium | Medium | Design fold-flat capability; add guy-wire anchor points; set wind speed abort threshold |
| Bio-resin sourcing and shelf life | Low | Medium | Identify multiple suppliers; order in small batches; store in climate-controlled environment |

### Estimated Timeline
| Task | Month 8 | Month 9 | Month 10 | Month 11 | Month 12 | Month 13 | Month 14 |
|------|---------|---------|----------|----------|----------|----------|----------|
| Solar Integration | ======= | ======= | ======== | | | | |
| Agricultural Systems | | | ======== | ======== | ======== | | |
| Shelter & Field Tools | | | | ======== | ======== | ======== | |
| Body Panel Upgrade | | | | | ======== | ======== | ======== |

---

## Phase 4: Military Hardening (Months 14-20, Budget: $5,000-10,000)

**Objective**: EMP hardening, full MIL-STD-810H design compliance, signature management.

### Milestones

#### 4.1 EMP Hardening (Month 14-16)
- Build Faraday enclosures for all critical electronics (VESC, BMS, Pi, comms)
- Install surge protection devices on all power and data lines
- Add ferrite chokes to entire wiring harness
- Install gas discharge tubes on antenna feeds
- Upgrade to shielded twisted-pair cabling throughout
- Test: EMP simulation testing (portable EMP generator or lab)

**Deliverable**: Full EMP-hardened electronics with documented protection levels

#### 4.2 Environmental Hardening (Month 16-18)
- Type III hard anodize all aluminum components
- Zinc-nickel plate all fasteners
- Upgrade connectors to MIL-SPEC (Amphenol/Deutsch)
- Apply CARC-equivalent powder coat to exterior
- Install IP67+ sealed connectors throughout
- Test: Salt spray (target 500+ hours), vibration testing, water fording

**Deliverable**: Corrosion-protected, waterproofed vehicle

#### 4.3 Satellite Communications (Month 17-19)
- Install Starlink Mini with vehicle mount
- Install Iridium GO! exec as backup
- Install goTenna Pro X2 with ATAK integration
- Add VHF/UHF ham radio (requires license)
- Test: Satellite uplink in various locations, failover between systems

**Deliverable**: Multi-layer communications: mesh + satellite + radio

#### 4.4 Advanced Sovereignty (Month 18-20)
- Third and fourth battery modules (19.2 kWh total)
- Upgrade inverter to 5-10 kW bidirectional
- Add electromagnetic regen suspension (if available/affordable)
- Install RTK GPS for sub-centimeter agriculture mapping
- Full vehicle telemetry dashboard in Grafana
- Comprehensive 48-hour off-grid endurance test

**Deliverable**: Full Tier 3 Sovereign Quad with all systems operational

### Go/No-Go Criteria
- EMP hardening passes basic pulse testing (no electronics damage)
- All electronics survive simulated MIL-STD-810H vibration profile
- Fasteners show no corrosion after 500-hour salt spray equivalent
- Starlink connects within 5 minutes of deployment
- Iridium SOS reaches monitoring center successfully
- Vehicle operates fully off-grid for 48 continuous hours
- V2H exports 5+ kW to household loads
- Total vehicle weight under 1,200 lb

### Risk Factors
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| True MIL-STD-810H testing is prohibitively expensive ($50K-200K per campaign) | High | Medium | Design to standard but test with DIY equivalents; document design compliance vs. tested compliance |
| EMP hardening introduces grounding issues | Medium | High | Hire EMC consultant for grounding plan review; test incrementally (one enclosure at a time) |
| Four battery modules significantly increase weight | High | High | Track weight budget throughout; consider lighter LFP cells; may need suspension upgrade |
| Regen suspension not commercially available yet | High | Medium | Treat as optional stretch goal; conventional suspension is adequate baseline |
| Satellite service costs are ongoing ($50-120/month) | High | Low | Budget for service; Iridium is pay-per-use backup; Starlink can be paused monthly |
| MIL-SPEC connectors have long lead times | Medium | Medium | Order connectors at Phase 3 start; identify backup suppliers; keep standard connectors as fallback |

### Estimated Timeline
| Task | Month 14 | Month 15 | Month 16 | Month 17 | Month 18 | Month 19 | Month 20 |
|------|----------|----------|----------|----------|----------|----------|----------|
| EMP Hardening | ======== | ======== | ======== | | | | |
| Environmental Hardening | | | ======== | ======== | ======== | | |
| Satellite Communications | | | | ======== | ======== | ======== | |
| Advanced Sovereignty | | | | | ======== | ======== | ======== |

---

## Phase 5: Community Replication (Months 20-30, Budget: $5,000-15,000)

**Objective**: Document everything, build kits, run workshops, scale community.

### Milestones

#### 5.1 Documentation Sprint (Month 20-22)
- Complete build guide with photos for every step
- Create CAD files for frame (FreeCAD)
- Create schematics for all electrical systems (KiCad)
- Create 3D-printable component STL files
- Write safety manual
- Create BOM with current pricing and source links
- Publish all documentation under CC-BY-SA 4.0

**Deliverable**: Complete open-source documentation package

#### 5.2 First Kit Production (Month 22-25)
- Design pre-cut frame tube kit (send-cut-send or local fabricator)
- Create wiring harness kits
- Bundle BMS PCB kits
- Create Meshtastic node kits
- Set up web store (or use established platform)
- Price kits at materials + 20% for project sustainability

**Deliverable**: First 10 frame kits and component bundles available for sale

#### 5.3 Workshop Series (Month 24-28)
- Develop 2-day build workshop curriculum
  - Day 1: Frame welding, suspension assembly, powertrain
  - Day 2: Electrical, comms, sovereignty stack, testing
- Run first workshop at partner makerspace (10-20 participants)
- Iterate curriculum based on feedback
- Train additional workshop leaders

**Deliverable**: Repeatable workshop program with trained facilitators

#### 5.4 Community Infrastructure (Month 26-30)
- Launch cooperative governance structure (Loomio for decisions)
- Establish group purchasing program for bulk discounts
- Create regional chapter framework
- Set up time banking system for build labor exchange
- Establish emergency response mutual aid protocol
- Apply for grants (USDA Rural Development, DOE Clean Energy)

**Deliverable**: Functioning cooperative with regional chapters

### Go/No-Go Criteria (for declaring v1.0 release)
- At least 5 vehicles built by different builders (not the original team)
- Build guide enables a skilled maker to build without direct support
- Frame kit arrives ready to weld with no additional cutting
- Workshop participants successfully build functional vehicles
- Cooperative has 50+ active members
- At least one grant application submitted
- Project sustainability plan shows positive cash flow within 12 months

### Risk Factors
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Documentation not detailed enough for independent builders | High | High | Have beta builders attempt guide-only builds; iterate on every point of confusion |
| Kit logistics (shipping heavy frame tubes) expensive | High | Medium | Partner with regional fabricators to cut locally; ship plans instead of steel |
| Workshop venues with welding capability limited | Medium | Medium | Build relationships with makerspaces and trade schools; offer mobile welding setups |
| Cooperative governance slows decision-making | Medium | Low | Use lazy consensus model; define clear decision domains; set response time limits |
| Grant funding competitive and uncertain | High | Medium | Apply to multiple programs; develop earned revenue streams in parallel; don't depend on grants |
| Liability concerns for kit sales and workshops | Medium | High | Form LLC; require signed waivers; carry product liability insurance; consult attorney |

### Estimated Timeline
| Task | Month 20 | Month 21 | Month 22 | Month 23 | Month 24 | Month 25 | Month 26 | Month 27 | Month 28 | Month 29 | Month 30 |
|------|----------|----------|----------|----------|----------|----------|----------|----------|----------|----------|----------|
| Documentation Sprint | ======== | ======== | ======== | | | | | | | | |
| First Kit Production | | | ======== | ======== | ======== | ======== | | | | | |
| Workshop Series | | | | | ======== | ======== | ======== | ======== | ======== | | |
| Community Infrastructure | | | | | | | ======== | ======== | ======== | ======== | ======== |

---

## Summary Timeline

```
Month:  1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18  19  20  21  22  23  24  25  26  27  28  29  30
Phase:  |--- Phase 1: PoC ---|--- Phase 2: Sovereignty ---|------ Phase 3: Regenerative ------|------ Phase 4: Military -----|----- Phase 5: Community Replication -----|
Budget: |---- $5-8K ---------|---- $4-7K -----------------|------ $3-6K -----------------------|------ $5-10K ----------------|---- $5-15K --------------------------------|
```

---

## Total Budget Summary

| Phase | Description | Budget Range | Cumulative |
|-------|-------------|-------------|------------|
| Phase 1 | Proof of Concept | $5,000 - $8,000 | $5,000 - $8,000 |
| Phase 2 | Sovereignty Stack | $4,000 - $7,000 | $9,000 - $15,000 |
| Phase 3 | Regenerative Systems | $3,000 - $6,000 | $12,000 - $21,000 |
| Phase 4 | Military Hardening | $5,000 - $10,000 | $17,000 - $31,000 |
| Phase 5 | Community Replication | $5,000 - $15,000 | $22,000 - $46,000 |

**Note**: Phase 5 costs cover documentation, kit development, and community infrastructure -- not additional vehicles. Individual builder cost for a complete Tier 3 vehicle is estimated at $25,000-$35,000.

---

## Key Dependencies Across Phases

```
Phase 1 (Rolling chassis + motor + battery)
   |
   v
Phase 2 (Comms + sovereignty + water + 2nd battery)
   |
   v
Phase 3 (Solar + agriculture + shelter + body panels)
   |
   v
Phase 4 (EMP hardening + env hardening + satcom + full battery stack)
   |
   v
Phase 5 (Documentation + kits + workshops + cooperative)
```

Each phase builds on the previous. Phase 1 must produce a rideable vehicle before Phase 2 systems can be integrated. Phase 3 solar depends on Phase 2 battery expansion. Phase 4 hardening applies to all electronics installed in Phases 1-3. Phase 5 cannot begin documentation until the vehicle design stabilizes after Phase 4.

---

## Critical Path Items

These items carry the highest schedule risk and should be monitored closely:

1. **Frame fabrication** (Phase 1) -- all other work depends on having a rolling chassis
2. **Battery cell sourcing** (Phase 1, 2, 4) -- LFP prismatic cells have variable lead times
3. **MIL-SPEC connector procurement** (Phase 4) -- long lead times, order early
4. **Hemp composite R&D** (Phase 3) -- resin cure process needs development time
5. **Beta builder recruitment** (Phase 5) -- finding 5+ willing builders takes networking effort

---

## Tools & Platforms

| Category | Tool | Purpose |
|----------|------|---------|
| CAD | FreeCAD | Frame and component design |
| PCB/Electrical | KiCad | Schematic capture and PCB layout |
| Firmware | VESC Tool | Motor controller configuration |
| Firmware | Arduino IDE / PlatformIO | ESP32 telemetry and sensor nodes |
| Monitoring | Grafana + Prometheus | Vehicle telemetry dashboard |
| Mapping | QGIS + OSM | Offline maps and agricultural mapping |
| Comms | Meshtastic | Encrypted mesh networking |
| Situational Awareness | ATAK/CivTAK | Tactical mapping and team tracking |
| Sovereignty | Nextcloud | File sync and collaboration |
| Sovereignty | Vaultwarden | Password management |
| Sovereignty | WireGuard | VPN for secure remote access |
| Documentation | Markdown + Git | Version-controlled build guides |
| Governance | Loomio | Cooperative decision-making |
| 3D Printing | Prusa/Bambu slicer | Field-repair part generation |
