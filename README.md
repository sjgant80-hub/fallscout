<div align="center">

# FallScout

### LinkedIn Intelligence API with Psyche Engine

**Sniper outreach. Not shotgun spam.**

[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)
[![Port](https://img.shields.io/badge/port-3005-blue)]()
[![License](https://img.shields.io/badge/license-proprietary-red)]()

[Live Demo](https://sjgant80-hub.github.io/fallscout/) | [API Docs](#endpoints) | [Quick Start](#quick-start)

</div>

---

## What Is FallScout?

FallScout scrapes LinkedIn profiles and posts, runs AI-powered research, builds deep psychological profiles of your prospects, and generates precision-targeted outreach that actually converts.

Most outreach tools spray generic templates. FallScout reads your prospect like a book, then speaks their language.

```
Scrape --> Research --> Psyche --> Comment --> DM --> FallLead --> FallForce
```

---

## The Psyche Engine

> *This is the differentiator. This is why FallScout exists.*

The Psyche Engine doesn't just analyze what prospects say. It decodes **why** they say it, **how** they think, and **what** will make them act.

Four modules. One unified psychological profile. Zero guesswork.

### Freudian Drive Analysis

Deconstructs the prospect's motivational architecture.

| Layer | What It Maps |
|-------|-------------|
| **Id** | Raw desires, ambition signals, status drives |
| **Ego** | How they present themselves, self-image construction |
| **Superego** | Values they project, moral positioning, virtue signals |
| **Defense Mechanisms** | How they deflect criticism, handle objections, protect self-image |
| **Transference Patterns** | Authority relationships, trust triggers, rapport anchors |

### Jungian Archetype Mapping

Maps the prospect to one of 12 archetypes, then identifies the shadow they suppress.

| Component | Output |
|-----------|--------|
| **Dominant Archetype** | Primary identity (Hero, Sage, Rebel, Creator, etc.) |
| **Shadow Archetype** | What they hide or deny -- your leverage point |
| **Trigger Phrases** | Language patterns that activate each archetype |
| **Archetype Tension** | The gap between who they are and who they project |

### ToneEngine Voice Fingerprint

Reverse-engineers how the prospect communicates so you can mirror them.

| Signal | What It Captures |
|--------|-----------------|
| **Rhythm** | Sentence length, pacing, cadence patterns |
| **Register** | Formal vs. casual, technical depth, jargon density |
| **Power Words** | The specific words they gravitate toward |
| **Mimicry Rules** | Actionable rules for writing in their voice |

### Sales 101 Methodology

Maps the prospect to proven sales frameworks so your approach is methodologically sound.

| Framework | Application |
|-----------|------------|
| **SPIN** | Situation, Problem, Implication, Need-payoff signals detected |
| **Challenger** | Teach, Tailor, Take Control positioning |
| **Solution Selling** | Pain identification and solution alignment |
| **Gap Selling** | Current state vs. future state gap analysis |
| **Buying Stage** | Where they sit in the decision journey |
| **Objection Map** | Predicted objections with pre-built counters |

---

## The Flow

```
+----------+     +----------+     +-------+     +---------+     +----+     +----------+     +-----------+
|  Scrape  | --> | Research | --> | Psyche| --> | Comment | --> | DM | --> | FallLead | --> | FallForce |
+----------+     +----------+     +-------+     +---------+     +----+     +----------+     +-----------+
  LinkedIn        AI Analysis      Freud         Warm-up         Sniper     Export           CRM +
  Profile +       Interests        Jung          Engagement      Outreach   Format           Automation
  Posts           Pain Points      Tone          Build                      
                  Hooks            Sales 101     Familiarity                
                  Decision                                                  
                  Signals                                                   
```

---

## Quick Start

### Prerequisites

- Node.js >= 18
- At least one AI provider API key

### Install

```bash
git clone https://github.com/sjgant80-hub/fallscout.git
cd fallscout
npm install
```

### Configure

Create a `.env` file in the project root:

```env
# AI Provider Keys (at least one required)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_AI_KEY=AI...

# Server
PORT=3005
```

### Run

```bash
npm start
```

Server starts on `http://localhost:3005`. Hit `/health` to confirm.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | At least one AI key | Claude API key for research and psyche analysis |
| `OPENAI_API_KEY` | At least one AI key | OpenAI API key (alternative provider) |
| `GOOGLE_AI_KEY` | At least one AI key | Google AI API key (alternative provider) |
| `PORT` | No | Server port (default: `3005`) |

---

## Endpoints

### Scraping

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/scrape/profile` | Scrape a LinkedIn profile |
| `POST` | `/scrape/posts` | Scrape recent posts with engagement metrics |
| `POST` | `/scrape/full` | Profile + posts + auto-save to prospects |

### Ingestion

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/ingest` | Manually create a prospect |
| `POST` | `/ingest/batch` | Bulk import multiple prospects |

### Prospects

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/prospects` | List all prospects (supports filters) |
| `GET` | `/prospects/:id` | Full prospect detail |
| `PATCH` | `/prospects/:id` | Update status, tags, notes |
| `DELETE` | `/prospects/:id` | Remove a prospect |

### Research

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/research/:id` | AI-powered research analysis (interests, pain points, hooks, decision signals) |

### Psyche

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/psyche/:id` | Full Psyche Engine profile (Freud + Jung + Tone + Sales 101) |

### Outreach

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/sniper/:id` | Full stack: research + psyche + sniper DMs |
| `POST` | `/outreach/dm/:id` | Generate tailored DMs (auto-loads psyche profile) |
| `POST` | `/outreach/comment` | Generate engagement comments for warm-up |

### Campaigns

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/campaigns` | Create a new campaign |
| `GET` | `/campaigns` | List all campaigns |
| `POST` | `/campaigns/:id/research-all` | Bulk research all prospects in a campaign |

### Export & Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/export/falllead` | Export prospects in FallLead format |
| `GET` | `/stats` | Pipeline analytics and metrics |
| `GET` | `/health` | Health check |

---

## Code Examples

### Scrape a Full Profile

```bash
curl -X POST http://localhost:3005/scrape/full \
  -H "Content-Type: application/json" \
  -d '{
    "linkedinUrl": "https://www.linkedin.com/in/target-prospect"
  }'
```

Response includes the scraped profile, recent posts with engagement metrics, and a saved prospect ID for downstream operations.

### Run the Psyche Engine

```bash
curl -X POST http://localhost:3005/psyche/PROSPECT_ID \
  -H "Content-Type: application/json"
```

Returns the full psychological profile:
- Freudian drive analysis (id/ego/superego, defense mechanisms, transference)
- Jungian archetype mapping (dominant + shadow, trigger phrases)
- ToneEngine voice fingerprint (rhythm, register, power words, mimicry rules)
- Sales 101 methodology (SPIN/Challenger/Solution/Gap, buying stage, objections)

### Full Sniper Stack

```bash
curl -X POST http://localhost:3005/sniper/PROSPECT_ID \
  -H "Content-Type: application/json"
```

Runs the complete pipeline in one call: research analysis, Psyche Engine profiling, and sniper DM generation. Returns everything you need to make contact.

---

## Sniper DM Approaches

FallScout generates DMs using three psychologically-informed strategies:

### Archetype-Trigger

Activates the prospect's dominant Jungian archetype using their specific trigger phrases. If they're a **Hero**, the DM frames a challenge. If they're a **Sage**, it leads with insight. The message feels like it was written *for* them because it was.

### Gap-Reveal

Uses Gap Selling methodology mapped through the Psyche Engine. Identifies the delta between the prospect's current state and their desired future state, then surfaces it in a way that creates urgency without pressure. The prospect sees their own gap, not your pitch.

### Ego-Mirror

Leverages ToneEngine mimicry rules to write in the prospect's own voice patterns -- their rhythm, register, and power words. Combined with Freudian ego mapping, the DM reflects how the prospect sees themselves. People trust messages that sound like their own thinking.

---

## Pricing

| Tier | Prospects/Month | Features |
|------|----------------|----------|
| **Free** | 10 | Scraping, basic research, manual ingestion |
| **Pro** | 100 | Full Psyche Engine, sniper DMs, engagement comments |
| **Business** | 1,000 | Campaigns, bulk research, FallLead export, priority support |

---

## Pipeline

FallScout is one stage in a larger intelligence pipeline:

```
+-----------+     +----------+     +-----------+     +----------+
| FallScout | --> | FallLead | --> | FallForce | --> | FallCall |
+-----------+     +----------+     +-----------+     +----------+
  Scrape &          Lead             CRM &            Voice &
  Profile           Export           Automation        Call
  Intelligence      Format           Engine            Intelligence
```

| Stage | Role |
|-------|------|
| **FallScout** | LinkedIn scraping, AI research, Psyche Engine, sniper outreach |
| **FallLead** | Standardized lead format, enrichment, scoring |
| **FallForce** | CRM integration, sequence automation, pipeline management |
| **FallCall** | Voice intelligence, call scripting, conversation analysis |

---

## Deployment

### Local

```bash
npm start
```

### Production (Heroku)

A `Procfile` is included. Deploy with:

```bash
heroku create fallscout
heroku config:set ANTHROPIC_API_KEY=sk-ant-...
git push heroku main
```

### Docker

```dockerfile
FROM node:18-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3005
CMD ["node", "server.js"]
```

```bash
docker build -t fallscout .
docker run -p 3005:3005 --env-file .env fallscout
```

### Environment Notes

- Puppeteer requires Chromium. On Linux, install dependencies: `apt-get install -y chromium-browser`
- The stealth plugin runs headless Chrome with anti-detection measures
- Rate limiting is built in via `rate-limiter-flexible`

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `express` | HTTP server |
| `cors` | Cross-origin support |
| `puppeteer-extra` | Enhanced Puppeteer with plugin support |
| `puppeteer-extra-plugin-stealth` | Anti-detection for LinkedIn scraping |
| `puppeteer` | Headless Chrome automation |
| `rate-limiter-flexible` | Request rate limiting |
| `uuid` | Prospect and campaign ID generation |
| `cheerio` | HTML parsing and data extraction |

---

<div align="center">

**Built by Konomi + ACG**

[FallScout](https://github.com/sjgant80-hub/fallscout) | [FallLead](https://github.com/sjgant80-hub/falllead) | [FallForce](https://github.com/sjgant80-hub/fallforce) | [FallCall](https://github.com/sjgant80-hub/fallcall)

*Sniper outreach. Not shotgun spam.*

</div>
