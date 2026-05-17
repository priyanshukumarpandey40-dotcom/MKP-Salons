import express from 'express';
import dotenv from 'dotenv';
import * as cheerio from 'cheerio';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.use(express.json());
app.use(express.static('public'));

const websiteKnowledge = new Map();

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim();
}

async function scrapeWebsite(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; WebsiteChatbot/1.0)'
    }
  });

  if (!response.ok) {
    throw new Error(`Could not fetch ${url}: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  $('script, style, noscript, svg').remove();

  const title = normalizeWhitespace($('title').first().text() || 'Untitled page');
  const headings = $('h1, h2, h3')
    .map((_, el) => normalizeWhitespace($(el).text()))
    .get()
    .filter(Boolean)
    .slice(0, 25);

  const bodyText = normalizeWhitespace($('body').text()).slice(0, 8000);

  return {
    url,
    title,
    headings,
    bodyText,
    scrapedAt: new Date().toISOString()
  };
}

async function askOpenAI(question, context) {
  if (!OPENAI_API_KEY) {
    return {
      answer:
        'I am missing OPENAI_API_KEY. Add it in a .env file, then restart the server.'
    };
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      input: [
        {
          role: 'system',
          content:
            'You are a helpful customer support chatbot for a business website. Answer only from provided site knowledge. If unknown, say you could not find it on the site.'
        },
        {
          role: 'user',
          content: `Website title: ${context.title}\nHeadings: ${context.headings.join(' | ')}\nContent: ${context.bodyText}`
        },
        {
          role: 'user',
          content: question
        }
      ]
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  const answer = data.output_text || 'No answer generated.';

  return { answer };
}

app.post('/api/ingest', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'url is required' });
    }

    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: 'Only http/https URLs are allowed' });
    }

    const knowledge = await scrapeWebsite(url);
    websiteKnowledge.set(url, knowledge);

    return res.json({
      message: 'Website ingested successfully',
      knowledgeSummary: {
        title: knowledge.title,
        headings: knowledge.headings.length,
        characters: knowledge.bodyText.length,
        scrapedAt: knowledge.scrapedAt
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { url, question } = req.body;

    if (!url || !question) {
      return res.status(400).json({ error: 'url and question are required' });
    }

    const knowledge = websiteKnowledge.get(url);
    if (!knowledge) {
      return res.status(404).json({
        error: 'No data found for this URL. Ingest the website first.'
      });
    }

    const response = await askOpenAI(question, knowledge);
    return res.json(response);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Chatbot server is running on http://localhost:${PORT}`);
});
