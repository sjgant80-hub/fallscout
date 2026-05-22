/**
 * ◊ FallScout — LinkedIn Intelligence API
 * Scrape · Research · Outreach · Zero wasted small talk
 *
 * Pipeline: FallScout → FallLead → FallForce → FallCall
 * Port: 3005
 * Storage: disk-based JSON
 * Sovereign: your data never leaves your server
 *
 * ◊ POWERED BY KONOMI ARCHITECTURE · phi·kappa=1
 */

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/* ◊ LAZY LOAD — heavy deps loaded on first scrape */
let puppeteer = null;
let StealthPlugin = null;
let cheerio = null;
let browser = null;

function loadScraper() {
  if (!puppeteer) {
    puppeteer = require('puppeteer-extra');
    StealthPlugin = require('puppeteer-extra-plugin-stealth');
    puppeteer.use(StealthPlugin());
  }
}
function loadCheerio() {
  if (!cheerio) cheerio = require('cheerio');
}

/* ◊ CONFIG */
const PORT = process.env.PORT || 3005;
const MAX_BODY = '10mb';
const RATE_LIMIT_SCRAPE = 5;   // scrapes per minute
const RATE_LIMIT_API = 60;     // API calls per minute

/* ◊ STORAGE */
const STORAGE = path.join(__dirname, '.storage');
const META = path.join(STORAGE, '.meta');
const PROSPECTS = path.join(STORAGE, 'prospects');
const CAMPAIGNS = path.join(STORAGE, 'campaigns');
const RESEARCH = path.join(STORAGE, 'research');
const OUTREACH = path.join(STORAGE, 'outreach');
const INDEX_FILE = path.join(META, 'index.json');
const KEYS_FILE = path.join(META, 'keys.json');

[STORAGE, META, PROSPECTS, CAMPAIGNS, RESEARCH, OUTREACH].forEach(d =>
  fs.mkdirSync(d, { recursive: true })
);

let index = { prospects: {}, campaigns: {}, stats: { scrapes: 0, researches: 0, dms: 0 } };
try { index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8')); } catch {}
function saveIndex() { fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2)); }

let apiKeys = [];
try { apiKeys = JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8')); } catch {}
function saveKeys() { fs.writeFileSync(KEYS_FILE, JSON.stringify(apiKeys, null, 2)); }

/* ◊ HELPERS */
function ts() { return new Date().toISOString(); }
function hash(s) { return crypto.createHash('md5').update(s).digest('hex').slice(0, 12); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function randomDelay(min = 1000, max = 3000) {
  return sleep(min + Math.random() * (max - min));
}

/* ◊ AI PROVIDERS */
async function callAI(prompt, system, provider = 'anthropic') {
  const key = process.env[{
    anthropic: 'ANTHROPIC_API_KEY',
    openai: 'OPENAI_API_KEY',
    google: 'GOOGLE_AI_KEY'
  }[provider]];
  if (!key) throw new Error(`No API key for ${provider}. Set env var.`);

  if (provider === 'anthropic') {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await r.json();
    if (data.error) throw new Error(data.error.message);
    return data.content[0].text;
  }

  if (provider === 'openai') {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        max_tokens: 4096,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt }
        ]
      })
    });
    const data = await r.json();
    if (data.error) throw new Error(data.error.message);
    return data.choices[0].message.content;
  }

  if (provider === 'google') {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GOOGLE_MODEL || 'gemini-1.5-flash'}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 4096 }
        })
      }
    );
    const data = await r.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  throw new Error(`Unknown provider: ${provider}`);
}

/* ═══════════════════════════════════════════
   ◊ SCRAPER MODULE — LinkedIn Intelligence
   ═══════════════════════════════════════════ */

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.4; rv:125.0) Gecko/20100101 Firefox/125.0',
];

async function getBrowser() {
  loadScraper();
  if (!browser || !browser.isConnected()) {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1920,1080'
      ]
    });
  }
  return browser;
}

async function scrapeProfile(url, cookies = []) {
  const b = await getBrowser();
  const page = await b.newPage();

  try {
    // stealth setup
    await page.setUserAgent(USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]);
    await page.setViewport({ width: 1920, height: 1080 });

    // set cookies if provided
    if (cookies.length > 0) {
      const parsed = typeof cookies === 'string' ? parseCookieString(cookies) : cookies;
      await page.setCookie(...parsed.map(c => ({
        ...c,
        domain: c.domain || '.linkedin.com'
      })));
    }

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await randomDelay(2000, 4000);

    // scroll to load lazy content
    await page.evaluate(async () => {
      for (let i = 0; i < 5; i++) {
        window.scrollBy(0, 600);
        await new Promise(r => setTimeout(r, 800));
      }
      window.scrollTo(0, 0);
    });
    await randomDelay(1000, 2000);

    // extract profile data
    const profile = await page.evaluate(() => {
      const getText = (sel) => {
        const el = document.querySelector(sel);
        return el ? el.textContent.trim() : '';
      };
      const getAll = (sel) => {
        return Array.from(document.querySelectorAll(sel)).map(el => el.textContent.trim()).filter(Boolean);
      };

      // try JSON-LD first
      const jsonLd = document.querySelector('script[type="application/ld+json"]');
      let structured = null;
      if (jsonLd) {
        try { structured = JSON.parse(jsonLd.textContent); } catch {}
      }

      // DOM-based extraction
      const name = getText('.text-heading-xlarge') ||
                    getText('h1.top-card-layout__title') ||
                    structured?.name || '';

      const headline = getText('.text-body-medium.break-words') ||
                       getText('.top-card-layout__headline') ||
                       structured?.jobTitle?.[0] || '';

      const location = getText('.text-body-small.inline.t-black--light.break-words') ||
                       getText('.top-card__subline-item') ||
                       structured?.address?.addressLocality || '';

      const about = getText('.pv-about__summary-text .inline-show-more-text') ||
                    getText('#about ~ .display-flex .inline-show-more-text') ||
                    getText('.core-section-container__content .inline-show-more-text') || '';

      // experience
      const expSections = document.querySelectorAll('#experience ~ .pvs-list__outer-container .pvs-entity--padded');
      const experience = Array.from(expSections).slice(0, 8).map(el => {
        const title = el.querySelector('.t-bold .visually-hidden')?.textContent?.trim() ||
                     el.querySelector('.t-bold span[aria-hidden]')?.textContent?.trim() || '';
        const company = el.querySelector('.t-normal .visually-hidden')?.textContent?.trim() ||
                       el.querySelector('.t-normal span[aria-hidden]')?.textContent?.trim() || '';
        const duration = el.querySelector('.pvs-entity__caption-wrapper .visually-hidden')?.textContent?.trim() || '';
        return { title, company, duration };
      }).filter(e => e.title);

      // education
      const eduSections = document.querySelectorAll('#education ~ .pvs-list__outer-container .pvs-entity--padded');
      const education = Array.from(eduSections).slice(0, 5).map(el => {
        const school = el.querySelector('.t-bold .visually-hidden')?.textContent?.trim() ||
                      el.querySelector('.t-bold span[aria-hidden]')?.textContent?.trim() || '';
        const degree = el.querySelector('.t-normal .visually-hidden')?.textContent?.trim() || '';
        return { school, degree };
      }).filter(e => e.school);

      // skills
      const skillEls = document.querySelectorAll('#skills ~ .pvs-list__outer-container .t-bold .visually-hidden');
      const skills = Array.from(skillEls).slice(0, 20).map(el => el.textContent.trim()).filter(Boolean);

      // connection count
      const connText = getText('.t-bold[href*="connections"]') ||
                       getText('.pv-top-card--list-bullet .t-bold');
      const connections = connText ? connText.replace(/[^\d+]/g, '') : '';

      // profile image
      const img = document.querySelector('.pv-top-card-profile-picture__image--show') ||
                  document.querySelector('.top-card__profile-image');
      const avatar = img?.src || '';

      return {
        name, headline, location, about,
        experience, education, skills, connections, avatar,
        url: window.location.href,
        scraped_at: new Date().toISOString()
      };
    });

    return profile;
  } finally {
    await page.close();
  }
}

async function scrapePosts(url, cookies = [], count = 10) {
  const b = await getBrowser();
  const page = await b.newPage();

  try {
    await page.setUserAgent(USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]);
    await page.setViewport({ width: 1920, height: 1080 });

    if (cookies.length > 0) {
      const parsed = typeof cookies === 'string' ? parseCookieString(cookies) : cookies;
      await page.setCookie(...parsed.map(c => ({ ...c, domain: c.domain || '.linkedin.com' })));
    }

    // navigate to activity/posts
    const activityUrl = url.replace(/\/$/, '') + '/recent-activity/all/';
    await page.goto(activityUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await randomDelay(2000, 4000);

    // scroll to load posts
    const scrollCount = Math.ceil(count / 3);
    for (let i = 0; i < scrollCount; i++) {
      await page.evaluate(() => window.scrollBy(0, 1200));
      await randomDelay(1500, 3000);
    }

    const posts = await page.evaluate((maxPosts) => {
      const postEls = document.querySelectorAll('.feed-shared-update-v2');
      return Array.from(postEls).slice(0, maxPosts).map(el => {
        const textEl = el.querySelector('.feed-shared-text .break-words') ||
                      el.querySelector('.feed-shared-update-v2__description .break-words');
        const text = textEl ? textEl.textContent.trim() : '';

        // engagement
        const likesEl = el.querySelector('.social-details-social-counts__reactions-count');
        const commentsEl = el.querySelector('.social-details-social-counts__comments');
        const likes = likesEl ? parseInt(likesEl.textContent.replace(/[^\d]/g, '')) || 0 : 0;
        const comments = commentsEl ? parseInt(commentsEl.textContent.replace(/[^\d]/g, '')) || 0 : 0;

        // timestamp
        const timeEl = el.querySelector('.feed-shared-actor__sub-description .visually-hidden') ||
                      el.querySelector('time');
        const timestamp = timeEl ? timeEl.textContent.trim() : '';

        // post type
        const hasImage = !!el.querySelector('.feed-shared-image');
        const hasVideo = !!el.querySelector('.feed-shared-video');
        const hasArticle = !!el.querySelector('.feed-shared-article');
        const type = hasVideo ? 'video' : hasImage ? 'image' : hasArticle ? 'article' : 'text';

        return { text, likes, comments, timestamp, type };
      }).filter(p => p.text);
    }, count);

    return posts;
  } finally {
    await page.close();
  }
}

function parseCookieString(cookieStr) {
  if (typeof cookieStr !== 'string') return cookieStr;
  return cookieStr.split(';').map(pair => {
    const [name, ...rest] = pair.trim().split('=');
    return { name: name.trim(), value: rest.join('=').trim(), domain: '.linkedin.com' };
  }).filter(c => c.name);
}


/* ═══════════════════════════════════════════
   ◊ RESEARCH MODULE — AI-Powered Analysis
   ═══════════════════════════════════════════ */

const RESEARCH_SYSTEM = `You are FallScout, a LinkedIn intelligence analyst. You analyze prospect profiles and their recent posts to identify:

1. **Key Interests**: What topics they consistently engage with
2. **Pain Points**: Problems they mention or allude to
3. **Communication Style**: Formal vs casual, thought-leader vs practitioner, emoji user vs straight text
4. **Conversation Hooks**: Specific posts, achievements, or opinions that make great DM openers
5. **Engagement Patterns**: What kind of content they post/react to most
6. **Decision Signals**: Signs they're evaluating solutions, hiring, expanding, or pivoting
7. **Shared Ground**: Potential commonalities to establish rapport

Output a structured JSON research report. Be specific — reference actual post content and profile details. No generic observations.`;

async function researchProspect(profile, posts, provider = 'anthropic') {
  const prompt = `Analyze this LinkedIn prospect for sales intelligence.

## PROFILE
Name: ${profile.name}
Headline: ${profile.headline}
Location: ${profile.location}
About: ${profile.about || '(not available)'}
Experience: ${JSON.stringify(profile.experience?.slice(0, 5) || [])}
Skills: ${(profile.skills || []).join(', ')}

## RECENT POSTS (${posts.length} total)
${posts.map((p, i) => `[Post ${i + 1}] (${p.likes} likes, ${p.comments} comments, ${p.type})
${p.text.slice(0, 500)}`).join('\n\n')}

Return a JSON object with these keys:
{
  "summary": "2-3 sentence executive summary of this prospect",
  "interests": ["topic1", "topic2", ...],
  "pain_points": ["pain1", "pain2", ...],
  "communication_style": { "formality": "formal|casual|mixed", "tone": "...", "emoji_use": "none|light|heavy", "post_frequency": "daily|weekly|occasional" },
  "hooks": [{ "type": "post|achievement|opinion", "reference": "specific thing to mention", "approach": "how to use this in outreach" }],
  "engagement_pattern": { "top_topics": [...], "avg_engagement": "high|medium|low", "content_type": "thought-leadership|how-to|personal|promotional" },
  "decision_signals": ["signal1", ...],
  "shared_ground_suggestions": ["suggestion1", ...],
  "best_approach": "recommended overall approach for initial contact",
  "avoid": ["things NOT to do or say"]
}`;

  const raw = await callAI(prompt, RESEARCH_SYSTEM, provider);
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { raw };
  } catch {
    return { raw };
  }
}


/* ═══════════════════════════════════════════
   ◊ OUTREACH MODULE — Tailored DMs
   ═══════════════════════════════════════════ */

const OUTREACH_SYSTEM = `You are FallScout's outreach engine. You craft personalized LinkedIn DMs that:

1. **Open with a specific reference** to their recent post or achievement — prove you actually looked
2. **Bridge naturally** from what THEY care about to what you offer
3. **Keep it short** — under 150 words, ideally under 100
4. **End with a low-friction ask** — not "can we schedule a call?" but something they can answer in one line
5. **Sound human** — match their communication style (formal if they're formal, casual if they're casual)
6. **Never sound like a template** — every word should feel chosen for THIS person

The goal: cut through the noise. No "I hope this message finds you well." No "I came across your profile." No filler. Start with something only someone who read their content would say.`;

async function generateDM(research, context, tone = 'professional', provider = 'anthropic') {
  const prompt = `Generate 3 tailored LinkedIn DMs for this prospect.

## RESEARCH REPORT
${JSON.stringify(research, null, 2)}

## MY CONTEXT
What I offer: ${context.offer || 'Not specified'}
My company: ${context.company || 'Not specified'}
Why this prospect: ${context.why || 'Not specified'}
Specific goal: ${context.goal || 'Start a conversation'}

## TONE: ${tone}

Return a JSON array of 3 DM options:
[
  {
    "approach": "name of the approach (e.g., 'post-reference', 'shared-interest', 'value-first')",
    "message": "the actual DM text",
    "reasoning": "why this approach works for THIS person",
    "hook_used": "which specific piece of their content/profile this references",
    "follow_up": "suggested follow-up if they respond positively"
  }
]

Each DM must be different in approach. One should reference a specific post, one should lead with value, one should find common ground.`;

  const raw = await callAI(prompt, OUTREACH_SYSTEM, provider);
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : [{ raw }];
  } catch {
    return [{ raw }];
  }
}

async function generateComment(postContent, research, context, provider = 'anthropic') {
  const prompt = `Generate 3 engagement comments for this LinkedIn post. The goal is warm-up engagement BEFORE sending a DM — add value to their post so they recognize your name.

## POST CONTENT
${postContent.slice(0, 1000)}

## PROSPECT RESEARCH
${JSON.stringify(research, null, 2)}

## MY CONTEXT
What I offer: ${context.offer || 'Not specified'}
My expertise: ${context.expertise || 'Not specified'}

Return a JSON array of 3 comment options:
[
  {
    "comment": "the actual comment text (under 200 words)",
    "approach": "agree-and-extend | respectful-challenge | add-data | share-experience",
    "reasoning": "why this comment style works here"
  }
]

Comments must add genuine value. No "Great post!" No "Thanks for sharing!" Actually engage with the ideas.`;

  const raw = await callAI(prompt, OUTREACH_SYSTEM, provider);
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : [{ raw }];
  } catch {
    return [{ raw }];
  }
}


/* ═══════════════════════════════════════════
   ◊ EXPRESS APP
   ═══════════════════════════════════════════ */

const app = express();
app.use(cors());
app.use(express.json({ limit: MAX_BODY }));

// serve landing page
app.use(express.static(path.join(__dirname), {
  index: 'index.html',
  dotfiles: 'ignore'
}));

// rate limiting
const { RateLimiterMemory } = require('rate-limiter-flexible');
const scrapeLimiter = new RateLimiterMemory({ points: RATE_LIMIT_SCRAPE, duration: 60 });
const apiLimiter = new RateLimiterMemory({ points: RATE_LIMIT_API, duration: 60 });

async function rateCheck(limiter, key, res) {
  try { await limiter.consume(key); return true; }
  catch { res.status(429).json({ error: 'Rate limit exceeded' }); return false; }
}

// request logging
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/scrape') || req.path.startsWith('/research') || req.path.startsWith('/outreach')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});


/* ─── SCRAPING ENDPOINTS ─── */

// POST /scrape/profile — scrape a LinkedIn profile
app.post('/scrape/profile', async (req, res) => {
  if (!await rateCheck(scrapeLimiter, req.ip, res)) return;
  const { url, cookies } = req.body;
  if (!url || !url.includes('linkedin.com')) {
    return res.status(400).json({ error: 'Valid LinkedIn URL required' });
  }
  try {
    const profile = await scrapeProfile(url, cookies || []);
    index.stats.scrapes = (index.stats.scrapes || 0) + 1;
    saveIndex();
    res.json({ ok: true, profile });
  } catch (err) {
    res.status(500).json({ error: 'Scrape failed: ' + err.message });
  }
});

// POST /scrape/posts — scrape recent posts
app.post('/scrape/posts', async (req, res) => {
  if (!await rateCheck(scrapeLimiter, req.ip, res)) return;
  const { url, cookies, count = 10 } = req.body;
  if (!url || !url.includes('linkedin.com')) {
    return res.status(400).json({ error: 'Valid LinkedIn URL required' });
  }
  try {
    const posts = await scrapePosts(url, cookies || [], Math.min(count, 30));
    res.json({ ok: true, count: posts.length, posts });
  } catch (err) {
    res.status(500).json({ error: 'Scrape failed: ' + err.message });
  }
});

// POST /scrape/full — scrape profile + posts in one shot
app.post('/scrape/full', async (req, res) => {
  if (!await rateCheck(scrapeLimiter, req.ip, res)) return;
  const { url, cookies, post_count = 10, save = true } = req.body;
  if (!url || !url.includes('linkedin.com')) {
    return res.status(400).json({ error: 'Valid LinkedIn URL required' });
  }
  try {
    const profile = await scrapeProfile(url, cookies || []);
    await randomDelay(3000, 6000); // natural pause between profile and posts
    const posts = await scrapePosts(url, cookies || [], Math.min(post_count, 30));
    index.stats.scrapes = (index.stats.scrapes || 0) + 1;

    let prospect_id = null;
    if (save) {
      prospect_id = uuidv4();
      const prospect = {
        id: prospect_id,
        profile,
        posts,
        status: 'scraped',
        tags: [],
        campaign_id: null,
        created_at: ts(),
        updated_at: ts()
      };
      fs.writeFileSync(path.join(PROSPECTS, `${prospect_id}.json`), JSON.stringify(prospect, null, 2));
      index.prospects[prospect_id] = {
        id: prospect_id,
        name: profile.name,
        headline: profile.headline,
        status: 'scraped',
        linkedin_url: url,
        created_at: prospect.created_at
      };
      saveIndex();
    }

    res.json({ ok: true, prospect_id, profile, posts: { count: posts.length, items: posts } });
  } catch (err) {
    res.status(500).json({ error: 'Scrape failed: ' + err.message });
  }
});


/* ─── MANUAL INGEST ─── */

// POST /ingest — manually add a prospect (no scraping needed)
app.post('/ingest', async (req, res) => {
  if (!await rateCheck(apiLimiter, req.ip, res)) return;
  const { profile, posts = [] } = req.body;
  if (!profile || !profile.name) {
    return res.status(400).json({ error: 'Profile with at least a name is required' });
  }

  const id = uuidv4();
  const prospect = {
    id,
    profile: { ...profile, scraped_at: ts(), source: 'manual' },
    posts,
    status: 'ingested',
    tags: req.body.tags || [],
    campaign_id: null,
    created_at: ts(),
    updated_at: ts()
  };
  fs.writeFileSync(path.join(PROSPECTS, `${id}.json`), JSON.stringify(prospect, null, 2));
  index.prospects[id] = {
    id, name: profile.name, headline: profile.headline || '',
    status: 'ingested', linkedin_url: profile.url || '',
    created_at: prospect.created_at
  };
  saveIndex();

  res.status(201).json({ ok: true, id, name: profile.name });
});

// POST /ingest/batch — bulk import prospects from CSV-like data
app.post('/ingest/batch', async (req, res) => {
  if (!await rateCheck(apiLimiter, req.ip, res)) return;
  const { prospects: list } = req.body;
  if (!Array.isArray(list) || list.length === 0) {
    return res.status(400).json({ error: 'Array of prospects required' });
  }
  if (list.length > 100) {
    return res.status(400).json({ error: 'Max 100 prospects per batch' });
  }

  const results = [];
  for (const item of list) {
    const id = uuidv4();
    const prospect = {
      id,
      profile: {
        name: item.name || '',
        headline: item.headline || '',
        location: item.location || '',
        about: item.about || '',
        url: item.linkedin_url || item.url || '',
        experience: item.experience || [],
        skills: item.skills || [],
        source: 'batch-import',
        scraped_at: ts()
      },
      posts: item.posts || [],
      status: 'ingested',
      tags: item.tags || [],
      campaign_id: null,
      created_at: ts(),
      updated_at: ts()
    };
    fs.writeFileSync(path.join(PROSPECTS, `${id}.json`), JSON.stringify(prospect, null, 2));
    index.prospects[id] = {
      id, name: prospect.profile.name, headline: prospect.profile.headline,
      status: 'ingested', linkedin_url: prospect.profile.url,
      created_at: prospect.created_at
    };
    results.push({ id, name: prospect.profile.name });
  }
  saveIndex();
  res.status(201).json({ ok: true, imported: results.length, prospects: results });
});


/* ─── PROSPECT MANAGEMENT ─── */

// GET /prospects — list all
app.get('/prospects', (req, res) => {
  const { status, campaign, tag, sort = 'created_at', order = 'desc', page = 1, limit = 20 } = req.query;
  let list = Object.values(index.prospects);

  if (status) list = list.filter(p => p.status === status);
  if (campaign) list = list.filter(p => p.campaign_id === campaign);
  if (tag) {
    // need to read full prospect to check tags
    list = list.filter(p => {
      try {
        const full = JSON.parse(fs.readFileSync(path.join(PROSPECTS, `${p.id}.json`), 'utf8'));
        return full.tags?.includes(tag);
      } catch { return false; }
    });
  }

  // sort
  list.sort((a, b) => {
    const va = a[sort] || '';
    const vb = b[sort] || '';
    return order === 'desc' ? vb.localeCompare(va) : va.localeCompare(vb);
  });

  const total = list.length;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  list = list.slice(offset, offset + parseInt(limit));

  res.json({ ok: true, total, page: parseInt(page), limit: parseInt(limit), prospects: list });
});

// GET /prospects/:id — full detail
app.get('/prospects/:id', (req, res) => {
  const filePath = path.join(PROSPECTS, `${req.params.id}.json`);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Prospect not found' });
  const prospect = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  // attach research if exists
  const researchPath = path.join(RESEARCH, `${req.params.id}.json`);
  if (fs.existsSync(researchPath)) {
    prospect.research = JSON.parse(fs.readFileSync(researchPath, 'utf8'));
  }
  // attach outreach history
  const outreachPath = path.join(OUTREACH, `${req.params.id}.json`);
  if (fs.existsSync(outreachPath)) {
    prospect.outreach_history = JSON.parse(fs.readFileSync(outreachPath, 'utf8'));
  }
  res.json({ ok: true, prospect });
});

// PATCH /prospects/:id — update status, tags, campaign
app.patch('/prospects/:id', (req, res) => {
  const filePath = path.join(PROSPECTS, `${req.params.id}.json`);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Prospect not found' });

  const prospect = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const { status, tags, campaign_id, notes } = req.body;

  if (status) prospect.status = status;
  if (tags) prospect.tags = tags;
  if (campaign_id !== undefined) prospect.campaign_id = campaign_id;
  if (notes !== undefined) prospect.notes = notes;
  prospect.updated_at = ts();

  fs.writeFileSync(filePath, JSON.stringify(prospect, null, 2));
  if (index.prospects[req.params.id]) {
    index.prospects[req.params.id].status = prospect.status;
    saveIndex();
  }

  res.json({ ok: true, id: req.params.id, status: prospect.status });
});

// DELETE /prospects/:id
app.delete('/prospects/:id', (req, res) => {
  const filePath = path.join(PROSPECTS, `${req.params.id}.json`);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Prospect not found' });
  fs.unlinkSync(filePath);
  delete index.prospects[req.params.id];
  // clean up research and outreach
  try { fs.unlinkSync(path.join(RESEARCH, `${req.params.id}.json`)); } catch {}
  try { fs.unlinkSync(path.join(OUTREACH, `${req.params.id}.json`)); } catch {}
  saveIndex();
  res.json({ ok: true, deleted: req.params.id });
});


/* ─── AI RESEARCH ─── */

// POST /research/:id — AI-analyze a saved prospect
app.post('/research/:id', async (req, res) => {
  if (!await rateCheck(apiLimiter, req.ip, res)) return;
  const filePath = path.join(PROSPECTS, `${req.params.id}.json`);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Prospect not found' });

  const { provider = 'anthropic' } = req.body;
  const prospect = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  if (!prospect.profile) return res.status(400).json({ error: 'Prospect has no profile data' });

  try {
    const report = await researchProspect(prospect.profile, prospect.posts || [], provider);

    // save research
    const research = { id: req.params.id, report, provider, generated_at: ts() };
    fs.writeFileSync(path.join(RESEARCH, `${req.params.id}.json`), JSON.stringify(research, null, 2));

    // update status
    prospect.status = 'researched';
    prospect.updated_at = ts();
    fs.writeFileSync(filePath, JSON.stringify(prospect, null, 2));
    if (index.prospects[req.params.id]) {
      index.prospects[req.params.id].status = 'researched';
    }
    index.stats.researches = (index.stats.researches || 0) + 1;
    saveIndex();

    res.json({ ok: true, id: req.params.id, research: report });
  } catch (err) {
    res.status(500).json({ error: 'Research failed: ' + err.message });
  }
});

// POST /research/instant — research without saving (pass profile+posts directly)
app.post('/research/instant', async (req, res) => {
  if (!await rateCheck(apiLimiter, req.ip, res)) return;
  const { profile, posts = [], provider = 'anthropic' } = req.body;
  if (!profile || !profile.name) {
    return res.status(400).json({ error: 'Profile with at least a name required' });
  }
  try {
    const report = await researchProspect(profile, posts, provider);
    index.stats.researches = (index.stats.researches || 0) + 1;
    saveIndex();
    res.json({ ok: true, research: report });
  } catch (err) {
    res.status(500).json({ error: 'Research failed: ' + err.message });
  }
});


/* ─── OUTREACH GENERATION ─── */

// POST /outreach/dm/:id — generate tailored DMs for a researched prospect
app.post('/outreach/dm/:id', async (req, res) => {
  if (!await rateCheck(apiLimiter, req.ip, res)) return;
  const prospectPath = path.join(PROSPECTS, `${req.params.id}.json`);
  const researchPath = path.join(RESEARCH, `${req.params.id}.json`);

  if (!fs.existsSync(prospectPath)) return res.status(404).json({ error: 'Prospect not found' });

  const { context = {}, tone = 'professional', provider = 'anthropic' } = req.body;

  // load research (or do instant research)
  let research;
  if (fs.existsSync(researchPath)) {
    research = JSON.parse(fs.readFileSync(researchPath, 'utf8')).report;
  } else {
    // auto-research first
    const prospect = JSON.parse(fs.readFileSync(prospectPath, 'utf8'));
    research = await researchProspect(prospect.profile, prospect.posts || [], provider);
    fs.writeFileSync(researchPath, JSON.stringify({ id: req.params.id, report: research, provider, generated_at: ts() }, null, 2));
  }

  try {
    const dms = await generateDM(research, context, tone, provider);

    // save outreach
    const outreachPath = path.join(OUTREACH, `${req.params.id}.json`);
    let history = [];
    try { history = JSON.parse(fs.readFileSync(outreachPath, 'utf8')); } catch {}
    history.push({ dms, context, tone, generated_at: ts() });
    fs.writeFileSync(outreachPath, JSON.stringify(history, null, 2));

    // update status
    const prospect = JSON.parse(fs.readFileSync(prospectPath, 'utf8'));
    prospect.status = 'outreach-ready';
    prospect.updated_at = ts();
    fs.writeFileSync(prospectPath, JSON.stringify(prospect, null, 2));
    if (index.prospects[req.params.id]) {
      index.prospects[req.params.id].status = 'outreach-ready';
    }
    index.stats.dms = (index.stats.dms || 0) + 1;
    saveIndex();

    res.json({ ok: true, id: req.params.id, options: dms });
  } catch (err) {
    res.status(500).json({ error: 'DM generation failed: ' + err.message });
  }
});

// POST /outreach/comment — generate engagement comment for a post
app.post('/outreach/comment', async (req, res) => {
  if (!await rateCheck(apiLimiter, req.ip, res)) return;
  const { post_content, prospect_id, context = {}, provider = 'anthropic' } = req.body;
  if (!post_content) return res.status(400).json({ error: 'post_content is required' });

  let research = {};
  if (prospect_id) {
    const researchPath = path.join(RESEARCH, `${prospect_id}.json`);
    if (fs.existsSync(researchPath)) {
      research = JSON.parse(fs.readFileSync(researchPath, 'utf8')).report;
    }
  }

  try {
    const comments = await generateComment(post_content, research, context, provider);
    res.json({ ok: true, options: comments });
  } catch (err) {
    res.status(500).json({ error: 'Comment generation failed: ' + err.message });
  }
});


/* ─── CAMPAIGNS ─── */

// POST /campaigns — create a campaign
app.post('/campaigns', (req, res) => {
  const { name, description = '', context = {} } = req.body;
  if (!name) return res.status(400).json({ error: 'Campaign name required' });

  const id = uuidv4();
  const campaign = {
    id, name, description, context,
    prospect_ids: [],
    status: 'active',
    created_at: ts(),
    updated_at: ts()
  };
  fs.writeFileSync(path.join(CAMPAIGNS, `${id}.json`), JSON.stringify(campaign, null, 2));
  index.campaigns[id] = { id, name, status: 'active', prospect_count: 0, created_at: campaign.created_at };
  saveIndex();

  res.status(201).json({ ok: true, id, name });
});

// GET /campaigns
app.get('/campaigns', (req, res) => {
  const list = Object.values(index.campaigns);
  res.json({ ok: true, total: list.length, campaigns: list });
});

// GET /campaigns/:id
app.get('/campaigns/:id', (req, res) => {
  const filePath = path.join(CAMPAIGNS, `${req.params.id}.json`);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Campaign not found' });
  const campaign = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  res.json({ ok: true, campaign });
});

// POST /campaigns/:id/prospects — add prospects to campaign
app.post('/campaigns/:id/prospects', (req, res) => {
  const filePath = path.join(CAMPAIGNS, `${req.params.id}.json`);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Campaign not found' });

  const { prospect_ids } = req.body;
  if (!Array.isArray(prospect_ids)) return res.status(400).json({ error: 'prospect_ids array required' });

  const campaign = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const added = [];

  for (const pid of prospect_ids) {
    if (!campaign.prospect_ids.includes(pid) && index.prospects[pid]) {
      campaign.prospect_ids.push(pid);
      // update prospect's campaign_id
      const pPath = path.join(PROSPECTS, `${pid}.json`);
      try {
        const p = JSON.parse(fs.readFileSync(pPath, 'utf8'));
        p.campaign_id = req.params.id;
        p.updated_at = ts();
        fs.writeFileSync(pPath, JSON.stringify(p, null, 2));
      } catch {}
      added.push(pid);
    }
  }

  campaign.updated_at = ts();
  fs.writeFileSync(filePath, JSON.stringify(campaign, null, 2));
  if (index.campaigns[req.params.id]) {
    index.campaigns[req.params.id].prospect_count = campaign.prospect_ids.length;
  }
  saveIndex();

  res.json({ ok: true, added: added.length, total_prospects: campaign.prospect_ids.length });
});

// POST /campaigns/:id/research-all — research all prospects in campaign
app.post('/campaigns/:id/research-all', async (req, res) => {
  if (!await rateCheck(apiLimiter, req.ip, res)) return;
  const filePath = path.join(CAMPAIGNS, `${req.params.id}.json`);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Campaign not found' });

  const { provider = 'anthropic' } = req.body;
  const campaign = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const results = { researched: 0, failed: 0, skipped: 0 };

  for (const pid of campaign.prospect_ids) {
    const researchExists = fs.existsSync(path.join(RESEARCH, `${pid}.json`));
    if (researchExists) { results.skipped++; continue; }

    try {
      const prospect = JSON.parse(fs.readFileSync(path.join(PROSPECTS, `${pid}.json`), 'utf8'));
      const report = await researchProspect(prospect.profile, prospect.posts || [], provider);
      fs.writeFileSync(path.join(RESEARCH, `${pid}.json`), JSON.stringify({ id: pid, report, provider, generated_at: ts() }, null, 2));
      prospect.status = 'researched';
      prospect.updated_at = ts();
      fs.writeFileSync(path.join(PROSPECTS, `${pid}.json`), JSON.stringify(prospect, null, 2));
      if (index.prospects[pid]) index.prospects[pid].status = 'researched';
      results.researched++;
      await sleep(1000); // rate limit AI calls
    } catch (err) {
      results.failed++;
    }
  }
  index.stats.researches = (index.stats.researches || 0) + results.researched;
  saveIndex();

  res.json({ ok: true, campaign: campaign.name, ...results });
});


/* ─── PIPELINE EXPORT — FallLead format ─── */

// POST /export/falllead — export prospects as FallLead-compatible leads
app.post('/export/falllead', (req, res) => {
  const { prospect_ids, campaign_id } = req.body;
  let ids = prospect_ids || [];

  if (campaign_id) {
    const campPath = path.join(CAMPAIGNS, `${campaign_id}.json`);
    if (fs.existsSync(campPath)) {
      const camp = JSON.parse(fs.readFileSync(campPath, 'utf8'));
      ids = camp.prospect_ids;
    }
  }

  const leads = ids.map(id => {
    try {
      const p = JSON.parse(fs.readFileSync(path.join(PROSPECTS, `${id}.json`), 'utf8'));
      let research = null;
      try { research = JSON.parse(fs.readFileSync(path.join(RESEARCH, `${id}.json`), 'utf8')).report; } catch {}

      return {
        source: 'fallscout',
        source_id: id,
        name: p.profile.name,
        title: p.profile.headline,
        company: p.profile.experience?.[0]?.company || '',
        location: p.profile.location,
        linkedin_url: p.profile.url,
        tags: p.tags,
        score: research ? (research.decision_signals?.length > 2 ? 'hot' : research.decision_signals?.length > 0 ? 'warm' : 'cold') : 'unscored',
        insights: research?.summary || '',
        hooks: research?.hooks || [],
        imported_at: ts()
      };
    } catch { return null; }
  }).filter(Boolean);

  res.json({
    ok: true,
    format: 'falllead-v1',
    count: leads.length,
    leads,
    export_meta: {
      source: 'FallScout',
      exported_at: ts(),
      pipeline: 'FallScout → FallLead → FallForce'
    }
  });
});


/* ─── STATS ─── */

app.get('/stats', (req, res) => {
  const prospectCount = Object.keys(index.prospects).length;
  const campaignCount = Object.keys(index.campaigns).length;
  const statusCounts = {};
  Object.values(index.prospects).forEach(p => {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
  });

  res.json({
    ok: true,
    stats: {
      prospects: prospectCount,
      campaigns: campaignCount,
      scrapes: index.stats.scrapes || 0,
      researches: index.stats.researches || 0,
      dms_generated: index.stats.dms || 0,
      by_status: statusCounts,
      pipeline: {
        scraped: statusCounts.scraped || 0,
        ingested: statusCounts.ingested || 0,
        researched: statusCounts.researched || 0,
        outreach_ready: statusCounts['outreach-ready'] || 0,
        contacted: statusCounts.contacted || 0,
        replied: statusCounts.replied || 0,
        converted: statusCounts.converted || 0
      }
    }
  });
});


/* ─── ADMIN ─── */

app.post('/admin/keys', (req, res) => {
  const { action, name } = req.body;
  if (action === 'create') {
    const key = { id: uuidv4(), name: name || 'default', key: 'fsk_' + crypto.randomBytes(24).toString('hex'), created: ts() };
    apiKeys.push(key);
    saveKeys();
    return res.json({ ok: true, key });
  }
  if (action === 'list') {
    return res.json({ ok: true, keys: apiKeys.map(k => ({ ...k, key: k.key.slice(0, 8) + '...' })) });
  }
  if (action === 'revoke') {
    const { key_id } = req.body;
    apiKeys = apiKeys.filter(k => k.id !== key_id);
    saveKeys();
    return res.json({ ok: true, revoked: key_id });
  }
  res.status(400).json({ error: 'action must be create, list, or revoke' });
});


/* ─── HEALTH ─── */

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'FallScout',
    version: '1.0.0',
    uptime: process.uptime(),
    pipeline: 'FallScout → FallLead → FallForce → FallCall',
    tag: 'POWERED BY KONOMI ARCHITECTURE · phi·kappa=1'
  });
});


/* ◊ START */
app.listen(PORT, () => {
  console.log(`\n  ◊ FallScout — LinkedIn Intelligence API`);
  console.log(`  ────────────────────────────────────────`);
  console.log(`  Port:      ${PORT}`);
  console.log(`  Storage:   ${STORAGE}`);
  console.log(`  Prospects: ${Object.keys(index.prospects).length}`);
  console.log(`  Campaigns: ${Object.keys(index.campaigns).length}`);
  console.log(`  Pipeline:  FallScout → FallLead → FallForce → FallCall`);
  console.log(`  ────────────────────────────────────────`);
  console.log(`  ◊ POWERED BY KONOMI ARCHITECTURE · phi·kappa=1`);
  console.log(`  ⚒ Member of the AI Craftspeople Guild\n`);
});

process.on('SIGINT', async () => {
  console.log('\n  ◊ Shutting down FallScout...');
  if (browser) await browser.close();
  saveIndex();
  process.exit(0);
});
