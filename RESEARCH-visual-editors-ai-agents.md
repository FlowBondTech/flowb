# Research Report: Open-Source Visual Editors for AI Agent-Controlled Website Editing

**Date:** 2026-03-15
**Context:** Medusa.js (backend commerce) + Visual Editor (frontend) + OpenClaw (AI agent orchestration)
**Objective:** Identify the best open-source visual editor that an AI agent can programmatically control to modify website elements (text, images, layout, components) without human interaction.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Evaluation Framework](#evaluation-framework)
3. [Detailed Tool Analysis](#detailed-tool-analysis)
4. [Comparison Matrix](#comparison-matrix)
5. [AI Agent Integration Patterns](#ai-agent-integration-patterns)
6. [Medusa.js Compatibility Analysis](#medusajs-compatibility-analysis)
7. [OpenClaw Integration Architecture](#openclaw-integration-architecture)
8. [Emerging Standards and Patterns](#emerging-standards-and-patterns)
9. [Recommended Stack](#recommended-stack)
10. [Implementation Roadmap](#implementation-roadmap)

---

## 1. Executive Summary

After evaluating 10 visual editors/page builders and the broader 2025-2026 landscape of agentic web editing, the recommended stack is:

**Primary Recommendation: Puck + Medusa.js + OpenClaw**

- **Puck** is the clear winner for AI-agent-controlled visual editing. It is the only tool with a purpose-built headless AI generation API (`generate()`) that accepts natural language prompts and returns structured JSON page data -- exactly what an AI agent needs. MIT licensed, React-native, 12.3k GitHub stars, and actively maintained with AI as a first-class feature.

- **GrapesJS** is the strongest alternative for scenarios requiring framework-agnostic HTML/CSS editing (not just React). It has a comprehensive programmatic API, headless mode, BSD-3 license, 25.6k stars, and the most mature plugin ecosystem. However, it lacks a purpose-built AI generation layer.

- **Payload CMS** is the recommended content management layer to complement either editor when you need structured content types, authentication, and admin UI alongside visual editing.

**Key Insight:** The landscape has bifurcated into two categories: (1) visual editors with emerging AI-native APIs (Puck leads), and (2) traditional page builders that can be controlled programmatically but require custom glue code for AI agents (GrapesJS, Craft.js). For an OpenClaw skill that needs to modify pages without human interaction, the former category is significantly more viable.

---

## 2. Evaluation Framework

Each tool is scored on these criteria (1-5 scale):

| Criterion | Weight | Description |
|-----------|--------|-------------|
| **Programmatic API** | 25% | Can an AI agent control it without UI? JSON in/out? |
| **AI-Native Features** | 20% | Built-in AI generation, headless generation, prompt-based editing |
| **Open Source Quality** | 15% | License type, true OSS, no vendor lock-in |
| **Medusa.js Compatibility** | 15% | Integration with headless commerce, React/Next.js ecosystem |
| **Self-Hostable** | 10% | Can be fully deployed on own infrastructure |
| **Community & Maintenance** | 10% | GitHub stars, update frequency, ecosystem |
| **Technical Flexibility** | 5% | Framework support, extensibility, plugin system |

---

## 3. Detailed Tool Analysis

### 3.1 Puck (by Measured)

**Category:** React Visual Editor with AI-Native Generation
**License:** MIT
**GitHub Stars:** 12.3k
**Tech Stack:** React, TypeScript
**Last Updated:** January 2026 (v0.21.1)
**Self-Hostable:** Yes (fully)

**What It Is:**
Puck is a modular, open-source visual editor for React that outputs page data as JSON. Starting with v0.21, it includes Puck AI -- a cloud-based (but self-hostable) AI generation layer that is purpose-built for programmatic page creation and modification.

**Programmatic API (Critical for AI Agents):**

Puck provides the `generate()` function from `@puckeditor/cloud-client`:

```javascript
import { generate } from "@puckeditor/cloud-client";

// Create a new page from a prompt
const page = await generate({
  prompt: "Create a product landing page for organic honey",
  config: {
    components: {
      HeroBlock: {
        fields: { title: { type: "text" }, subtitle: { type: "text" } },
        render: ({ title, subtitle }) => <Hero title={title} subtitle={subtitle} />,
      },
      ProductGrid: {
        fields: { columns: { type: "number" } },
        render: ({ columns }) => <Grid cols={columns} />,
      },
    },
  },
  context: "E-commerce storefront for artisan food products. Warm, organic aesthetic.",
  tools: {
    getProducts: tool({
      description: "Fetch products from Medusa.js",
      inputSchema: z.object({ category: z.string().optional() }),
      execute: async ({ category }) => {
        // Call Medusa.js API
        return await medusa.products.list({ category_id: category });
      },
    }),
  },
});

// Modify an existing page
const updated = await generate({
  prompt: "Change the hero title to 'Spring Sale - 20% Off' and add a countdown timer",
  config: { /* same config */ },
  pageData: existingPage, // Pass current page JSON
});
```

**Key Puck AI Features:**
- `generate()` -- headless, stateless page generation from natural language
- `pageData` parameter -- modify existing pages by passing current state + instructions
- `tools` -- let the AI agent call external APIs (Medusa.js products, inventory, etc.)
- `context` -- business context that guides tone, brand, and constraints
- `ai` config on components -- fine-tune how AI treats each component
- `onFinish` callback -- track token usage and cost
- `host` parameter -- point to self-hosted Puck Cloud instance

**Strengths:**
- Only editor with a purpose-built AI generation API
- JSON in, JSON out -- perfect for programmatic control
- Tools integration lets the agent query Medusa.js during generation
- Component-level AI configuration for predictable output
- MIT license, no vendor lock-in
- Works with any React environment (Next.js, Remix, etc.)
- The `<Render>` component renders pages from JSON data without the editor

**Weaknesses:**
- Puck AI cloud service has a cost per generation (though self-hostable)
- AI features are in beta (as of March 2026)
- React-only -- no Vue/Angular/vanilla JS support
- Smaller community than GrapesJS (12.3k vs 25.6k stars)
- Less mature plugin ecosystem compared to GrapesJS

**Programmatic API Score: 5/5** -- This is exactly what AI agent control requires
**AI-Native Score: 5/5** -- Purpose-built for this use case

---

### 3.2 GrapesJS

**Category:** Framework-Agnostic Web Builder Framework
**License:** BSD-3-Clause
**GitHub Stars:** 25.6k
**Tech Stack:** TypeScript (vanilla JS core, React/Vue wrappers available)
**Last Updated:** Active (v0.22.14)
**Self-Hostable:** Yes (fully)

**What It Is:**
GrapesJS is the most established open-source web builder framework. It works with raw HTML/CSS, has a comprehensive programmatic API, and a large plugin ecosystem. It does not have native AI features but its API is rich enough to be controlled by an AI agent via custom integration.

**Programmatic API:**

```javascript
// Initialize headless editor (no UI required)
const editor = grapesjs.init({ headless: true });

// Load page data from JSON
editor.loadProjectData(savedProjectJson);

// Add a component programmatically
editor.addComponents('<div class="hero"><h1>Spring Sale</h1></div>');
editor.addComponents({
  type: 'text',
  classes: ['hero-title'],
  content: 'New Product Launch'
});

// Modify existing component properties
const selected = editor.getWrapper().find('.hero-title')[0];
selected.set('content', 'Updated Title');
selected.addStyle({ color: '#ff0000', fontSize: '32px' });

// Get full project as JSON (store this)
const projectData = editor.getProjectData();

// Export clean HTML/CSS
const html = editor.getHtml();
const css = editor.getCss();

// Replace all components
editor.setComponents('<div>Completely new page</div>');

// Manage styles
editor.addStyle('.new-class { padding: 20px; }');
```

**Key GrapesJS API Methods for AI Agent Control:**
- `editor.getProjectData()` / `editor.loadProjectData(json)` -- serialize/restore full state
- `editor.addComponents(html|object)` -- add elements
- `editor.setComponents(html|object)` -- replace all content
- `editor.getHtml()` / `editor.getCss()` / `editor.getJs()` -- export clean output
- `editor.getWrapper().find(selector)` -- query components by CSS selector
- `component.set(props)` / `component.addStyle(css)` -- modify individual elements
- `editor.store()` / `editor.load()` -- persist to any storage backend
- Headless mode: `grapesjs.init({ headless: true })` -- no DOM required (with jsdom)

**Strengths:**
- Most comprehensive programmatic API of any editor
- Framework-agnostic (works with any frontend, not just React)
- Headless mode for server-side operations
- Mature plugin ecosystem (newsletter, webpage, mjml presets)
- JSON project data format is well-documented and stable
- @grapesjs/react wrapper for React/Next.js integration (v2 supports React 19)
- Largest community (25.6k stars, 8+ years of development)
- Data sources API for connecting to external data

**Weaknesses:**
- No built-in AI generation -- requires custom LLM integration
- Headless mode still needs jsdom for server-side (DOM dependencies)
- Works with raw HTML/CSS, not React components (different paradigm than Puck)
- More complex to integrate with component-based React storefronts
- The AI agent would need to generate HTML strings or GrapesJS JSON, not React component trees
- GrapesJS Studio SDK (enhanced commercial version) has separate licensing

**Programmatic API Score: 4/5** -- Excellent API but requires custom AI glue
**AI-Native Score: 2/5** -- No built-in AI features

---

### 3.3 Craft.js

**Category:** React Page Editor Framework
**License:** MIT
**GitHub Stars:** 8.6k
**Tech Stack:** React, TypeScript
**Last Updated:** Sporadic (community discussions active Dec 2025)
**Self-Hostable:** Yes (fully, it is a library)

**What It Is:**
Craft.js is a React framework for building custom drag-and-drop page editors. Like Puck, it uses your own React components. Unlike Puck, it provides no pre-built editor UI -- you build everything yourself. It has a programmatic API through React hooks.

**Programmatic API:**

```javascript
// Serialize editor state to JSON
const json = query.serialize();

// Deserialize from JSON (restore state)
actions.deserialize(json);

// Add a new node programmatically
const node = query.createNode(React.createElement(Text, { text: "Hello" }));
actions.add(node, "ROOT");

// Modify component props
actions.setProp("node-id", (props) => {
  props.text = "Updated text";
  props.color = "#ff0000";
});
```

**Strengths:**
- JSON serialization/deserialization for state management
- Hook-based API (`useEditor`, `useNode`) for programmatic control
- MIT license, fully open source
- React-native, works with custom components
- Lightweight framework approach

**Weaknesses:**
- No AI features whatsoever
- Requires building everything from scratch (no pre-built UI)
- Limited maintenance activity in 2025-2026
- Smaller community than Puck or GrapesJS
- Hook-based API requires React rendering context (harder for headless/server-side use)
- No headless mode -- designed to run inside a React app

**Programmatic API Score: 3/5** -- Good hooks API but React-context-dependent
**AI-Native Score: 1/5** -- No AI features

---

### 3.4 Webstudio

**Category:** Open-Source Webflow Alternative
**License:** AGPL-3.0
**GitHub Stars:** ~5.4k (main repo)
**Tech Stack:** TypeScript, React, Remix
**Last Updated:** Active development
**Self-Hostable:** Yes

**What It Is:**
Webstudio is an advanced visual builder positioned as an open-source Webflow alternative. It supports all CSS properties, connects to headless CMS platforms, and can be hosted anywhere.

**Programmatic API:**
Webstudio does not expose a documented REST API or headless generation mode for programmatic page building. It is primarily a visual tool designed for human users. Programmatic control would require directly manipulating its internal data structures.

**Strengths:**
- Full CSS property support (most complete visual design tool)
- Connects to any headless CMS via HTTP APIs
- AGPL ensures the code stays open
- Growing community

**Weaknesses:**
- AGPL license is restrictive for commercial SaaS use
- No documented programmatic API for AI agent control
- No AI features
- Smaller community than top contenders
- Experimental status noted in some reviews
- Not designed for headless/programmatic use

**Programmatic API Score: 1/5** -- No programmatic API
**AI-Native Score: 1/5** -- No AI features

---

### 3.5 Builder.io

**Category:** Visual AI IDE / CMS Platform
**License:** Proprietary platform (Mitosis compiler is MIT open source)
**GitHub Stars:** N/A for platform (Mitosis: ~12k)
**Tech Stack:** Multi-framework (React, Vue, Angular, Svelte via Mitosis)
**Self-Hostable:** No (cloud platform)

**What It Is:**
Builder.io is a commercial visual development platform with AI features (Visual Copilot, Fusion). Its open-source component is Mitosis, a compiler that converts JSX to multiple frameworks. The visual editor itself is proprietary and cloud-hosted.

**Programmatic API:**
Builder.io has REST APIs and SDKs for managing content programmatically. There is a documented integration guide for Builder.io + MedusaJS storefronts.

**Strengths:**
- Most polished AI features (Visual Copilot, Fusion)
- Official SDKs for all major frameworks
- Documented Medusa.js integration
- Strong enterprise backing ($37.2M funding, Gartner recognition)
- Multi-framework support via Mitosis

**Weaknesses:**
- NOT truly open source -- the visual editor is proprietary SaaS
- Cannot be self-hosted
- Vendor lock-in to Builder.io cloud
- Mitosis (OSS part) is a compiler, not a visual editor
- Pricing can be prohibitive for indie/startup use

**Programmatic API Score: 3/5** -- Good REST API but tied to proprietary platform
**AI-Native Score: 4/5** -- Strong AI features, but proprietary

---

### 3.6 Plasmic

**Category:** Visual Builder for React
**License:** MIT (SDKs/code components), Proprietary (Studio editor)
**GitHub Stars:** ~6.7k
**Tech Stack:** React, TypeScript
**Self-Hostable:** Partially (generated code yes, Studio editor with limitations)

**What It Is:**
Plasmic is a visual builder that lets you drag-and-drop React components and create UIs that integrate with your codebase. It has codegen capabilities and integrates with many data sources including Saleor and Shopify (but not Medusa.js directly).

**Programmatic API:**
Plasmic offers a REST API for managing projects and content. The codegen pipeline can be automated. However, the visual editor (Plasmic Studio) is primarily a cloud service with limited self-hosting.

**Strengths:**
- Strong React integration -- uses your actual components
- Codegen pipeline for automation
- Integrations with headless commerce (Saleor, Shopify, commercetools)
- Free tier available

**Weaknesses:**
- Studio editor is proprietary / cloud-dependent
- Self-hosting has documented limitations
- No native AI generation features
- No direct Medusa.js integration
- Mixed open-source story (SDKs open, core editor closed)

**Programmatic API Score: 2/5** -- API exists but editor is cloud-locked
**AI-Native Score: 1/5** -- No AI features

---

### 3.7 Payload CMS

**Category:** Headless CMS / Application Framework
**License:** MIT
**GitHub Stars:** 41.2k
**Tech Stack:** TypeScript, Next.js, React
**Self-Hostable:** Yes (fully)

**What It Is:**
Payload is a Next.js-native headless CMS that provides structured content management, authentication, access control, and live preview. It is NOT a visual page builder per se, but it provides block-based layout builders and live preview that complement a visual editor.

**Programmatic API:**

```javascript
// Payload Local API (server-side, no network call)
const page = await payload.find({
  collection: 'pages',
  where: { slug: { equals: 'homepage' } },
});

// Update page content programmatically
await payload.update({
  collection: 'pages',
  id: pageId,
  data: {
    title: 'Updated Homepage',
    layout: [
      { blockType: 'hero', heading: 'Spring Sale', subheading: '20% off everything' },
      { blockType: 'productGrid', category: 'featured' },
    ],
  },
});

// REST API also available
// PATCH /api/pages/{id}
```

**Strengths:**
- Extremely powerful Local API for server-side programmatic content manipulation
- Block-based layouts can be modified via API
- MIT license, fully self-hostable
- Massive community (41.2k stars)
- Next.js native -- installs in your /app folder
- TypeScript with automatic type generation
- Built-in auth, access control, versions, drafts
- Live preview for visual validation
- Community visual editor plugin exists

**Weaknesses:**
- Not a visual page builder -- it is a CMS with structured content
- Visual editing is live-preview (side-by-side), not true drag-and-drop
- The community visual editor plugin (284 stars) is separate
- Overkill if you only need page editing (it is a full application framework)
- AI features are limited to the content editing experience

**Programmatic API Score: 5/5** -- Outstanding Local API and REST API
**AI-Native Score: 2/5** -- Limited AI, but API excellence compensates

**Assessment:** Payload is best used as a complementary CMS layer alongside a visual editor like Puck, not as a replacement for one.

---

### 3.8 Strapi

**Category:** Headless CMS
**License:** MIT (Community), Enterprise license available
**GitHub Stars:** 71.6k
**Tech Stack:** Node.js, TypeScript, React (admin)
**Self-Hostable:** Yes (fully)

**What It Is:**
Strapi is the most popular open-source headless CMS. It provides a content management interface, REST/GraphQL APIs, and has a page builder plugin. It recently added AI-powered content type generation.

**Programmatic API:**

```javascript
// REST API
const response = await fetch('/api/pages?filters[slug][$eq]=homepage');
const page = await response.json();

// Update content
await fetch(`/api/pages/${pageId}`, {
  method: 'PUT',
  body: JSON.stringify({ data: { title: 'New Title', layout: [...] } }),
});

// GraphQL also available
```

**Strengths:**
- Largest CMS community (71.6k stars)
- Flexible content types with Dynamic Zones (composable layouts)
- Page Builder plugin available on Strapi Market
- AI Content-Type Builder (generate schemas from natural language)
- Documented Medusa.js integration (official blog post)
- REST and GraphQL APIs
- Massive plugin ecosystem

**Weaknesses:**
- Not a visual page builder -- CMS with page building plugins
- Page Builder plugin is third-party, not core
- Visual editing is not as refined as dedicated builders
- AI features limited to content type generation, not page generation
- Heavy runtime for what might be needed

**Programmatic API Score: 4/5** -- Excellent REST/GraphQL API
**AI-Native Score: 2/5** -- AI limited to schema generation

**Assessment:** Like Payload, Strapi is a CMS, not a visual editor. It could serve as the content backend alongside a visual editor.

---

### 3.9 Tina CMS

**Category:** Git-Backed Visual CMS
**License:** Apache-2.0
**GitHub Stars:** 13.2k
**Tech Stack:** React, TypeScript, GraphQL
**Self-Hostable:** Yes (Tina Data Layer can be self-hosted)

**What It Is:**
TinaCMS stores content as Markdown/MDX/JSON files in Git. It provides in-context visual editing where changes are committed to a Git repository. It has a GraphQL API for querying content.

**Programmatic API:**

```graphql
# GraphQL API for content queries
query {
  page(relativePath: "homepage.md") {
    title
    body
    blocks {
      ... on PageBlocksHero {
        heading
        subheading
      }
    }
  }
}
```

Content is modified by updating Markdown/JSON files in Git, which can be done programmatically via Git operations or TinaCloud's API.

**Strengths:**
- Git-backed means full version history and rollback
- Visual editing with real-time preview
- GraphQL API for content access
- Open source (Apache-2.0)
- Self-hostable data layer

**Weaknesses:**
- Git-based model is limiting for real-time AI agent modifications
- Not a page builder -- editing is field-level, not drag-and-drop layout editing
- Markdown/MDX focus limits layout flexibility
- AI agent would need to create/modify Markdown files and commit to Git
- Higher latency than direct database updates (Git commit cycle)
- More suited for blog/documentation sites than e-commerce storefronts

**Programmatic API Score: 2/5** -- GraphQL queries are good, but mutation model (Git commits) is awkward for AI
**AI-Native Score: 1/5** -- No AI features

---

### 3.10 Unlayer

**Category:** Embeddable Email/Page Editor
**License:** Proprietary (React wrapper is MIT, core editor is commercial)
**GitHub Stars:** ~4.3k (react-email-editor wrapper)
**Tech Stack:** React, vanilla JS
**Self-Hostable:** No (editor loaded from Unlayer CDN)

**What It Is:**
Unlayer is primarily an email template editor with a React component wrapper. It is NOT truly open source -- the React wrapper is MIT but the actual editor is a proprietary library loaded from Unlayer's servers.

**Programmatic API:**
- `editor.loadDesign(json)` -- load a design
- `editor.saveDesign(callback)` -- save design as JSON
- `editor.exportHtml(callback)` -- export HTML
- Lifecycle hooks: `onLoad`, `onDesignUpdated`, `onExport`

**Strengths:**
- Clean API for loading/saving designs
- Good email template editing
- React component integration

**Weaknesses:**
- NOT open source (core editor is proprietary)
- Cannot be self-hosted (loads from CDN)
- Primarily designed for email templates, not web pages
- Limited layout capabilities compared to page builders
- Commercial pricing for production use
- Email-focused, not suitable for e-commerce storefronts

**Programmatic API Score: 3/5** -- Simple but effective API
**AI-Native Score: 1/5** -- No AI features

---

## 4. Comparison Matrix

| Tool | License | Stars | Programmatic API | AI-Native | Medusa Compat | Self-Host | React | Headless Mode | **Overall Score** |
|------|---------|-------|-----------------|-----------|---------------|-----------|-------|---------------|-------------------|
| **Puck** | MIT | 12.3k | 5 - generate() API | 5 - Purpose-built | 4 - React/Next.js | 5 - Full | Yes | 5 - Native | **4.7/5** |
| **GrapesJS** | BSD-3 | 25.6k | 4 - Comprehensive | 2 - None built-in | 3 - Needs wrapper | 5 - Full | Wrapper | 4 - With jsdom | **3.6/5** |
| **Payload CMS** | MIT | 41.2k | 5 - Local API | 2 - Limited | 4 - Next.js native | 5 - Full | Yes | 5 - Server-side | **3.8/5** (as CMS) |
| **Strapi** | MIT | 71.6k | 4 - REST/GraphQL | 2 - Schema gen only | 4 - Documented | 5 - Full | Admin only | 5 - API-first | **3.6/5** (as CMS) |
| **Craft.js** | MIT | 8.6k | 3 - Hooks-based | 1 - None | 3 - React | 5 - Full | Yes | 1 - No | **2.7/5** |
| **Tina CMS** | Apache-2 | 13.2k | 2 - Git-based | 1 - None | 2 - Git model | 4 - Partial | Yes | 3 - GraphQL | **2.3/5** |
| **Builder.io** | Proprietary | N/A | 3 - REST API | 4 - Strong | 4 - Documented | 1 - No | Yes | 3 - API | **2.8/5** |
| **Plasmic** | Mixed | 6.7k | 2 - Cloud-locked | 1 - None | 2 - No direct | 2 - Limited | Yes | 2 - Limited | **2.1/5** |
| **Webstudio** | AGPL-3 | 5.4k | 1 - None | 1 - None | 2 - Headless CMS | 4 - AGPL | Yes | 1 - No | **1.8/5** |
| **Unlayer** | Proprietary | 4.3k | 3 - Load/save | 1 - None | 1 - Email focus | 1 - No | Yes | 2 - Limited | **1.7/5** |

**Scoring Methodology:**
- Overall = (Programmatic API * 0.25) + (AI-Native * 0.20) + (License/OSS * 0.15) + (Medusa Compat * 0.15) + (Self-Host * 0.10) + (Community * 0.10) + (Flexibility * 0.05)

---

## 5. AI Agent Integration Patterns

### Pattern A: AI-Native Generation (Puck)

This is the ideal pattern. The AI agent directly calls a generation API:

```
OpenClaw Agent
    |
    | "Update the homepage hero to promote spring sale"
    v
OpenClaw Skill (flowb-storefront)
    |
    | generate({ prompt: "...", config: puckConfig, pageData: current, tools: { getProducts } })
    v
Puck AI generate()
    |
    | Returns structured JSON page data
    v
Store in DB / Render via <Render> component
    |
    v
Live Website Updated
```

**How it works:**
1. User tells OpenClaw agent "Update the homepage to feature our spring collection"
2. OpenClaw activates the `flowb-storefront` skill
3. Skill calls `generate()` with the prompt, current page data, and Medusa.js tools
4. Puck AI generates updated page JSON using the defined component set
5. JSON is stored (Supabase, Medusa custom table, etc.)
6. Next.js storefront renders the updated page via `<Render config={config} data={pageData} />`

**Advantages:**
- Natural language in, structured JSON out
- AI understands the component vocabulary via config
- Tools parameter lets AI query Medusa.js for real product data
- Business context ensures brand consistency
- Existing page data enables incremental modifications

### Pattern B: Programmatic API Control (GrapesJS)

The AI agent generates HTML/CSS and uses the editor API:

```
OpenClaw Agent
    |
    | "Add a testimonials section below the hero"
    v
OpenClaw Skill (flowb-storefront)
    |
    | LLM generates HTML/CSS for the section
    v
GrapesJS Headless API
    |
    | editor.loadProjectData(current)
    | editor.addComponents(generatedHtml)
    | editor.getProjectData() -> save
    v
Store JSON / Export HTML+CSS
    |
    v
Live Website Updated
```

**How it works:**
1. OpenClaw skill receives the editing instruction
2. Skill uses an LLM (via OpenClaw's configured model) to generate HTML/CSS
3. Skill initializes GrapesJS in headless mode, loads current page
4. Skill adds/modifies components using GrapesJS API
5. Updated project data is saved, HTML/CSS exported for rendering

**Advantages:**
- Framework-agnostic output (plain HTML/CSS)
- More control over the editing operations
- No dependency on external AI service

**Disadvantages:**
- Requires custom LLM integration for HTML generation
- HTML generation is less predictable than component-based generation
- Headless mode needs jsdom (Node.js dependency)
- More moving parts and potential failure modes

### Pattern C: CMS API Manipulation (Payload/Strapi)

The AI agent modifies structured content via CMS API:

```
OpenClaw Agent
    |
    | "Change the hero headline and add a sale banner"
    v
OpenClaw Skill (flowb-cms)
    |
    | payload.update({ collection: 'pages', data: { layout: [...] } })
    v
Payload/Strapi API
    |
    | Content updated in database
    v
Frontend re-renders from API data
    |
    v
Live Website Updated
```

**This pattern is limited to structured content changes** -- it cannot handle free-form layout editing, drag-and-drop repositioning, or visual design changes. It is best for text/image content updates within existing layouts.

---

## 6. Medusa.js Compatibility Analysis

### Medusa.js Architecture Overview

Medusa.js 2.0 is a headless commerce engine with:
- REST and GraphQL APIs for products, orders, carts, customers
- Modular architecture with independent modules
- Next.js starter storefront (App Router, React 18+)
- Plugin/extension system
- No built-in page builder or visual editor

### Integration Points

The visual editor needs to work alongside Medusa in these ways:

1. **Product Data:** The editor's AI agent needs to query Medusa for products, categories, prices, inventory to populate page content.

2. **Storefront Layer:** The editor output needs to render in the same Next.js storefront that handles Medusa commerce flows (cart, checkout, account).

3. **Page Storage:** Page layouts/content need persistent storage. Options:
   - Medusa custom entity (via module extension)
   - Supabase/PostgreSQL alongside Medusa
   - File-based (for static export)

4. **Dynamic Commerce Components:** Product grids, cart buttons, price displays need to pull live data from Medusa APIs while being editable in terms of layout/presentation.

### Compatibility Ratings

| Editor | Medusa Integration Effort | Notes |
|--------|--------------------------|-------|
| **Puck** | Low | Same React/Next.js ecosystem. Puck components can wrap Medusa data fetching. Tools parameter lets AI query Medusa during generation. Store page JSON in Supabase or Medusa custom table. |
| **GrapesJS** | Medium | Need @grapesjs/react wrapper. Output is HTML, not React components. Commerce components need custom GrapesJS blocks that map to React rendering. |
| **Payload CMS** | Low-Medium | Both are Next.js native. Payload can store page layouts. But adds significant overhead as a separate application framework. |
| **Strapi** | Medium | Documented integration exists. Strapi manages content, Medusa manages commerce. But two separate backends to maintain. |
| **Builder.io** | Low | Documented integration guide exists on Builder.io forum. But proprietary and cloud-locked. |

---

## 7. OpenClaw Integration Architecture

### Current OpenClaw Setup in FlowB

Based on the existing codebase at `/home/koh/Documents/flowb/infra/openclaw/` and `/home/koh/Documents/flowb/src/openclaw.ts`:

- OpenClaw is configured with skills in `openclaw.json`
- The `flowb-biz` skill already manages products, blog, SEO, and Stripe via shell scripts calling the FlowB API
- Tools are registered via `api.registerTool()` with input schemas and execute functions
- The agent uses Claude Sonnet 4.5 with max 10 turns

### Proposed: `flowb-storefront` Skill

A new OpenClaw skill for AI-controlled storefront editing:

```markdown
# skills/flowb-storefront/SKILL.md
---
name: flowb-storefront
description: Visually edit and manage FlowB storefront pages using AI
env:
  - PUCK_API_KEY
  - MEDUSA_API_URL
  - MEDUSA_API_KEY
  - SUPABASE_URL
  - SUPABASE_KEY
---

# FlowB Storefront Editor

You manage the visual appearance of FlowB e-commerce storefronts.
You can create, edit, and publish pages using AI-powered visual editing.

## Capabilities

### Page Management
- Create new pages (landing pages, product pages, about pages)
- Edit existing pages (modify text, images, layout, components)
- Preview pages before publishing
- Publish pages to the live storefront

### Component Operations
- Add hero sections, product grids, testimonials, CTAs
- Modify component text, images, and styling
- Reorder page sections
- Remove components

### Data Integration
- Pull product data from Medusa.js to populate pages
- Use real product images, prices, and descriptions
- Create dynamic product listing pages
- Generate promotional pages from inventory data

## How to Use

### Edit a page
```bash
bash scripts/edit-page.sh "homepage" "Change the hero title to Spring Sale"
```

### Create a page
```bash
bash scripts/create-page.sh "spring-sale" "Create a spring sale landing page featuring our top 5 products"
```

### List pages
```bash
bash scripts/list-pages.sh
```
```

### OpenClaw Tool Registration

Extending the existing `openclaw.ts` pattern:

```typescript
// New tool: flowb_storefront
api.registerTool({
  name: "flowb_storefront",
  description: "Edit storefront pages. Create, modify, or publish e-commerce pages using AI visual editing.",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["create", "edit", "list", "publish", "preview"],
        description: "Storefront action to perform",
      },
      page_slug: { type: "string", description: "Page identifier (e.g. 'homepage', 'spring-sale')" },
      prompt: { type: "string", description: "Natural language description of changes" },
      user_id: { type: "string", description: "User identifier" },
    },
    required: ["action"],
  },
  async execute(input: any): Promise<string> {
    switch (input.action) {
      case "edit":
        return editPage(input.page_slug, input.prompt);
      case "create":
        return createPage(input.page_slug, input.prompt);
      case "list":
        return listPages();
      case "publish":
        return publishPage(input.page_slug);
      default:
        return `Unknown action: ${input.action}`;
    }
  },
});
```

### MCP Integration

OpenClaw natively supports MCP servers (65% of active skills wrap MCP servers). The visual editor integration could leverage:

1. **Direct Skill:** A `flowb-storefront` SKILL.md that teaches the agent to call Puck's generate() API via HTTP
2. **MCP Server:** A custom MCP server that wraps Puck's generate() function, exposing it as MCP tools
3. **Hybrid:** Skill for orchestration + MCP server for the actual API calls

The MCP approach is preferable because:
- MCP servers can expose structured tool definitions
- Other AI agents (not just OpenClaw) can use the same MCP server
- MCP Apps can render previews directly in the conversation
- The MCP ecosystem is mature (3,200+ skills on ClawHub, formal governance)

### Proposed MCP Server: `mcp-puck-editor`

```typescript
// MCP server exposing Puck generation as tools
const server = new McpServer({
  name: "puck-editor",
  version: "1.0.0",
});

server.tool("generate_page", {
  description: "Generate or update a storefront page using AI",
  inputSchema: z.object({
    prompt: z.string().describe("Natural language editing instruction"),
    pageSlug: z.string().describe("Page identifier"),
    existingData: z.any().optional().describe("Current page JSON data"),
  }),
  execute: async ({ prompt, pageSlug, existingData }) => {
    const result = await generate({
      prompt,
      config: storefrontConfig,
      pageData: existingData,
      context: businessContext,
      tools: medusaTools,
    });
    await savePage(pageSlug, result);
    return { content: [{ type: "text", text: `Page '${pageSlug}' updated successfully.` }] };
  },
});

server.tool("list_pages", { /* ... */ });
server.tool("get_page", { /* ... */ });
server.tool("publish_page", { /* ... */ });
```

---

## 8. Emerging Standards and Patterns

### Agentic Web Editing (2025-2026 Landscape)

The concept of AI agents modifying live websites is rapidly evolving:

1. **Bolt.new / Lovable / v0:** These tools generate entire websites from prompts but create new projects, not edit existing ones. They are not suitable for ongoing storefront management.

2. **Builder.io Fusion:** The most polished commercial solution. Sends pull requests from visual edits. Git-native. But proprietary and cloud-locked.

3. **Google Antigravity:** Google's agentic development platform. Deploys autonomous agents that plan, execute, and verify tasks across editor, terminal, and browser. Early stage.

4. **PlayCode Agent:** Describes what you want and the agent builds it. React/Vue/Tailwind. But creates new projects, not programmatic editing of existing storefronts.

### MCP Apps (January 2026)

MCP Apps is the first official MCP extension that allows tools to return interactive UI components directly in the conversation. This means:
- A storefront editing MCP server could render page previews inline
- The agent could show before/after comparisons in the chat
- Users could approve changes visually before publishing
- Supported by ChatGPT, Claude, Goose, and VS Code

### Key Trends

1. **JSON-as-Interface:** The winning pattern is JSON page data as the exchange format between AI agents and visual editors. Both Puck and GrapesJS use JSON. This is more reliable than HTML generation.

2. **Component Vocabulary:** AI agents work best when they have a constrained component vocabulary (Hero, ProductGrid, Testimonials) rather than unlimited HTML. Puck's config-driven approach enforces this.

3. **Tool Use During Generation:** The ability for the AI to call external APIs (Medusa products, inventory, analytics) during page generation is a differentiator. Puck's tools parameter enables this.

4. **Incremental Editing:** Modifying existing pages (not just creating new ones) is critical for ongoing storefront management. Puck's `pageData` parameter handles this elegantly.

5. **Self-Healing Layouts:** Emerging pattern where AI agents monitor page performance (via analytics) and autonomously optimize layouts. Requires the full loop: analytics -> AI analysis -> page modification -> deployment.

---

## 9. Recommended Stack

### Primary Recommendation

```
+------------------+     +------------------+     +------------------+
|   OpenClaw       |     |   Puck AI        |     |   Medusa.js      |
|   (AI Agent)     |---->|   (Visual Editor) |---->|   (Commerce)     |
|                  |     |                  |     |                  |
| - Skills system  |     | - generate() API |     | - Products API   |
| - MCP support    |     | - JSON page data |     | - Orders API     |
| - Multi-LLM      |     | - Component cfg  |     | - Cart API       |
| - ClawHub skills |     | - AI tools       |     | - Customer API   |
+------------------+     +------------------+     +------------------+
         |                       |                        |
         v                       v                        v
+------------------------------------------------------------------+
|              Next.js Storefront (App Router)                      |
|                                                                  |
| - <Render> component for Puck pages                             |
| - Medusa.js SDK for commerce                                    |
| - Puck editor UI for human editing (optional)                   |
| - API routes for page CRUD                                       |
+------------------------------------------------------------------+
         |
         v
+------------------------------------------------------------------+
|              Storage Layer                                        |
|                                                                  |
| - Supabase/PostgreSQL: Page JSON data, versions                 |
| - Medusa DB: Products, orders, customers                        |
| - Git (optional): Page version history                          |
+------------------------------------------------------------------+
```

### Why Puck Wins

1. **Purpose-built `generate()` API:** The only editor where an AI agent can call a single function with a natural language prompt and get back a structured page. No custom HTML generation, no DOM manipulation, no jsdom hacks.

2. **Tools parameter:** Lets the AI query Medusa.js for real product data during page generation. The AI can create "Top 5 products" sections using actual inventory.

3. **Component-level AI configuration:** You define how the AI should use each component. `instructions: "Always use this for the first section"`, `exclude: true` for internal components, `stream: false` for image URLs.

4. **Business context:** Brand voice, tone, constraints are injected into every generation call. The AI knows "We are an artisan honey shop. Warm, organic aesthetic."

5. **pageData for incremental edits:** Pass the current page JSON + a modification prompt. The AI understands what exists and makes targeted changes.

6. **JSON-native:** Input and output are JSON. Perfect for database storage, API transport, version comparison, and rendering via `<Render>`.

7. **MIT license, no vendor lock-in:** The editor and data are yours. Self-hostable.

8. **Same ecosystem:** React + Next.js + TypeScript = same stack as Medusa.js storefront.

### When to Choose GrapesJS Instead

- You need to edit raw HTML/CSS (not React components)
- You need framework-agnostic output (static sites, email templates)
- You want to build a general-purpose web builder, not just an e-commerce storefront
- You need the most mature plugin ecosystem
- You are willing to build custom LLM integration glue code
- You need to support non-React storefronts

### Complementary Tools

- **Payload CMS** (MIT, 41.2k stars): Add alongside Puck if you need structured content management, authentication, admin UI, and content workflows. Payload manages "data" (blog posts, product descriptions, settings), Puck manages "pages" (visual layouts).

- **Strapi** (MIT, 71.6k stars): Alternative to Payload for structured content. Larger community, documented Medusa integration. Choose based on preference for Next.js-native (Payload) vs standalone Node.js CMS (Strapi).

---

## 10. Implementation Roadmap

### Phase 1: Foundation (Days 1-2)

1. Set up Puck in the Next.js storefront
2. Define the component library (Hero, ProductGrid, Testimonials, CTA, Banner, TextBlock, ImageBlock)
3. Create a page storage API (Supabase table: `storefront_pages` with slug, puck_data JSON, status, version)
4. Implement `<Render>` for serving pages from stored JSON
5. Connect Medusa.js product fetching to Puck component props

### Phase 2: AI Generation (Days 3-4)

1. Set up Puck AI (configure API key or self-host)
2. Define AI configuration for each component (instructions, exclude, required fields)
3. Create Medusa.js tools for the generate() function (getProducts, getCategories, getInventory)
4. Build the page generation service:
   - `createPage(slug, prompt)` -> calls generate(), stores result
   - `editPage(slug, prompt)` -> loads current, calls generate() with pageData, stores result
5. Add business context configuration
6. Test end-to-end: prompt -> generation -> storage -> rendering

### Phase 3: OpenClaw Integration (Days 5-6)

1. Create `flowb-storefront` OpenClaw skill (SKILL.md + scripts)
2. Register `flowb_storefront` tool in openclaw.ts
3. (Optional) Build MCP server wrapping Puck generate() for broader agent compatibility
4. Implement page versioning and rollback
5. Add publish workflow (draft -> review -> live)
6. Test full loop: User tells OpenClaw -> Agent calls skill -> Page updated -> Live site reflects changes

### Phase 4: Enhancement (Future)

1. Add human review workflow (agent proposes, human approves)
2. Implement A/B testing (agent generates variants, tracks performance)
3. Analytics-driven optimization (agent reads analytics, suggests/makes improvements)
4. Multi-site support (different Puck configs per storefront)
5. MCP Apps integration (render page previews in chat)

---

## Appendix: Quick Reference Links

### Primary Tools
- Puck: https://github.com/puckeditor/puck | https://puckeditor.com/docs
- GrapesJS: https://github.com/GrapesJS/grapesjs | https://grapesjs.com/docs/api/
- Medusa.js: https://github.com/medusajs/medusa | https://docs.medusajs.com/
- OpenClaw: https://github.com/openclaw/openclaw | https://docs.openclaw.ai/

### Complementary Tools
- Payload CMS: https://github.com/payloadcms/payload | https://payloadcms.com/docs
- Strapi: https://github.com/strapi/strapi | https://strapi.io/

### Key Documentation
- Puck AI Overview: https://puckeditor.com/docs/ai/overview
- Puck generate() API: https://puckeditor.com/docs/api-reference/ai/cloud-client/generate
- Puck AI Configuration: https://puckeditor.com/docs/ai/ai-configuration
- GrapesJS Editor API: https://grapesjs.com/docs/api/editor.html
- GrapesJS Headless Mode: https://github.com/GrapesJS/grapesjs/discussions/3672
- OpenClaw Skills: https://docs.openclaw.ai/tools/skills
- OpenClaw MCP: https://github.com/freema/openclaw-mcp
- MCP Apps: https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/

### Existing FlowB Integration Points
- OpenClaw tool registration: `/home/koh/Documents/flowb/src/openclaw.ts`
- OpenClaw config: `/home/koh/Documents/flowb/infra/openclaw/openclaw.json`
- Existing biz skill: `/home/koh/Documents/flowb/infra/openclaw/skills/flowb-biz/SKILL.md`
