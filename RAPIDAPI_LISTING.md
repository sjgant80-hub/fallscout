# FallScout — RapidAPI Listing

## Short Description (140 chars)

LinkedIn intelligence API with Psyche Engine — Freudian/Jungian profiling + sniper DMs that actually convert. Zero wasted small talk.

## Long Description

**FallScout is the LinkedIn intelligence API that goes beyond scraping.** While other APIs give you raw data, FallScout gives you psychological leverage.

### What FallScout Does

**Scrape** — Extract LinkedIn profiles and posts with structured, clean data. Full profile details, work history, posts with engagement metrics.

**Profile with the Psyche Engine** — FallScout's core differentiator. The Psyche Engine runs four parallel analysis models on every prospect:
- **Freudian Analysis** — Ego drivers, defense mechanisms, motivation layers
- **Jungian Archetypes** — Dominant archetype, shadow, persona, communication style
- **ToneEngine** — Voice mapping, register detection, vocabulary analysis, preferred hooks
- **Sales 101** — Buyer type classification, objection patterns, trigger words, closing style

**Sniper DMs** — Generate hyper-personalized direct messages engineered from the psychological profile. Every message is tailored to the prospect's archetype, tone preferences, and behavioral triggers.

**Pipeline Tracking** — Full prospect lifecycle management. Track status from scrape to conversion. Campaign organization, bulk research, export to FallLead.

### Why FallScout

Most sales outreach is noise. Generic templates, guessed pain points, spray-and-pray. FallScout replaces intuition with intelligence. When you know someone's Jungian archetype and Freudian drivers, you write messages that land — because they speak to who the person actually is.

## Category

Data > Lead Generation

## Keywords

- LinkedIn scraper API
- lead enrichment API
- prospect research API
- sales intelligence API
- LinkedIn profile API
- lead generation API

---

## Pricing

| Plan | Price | Monthly Requests | Daily Requests | Rate (per min) |
|------|-------|-----------------|---------------|----------------|
| BASIC | Free | 10 | 3 | 2 |
| PRO | $29/mo | 100 | 10 | 5 |
| ULTRA | $99/mo | 1,000 | 100 | 20 |
| MEGA | Custom | Unlimited | Unlimited | 300 |

---

## Code Examples

### Python — Full Scrape

```python
import requests

url = "https://fallscout.p.rapidapi.com/scrape/full"

payload = {
    "url": "https://www.linkedin.com/in/target-prospect",
    "cookies": "YOUR_LI_AT_COOKIE",
    "post_count": 10,
    "save": True
}

headers = {
    "Content-Type": "application/json",
    "X-RapidAPI-Key": "YOUR_RAPIDAPI_KEY",
    "X-RapidAPI-Host": "fallscout.p.rapidapi.com"
}

response = requests.post(url, json=payload, headers=headers)
data = response.json()

print(f"Profile: {data['profile']['name']}")
print(f"Posts scraped: {len(data['posts'])}")
print(f"Prospect ID: {data['prospect_id']}")
```

### Python — Psyche Engine

```python
import requests

prospect_id = "PROSPECT_ID_FROM_SCRAPE"
url = f"https://fallscout.p.rapidapi.com/psyche/{prospect_id}"

headers = {
    "X-RapidAPI-Key": "YOUR_RAPIDAPI_KEY",
    "X-RapidAPI-Host": "fallscout.p.rapidapi.com"
}

response = requests.post(url, headers=headers)
psyche = response.json()

print(f"Jungian Archetype: {psyche['jungian']['archetype']}")
print(f"Buyer Type: {psyche['sales_101']['buyer_type']}")
print(f"Dominant Tone: {psyche['tone_engine']['dominant_tone']}")
print(f"Trigger Words: {psyche['sales_101']['trigger_words']}")
```

### Python — Sniper (Full Stack)

```python
import requests

prospect_id = "PROSPECT_ID_FROM_SCRAPE"
url = f"https://fallscout.p.rapidapi.com/sniper/{prospect_id}"

headers = {
    "X-RapidAPI-Key": "YOUR_RAPIDAPI_KEY",
    "X-RapidAPI-Host": "fallscout.p.rapidapi.com"
}

response = requests.post(url, headers=headers)
sniper = response.json()

# Research intelligence
print(f"Key Interests: {sniper['research']['key_interests']}")
print(f"Pain Points: {sniper['research']['pain_points']}")

# Psychological profile
print(f"Archetype: {sniper['psyche']['jungian']['archetype']}")

# Sniper DMs — ready to send
for dm in sniper['dms']:
    print(f"\n[{dm['type']}] Hook: {dm['hook']}")
    print(f"Message: {dm['message']}")
    print(f"Lever: {dm['psychological_lever']}")
```

### JavaScript — Full Scrape

```javascript
const response = await fetch("https://fallscout.p.rapidapi.com/scrape/full", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-RapidAPI-Key": "YOUR_RAPIDAPI_KEY",
    "X-RapidAPI-Host": "fallscout.p.rapidapi.com"
  },
  body: JSON.stringify({
    url: "https://www.linkedin.com/in/target-prospect",
    cookies: "YOUR_LI_AT_COOKIE",
    post_count: 10,
    save: true
  })
});

const data = await response.json();
console.log(`Profile: ${data.profile.name}`);
console.log(`Prospect ID: ${data.prospect_id}`);
```

### JavaScript — Psyche Engine

```javascript
const prospectId = "PROSPECT_ID_FROM_SCRAPE";

const response = await fetch(`https://fallscout.p.rapidapi.com/psyche/${prospectId}`, {
  method: "POST",
  headers: {
    "X-RapidAPI-Key": "YOUR_RAPIDAPI_KEY",
    "X-RapidAPI-Host": "fallscout.p.rapidapi.com"
  }
});

const psyche = await response.json();
console.log(`Archetype: ${psyche.jungian.archetype}`);
console.log(`Buyer Type: ${psyche.sales_101.buyer_type}`);
```

### JavaScript — Sniper (Full Stack)

```javascript
const prospectId = "PROSPECT_ID_FROM_SCRAPE";

const response = await fetch(`https://fallscout.p.rapidapi.com/sniper/${prospectId}`, {
  method: "POST",
  headers: {
    "X-RapidAPI-Key": "YOUR_RAPIDAPI_KEY",
    "X-RapidAPI-Host": "fallscout.p.rapidapi.com"
  }
});

const sniper = await response.json();

sniper.dms.forEach(dm => {
  console.log(`[${dm.type}] ${dm.hook}`);
  console.log(dm.message);
});
```

### cURL — Full Scrape

```bash
curl -X POST "https://fallscout.p.rapidapi.com/scrape/full" \
  -H "Content-Type: application/json" \
  -H "X-RapidAPI-Key: YOUR_RAPIDAPI_KEY" \
  -H "X-RapidAPI-Host: fallscout.p.rapidapi.com" \
  -d '{
    "url": "https://www.linkedin.com/in/target-prospect",
    "cookies": "YOUR_LI_AT_COOKIE",
    "post_count": 10,
    "save": true
  }'
```

### cURL — Psyche Engine

```bash
curl -X POST "https://fallscout.p.rapidapi.com/psyche/PROSPECT_ID" \
  -H "X-RapidAPI-Key: YOUR_RAPIDAPI_KEY" \
  -H "X-RapidAPI-Host: fallscout.p.rapidapi.com"
```

### cURL — Sniper (Full Stack)

```bash
curl -X POST "https://fallscout.p.rapidapi.com/sniper/PROSPECT_ID" \
  -H "X-RapidAPI-Key: YOUR_RAPIDAPI_KEY" \
  -H "X-RapidAPI-Host: fallscout.p.rapidapi.com"
```

---

## Test Endpoint

Use the health check to verify connectivity:

```bash
curl "https://fallscout.p.rapidapi.com/health" \
  -H "X-RapidAPI-Key: YOUR_RAPIDAPI_KEY" \
  -H "X-RapidAPI-Host: fallscout.p.rapidapi.com"
```

Expected response:

```json
{
  "status": "ok",
  "version": "1.0.0",
  "uptime": 86400
}
```
