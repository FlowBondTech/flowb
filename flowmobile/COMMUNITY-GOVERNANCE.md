# FlowMobile Sovereign Quad - Community & Governance Framework

## 1. Cooperative Ownership Structure

### Legal Entity
- Multi-stakeholder cooperative (consider LLC with cooperative operating agreement for flexibility)
- Formed under state cooperative law (varies by state; Colorado, Oregon, California, and Wisconsin have strong coop laws)
- Mission statement: "To build, share, and sustain open-source sovereign vehicle technology for community resilience and regenerative land stewardship"

### Stakeholder Classes

#### Builder Members (40% voting weight)
- Qualification: Has built or is actively building a FlowMobile Sovereign Quad
- Membership fee: $500-2,000 (sliding scale based on ability)
- Benefits: Full voting rights, group buy pricing (10-20% discount), workshop discounts, time banking participation, access to tool library
- Obligations: Contribute build documentation, participate in at least one community event per year

#### Developer Members (30% voting weight)
- Qualification: Has contributed significant design, code, documentation, or engineering work
- Membership fee: $100-500 (sliding scale)
- Benefits: Full voting rights, commit access to repositories, design review participation, attribution in documentation
- Obligations: Minimum 40 hours/year of contribution (design, code, docs, testing, review)

#### Community Members (20% voting weight)
- Qualification: Supports the mission, no build or development requirement
- Membership fee: $50-100/year
- Benefits: Voting rights on major decisions, newsletter, event access, forum participation
- Obligations: Annual membership renewal

#### Steward Members (10% voting weight)
- Qualification: Elected by other members, long-term commitment (2-year minimum term)
- Role: Day-to-day operations, treasury management, conflict resolution, external representation
- Compensation: Time banking credits (1.5x rate for stewardship labor)
- Term: 2 years, staggered elections (half the stewards elected each year)
- Maximum: 5-7 steward positions

### Membership Lifecycle
- Application: Submit form with statement of interest and background
- Review: 2-week review period, existing member can sponsor
- Approval: Simple majority of stewards for Community members, builder/developer peers for those classes
- Active status: Maintained by meeting annual obligations
- Inactive: After 12 months of no participation, moved to inactive status (can reactivate)
- Removal: Only by 75% supermajority vote for cause (code of conduct violations)

## 2. Decision-Making Framework

### Decision Types & Processes

#### Tier 1: Day-to-Day Operations
- Who decides: Steward team (any 2 stewards can approve)
- Examples: Purchasing supplies under $500, scheduling events, website updates, social media
- Process: Discussion in Steward Signal group, any 2 agree
- Timeline: Same day
- Documentation: Brief log in shared document

#### Tier 2: Minor Design Changes
- Who decides: Relevant Developer members
- Examples: Component substitutions, firmware updates, documentation corrections, BOM updates
- Process: GitHub Pull Request, 2 developer reviews, 48-hour window for objections
- Timeline: 2-5 days
- Documentation: Git commit history

#### Tier 3: Major Design Changes
- Who decides: All members (weighted vote)
- Examples: Frame geometry changes, new subsystem addition/removal, licensing changes, major specification changes
- Process: Proposal posted on Loomio, 72-hour discussion period, 72-hour voting period
- Threshold: Simple majority (>50% of voting weight)
- Timeline: 1-2 weeks
- Documentation: Loomio decision record

#### Tier 4: Financial Decisions (>$1,000)
- Who decides: All members (weighted vote)
- Examples: Equipment purchases, grant applications, partnership agreements, kit pricing changes
- Process: Steward posts proposal with budget on Loomio, 1-week discussion, 1-week vote
- Threshold: 60% supermajority
- Timeline: 2-3 weeks
- Documentation: Loomio record + financial log

#### Tier 5: Governance Changes
- Who decides: All members (weighted vote)
- Examples: Bylaw amendments, new stakeholder classes, voting weight changes, mission statement changes
- Process: Proposal with 30-day advance notice, in-person or video town hall discussion, Loomio vote
- Threshold: 75% supermajority
- Timeline: 6-8 weeks
- Documentation: Updated governance documents

#### Emergency Decisions
- Who decides: Steward team (3 of 5 must agree)
- Examples: Security vulnerability disclosure, legal threats, safety recalls, time-sensitive opportunities
- Process: Emergency Signal call, 3/5 agreement, post-hoc ratification by members within 2 weeks
- Timeline: Same day
- Documentation: Emergency log + ratification vote record

### Proposal Template
```
## Proposal: [Title]
**Submitted by**: [Name, Member Class]
**Date**: [Date]
**Decision Type**: [Tier 1-5]
**Summary**: [1-2 sentence summary]
**Background**: [Why this is needed]
**Proposal**: [Specific action proposed]
**Budget Impact**: [Cost/revenue impact, if any]
**Alternatives Considered**: [Other options and why this one is preferred]
**Timeline**: [When this would be implemented]
**Discussion Period**: [Start] - [End]
**Vote Period**: [Start] - [End]
```

## 3. Digital Governance Tools

### Loomio (Primary Decision Platform)
- URL: loomio.com
- Use: Proposals, votes, discussions for Tier 3-5 decisions
- Setup: Create "FlowMobile Cooperative" group
- Subgroups: Design, Operations, Finance, Community
- Integrate with email notifications for members without regular internet

### Signal (Real-Time Communication)
- Groups: Stewards (operations), Developers (technical), Builders (build help), General (community)
- Use: Quick coordination, emergency decisions, casual discussion
- Rules: No sensitive financial data in Signal, use Loomio for formal decisions

### GitHub (Code & Design Governance)
- Repository: Main project repo with branch protection
- Pull Request process: 2 reviewer minimum for main branch merges
- Issue tracking: Bug reports, feature requests, design proposals
- Project boards: Sprint planning, roadmap tracking
- Wiki: Technical documentation and guides

### Open Collective (Financial Transparency)
- All income and expenses publicly visible
- Fiscal sponsorship option for receiving grants
- Expense reimbursement workflow
- Monthly financial reports auto-generated

### Nextcloud (Document Management - Self-Hosted)
- Hosted on project infrastructure
- Meeting notes, member records, legal documents
- Shared calendars for events and workshops
- Collaborative document editing

## 4. Time Banking System

### Overview
Time banking values all labor equally at 1 hour = 1 credit (with small bonuses for teaching/mentoring). Credits are redeemable for goods and services within the cooperative network.

### Credit Structure

| Activity | Credits per Hour | Rationale |
|----------|-----------------|-----------|
| Welding / Metal Fabrication | 1.0 | Core build skill |
| Electrical / Wiring | 1.0 | Core build skill |
| Composite Layup | 1.0 | Core build skill |
| CNC / Machining | 1.0 | Core build skill |
| CAD Design / Engineering | 1.0 | Design contribution |
| Software / Firmware Development | 1.0 | Technical contribution |
| Documentation Writing | 1.0 | Knowledge contribution |
| Photography / Video | 1.0 | Documentation support |
| Teaching / Mentoring | 1.2 | Knowledge transfer bonus |
| Workshop Facilitation | 1.2 | Community building bonus |
| Community Organizing | 0.8 | Important but less specialized |
| Administrative / Coordination | 0.8 | Support function |
| Testing / QA | 1.0 | Quality contribution |
| Stewardship Duties | 1.5 | Leadership/responsibility bonus |
| Emergency Response Deployment | 1.5 | Risk/urgency bonus |

### Credit Redemption

| Redeemable For | Credit Cost | Notes |
|----------------|-------------|-------|
| Build labor on your vehicle (from other members) | 1 credit/hour received | Direct labor exchange |
| Components from group buys | Market price in credits | Based on group buy pricing |
| Workshop attendance (as participant) | 50% of ticket price in credits | Discount for members |
| Workshop attendance (free for first-timers) | 0 credits for first workshop | Recruitment incentive |
| Consulting time from experienced builders | 1 credit/hour | Peer consulting |
| Tool library access | 5 credits/month | Shared equipment access |
| Frame jig rental | 10 credits/use | Specialized tooling |
| Makerspace guest pass | 2-5 credits/day | Partner makerspaces |

### Time Banking Software
- **hOurworld** (hourworld.org): Established time banking platform
- **Community Forge** (communityforge.net): Open-source mutual credit software
- **Simple alternative**: Shared spreadsheet on Nextcloud with monthly reconciliation
- Track: Member, date, activity, hours, credits earned/spent, running balance

### Anti-Abuse Measures
- Maximum 20 credits earned per week (prevents monopolization)
- Credits expire after 24 months (encourages circulation)
- Quality review: Recipients rate the work (1-5 stars, below 3 triggers review)
- Dispute resolution: Stewards mediate credit disputes
- Annual audit: Time banking ledger reviewed by membership

## 5. Skill-Sharing Network

### Skill Registry
Each member maintains a skill profile:
```
Member: [Name]
Location: [City, State]
Skills Offered:
  - MIG/TIG Welding (Expert, 10+ years)
  - VESC Configuration (Intermediate, 2 builds)
  - Meshtastic Setup (Beginner, 1 build)
Skills Wanted:
  - Composite Layup (Beginner)
  - CNC Programming (None)
Equipment Available:
  - MIG welder (Lincoln 180)
  - Drill press
  - 3D printer (Ender 3)
Availability: Weekends, 10 hrs/month
```

### Mentorship Program
- New builders paired with experienced builders in their region
- Mentor commits 4-8 hours/month for 3 months
- Mentor earns 1.2x time credits (teaching bonus)
- Structured curriculum: safety first, then frame, powertrain, electrical, comms, sovereignty stack

### Workshop Curriculum

#### Level 1: Introduction (4 hours)
- Project overview and philosophy
- Safety briefing
- Component identification and handling
- VESC Tool walkthrough
- Meshtastic setup and encryption
- Hands-on: Build a Meshtastic node

#### Level 2: Build Weekend (16 hours over 2 days)
Day 1 (8 hours):
- Frame welding techniques (if building from tube stock)
- Frame kit assembly (if using pre-cut kit)
- Suspension installation and alignment
- Steering setup

Day 2 (8 hours):
- Battery module assembly and BMS configuration
- VESC wiring and motor detection
- Throttle mapping and regen braking setup
- Basic body panel installation
- Test ride and debugging

#### Level 3: Sovereignty Integration (8 hours)
- Meshtastic network deployment
- ATAK/CivTAK setup and offline maps
- Raspberry Pi sovereignty stack installation
- Water system plumbing
- Solar panel installation and MPPT configuration
- V2H system testing

#### Level 4: Advanced Systems (8 hours)
- EMP hardening techniques
- Hemp composite panel layup
- Multi-motor AWD configuration
- Agricultural system integration
- Biochar production basics
- Advanced Grafana dashboard setup

## 6. Mutual Aid Integration

### Tool Libraries
- Each regional chapter maintains a shared tool inventory
- High-value tools (TIG welder, vacuum pump, CNC router) shared among 5-10 builders
- Scheduling via shared calendar on Nextcloud
- Maintenance funded by time credits or small cash fund

### Group Purchasing
- Quarterly group buys for common components:
  - LFP cells (10-20% savings at 50+ cell quantities)
  - VESC controllers (bulk discount from official retailers)
  - Solar panels (pallet pricing vs. individual)
  - Meshtastic hardware (100+ units for significant discount)
- Group buy coordinator: Rotates among builder members
- Minimum order aggregation period: 30 days

### Emergency Response Network
- Sovereign Quad owners opt-in to emergency response roster
- Capabilities offered: mobile power (V2H), water purification, mesh communications, shelter
- Activation: Local emergency management request or member distress call
- Insurance: Cooperative carries general liability for organized responses
- Time credits: 1.5x rate for emergency deployment
- Training: Annual emergency response drill (covers vehicle deployment, comms setup, water purification, first aid)

### Land Access Network
- Members offer properties for:
  - Testing and off-road evaluation
  - Biochar production and agricultural demos
  - Camping and field trials
  - Solar array deployment testing
- Reciprocal access agreement (use and leave as found)
- Landowner earns time credits for hosting

### Salvage Network
- Members share leads on:
  - EV battery pack availability (wrecked EVs, decommissioned packs)
  - Military surplus sales and auctions
  - Scrapyard finds (motors, controllers, wheels, frames)
  - Free materials (scrap chromoly, solar panels, electronics)
- Shared database on Nextcloud with location, condition, price, contact

## 7. Regional Chapter Framework

### Chapter Formation
- Minimum 5 members in a geographic area (within ~100 mile radius)
- Chapter submits formation proposal to cooperative (Tier 3 decision)
- Chapter receives:
  - Sub-group on Loomio for local decisions
  - Chapter page on project website
  - Starter tool kit (VESC programmer, multimeter, crimping tools)
  - Workshop curriculum materials

### Chapter Responsibilities
- Host at least 1 build event per quarter
- Maintain shared tool inventory
- Coordinate local group buys
- Represent cooperative at local maker faires and sustainability events
- Submit quarterly report to cooperative (activity, membership, finances)

### Chapter Autonomy
- Chapters make local operational decisions independently
- Financial decisions over $500 require cooperative approval
- Design modifications shared as PRs to main repository
- Chapter can set local time banking rates within +/-20% of standard

### Inter-Chapter Collaboration
- Annual all-chapters gathering (rotating location)
- Shared procurement across chapters for better bulk pricing
- Knowledge sharing via video calls (monthly all-chapters call)
- Builder exchange program (visit other chapters to learn/teach)

## 8. Code of Conduct

### Core Values
1. **Respect**: Treat all members with dignity regardless of skill level, background, or identity
2. **Transparency**: Share knowledge, decisions, and finances openly
3. **Safety**: Physical safety is paramount in all build activities
4. **Sovereignty**: Respect individual autonomy and data sovereignty
5. **Regeneration**: Leave people, communities, and land better than we found them

### Expected Behavior
- Share knowledge freely and help others learn
- Give constructive feedback on designs and builds
- Respect safety protocols in shops and at events
- Honor time banking commitments
- Contribute to documentation and knowledge base
- Respect confidentiality of member information

### Unacceptable Behavior
- Harassment, discrimination, or bullying
- Unsafe shop practices that endanger others
- Misrepresentation of build quality or safety
- Time banking fraud (claiming credits for work not done)
- Sharing member personal information without consent
- Using cooperative resources for personal commercial gain without approval

### Enforcement
1. **Informal resolution**: Direct conversation between parties (encouraged as first step)
2. **Mediation**: Steward-facilitated discussion
3. **Formal complaint**: Written complaint to steward team, investigated within 2 weeks
4. **Consequences**: Warning, temporary suspension, permanent removal (escalating)
5. **Appeal**: Member can appeal to full membership vote (Tier 4 decision)

## 9. Intellectual Property & Licensing

### Open Source Commitment
- All original designs: CERN-OHL-S v2 (Strong Reciprocal hardware license)
- All original software: GPL v3
- All documentation: CC-BY-SA 4.0
- BOM and sourcing data: CC0 (Public Domain)

### Contributor License Agreement
- All contributors agree that their contributions are licensed under project terms
- No individual or corporate contributor can revoke the open-source license
- Contributors retain copyright but grant perpetual license to the cooperative

### Trademark
- "FlowMobile Sovereign Quad" name may be trademarked
- Purpose: Quality assurance (only certified builds can use the name)
- Certification: Vehicle passes safety checklist reviewed by 2 Builder Members
- Free to use for any open-source derivative that passes certification
- Cannot be used for closed-source derivatives

## 10. Sustainability & Evolution

### Annual Review
- Annual governance review at all-chapters gathering
- Review and update: bylaws, time banking rates, membership fees, decision processes
- Membership satisfaction survey
- Financial audit (external if revenue exceeds $100K)

### Scaling Considerations
- At 100+ members: Consider hiring part-time coordinator (funded by membership fees)
- At 500+ members: Consider formal nonprofit status (501(c)(3) or 501(c)(12))
- At 1,000+ members: Consider regional cooperative federations
- Technology infrastructure scales with Nextcloud/Loomio (self-hosted, no per-user fees)

### Exit Strategy (if project winds down)
- All designs remain open source in perpetuity (license cannot be revoked)
- Physical assets distributed to active chapters
- Financial reserves distributed to members proportional to time credits
- Code and documentation archived on Internet Archive and GitHub
- Knowledge base preserved for future builders
