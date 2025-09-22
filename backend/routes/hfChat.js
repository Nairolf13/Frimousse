const express = require('express');
const fetch = require('node-fetch');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const router = express.Router();

const limiter = rateLimit({ windowMs: 60_000, max: 30 });
router.use(limiter);


const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;



function buildPrompt(question) {
  const system = `Tu es un assistant parental bienveillant.\n- Donne des conseils pratiques et sûrs.\n- Utilise un ton positif et rassurant.\n- Si la question relève de la santé ou de la sécurité, ajoute un avertissement et conseille de consulter un professionnel.`;
  return `${system}\n\nParent: ${question}\nAssistant:`;
}

router.post('/', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || typeof question !== 'string' || question.trim().length === 0) return res.status(400).json({ error: 'question required' });
    if (question.length > 5000) return res.status(400).json({ error: 'question too long' });

    const prompt = buildPrompt(question);

    let answer = '';
    if (MISTRAL_API_KEY) {
      try {
        const mBody = {
          model: 'mistral-large-latest',
          inputs: [
            { role: 'system', content: `Tu es un assistant parental bienveillant. Donne des conseils pratiques et sûrs. Réponds en français, 3 phrases maximum.` },
            { role: 'user', content: question }
          ],
          tools: [],
          completion_args: { temperature: 0.2, max_tokens: 512, top_p: 1 },
          stream: false,
          instructions: ''
        };

        const mController = new AbortController();
        const mTimeout = setTimeout(() => mController.abort(), 25000);
        const mr = await fetch('https://api.mistral.ai/v1/conversations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': MISTRAL_API_KEY,
          },
          body: JSON.stringify(mBody),
          signal: mController.signal,
        });
        clearTimeout(mTimeout);
        if (mr.ok) {
          const mj = await mr.json();
          if (mj.output_text) answer = String(mj.output_text);
          else if (mj.choices && mj.choices[0]) answer = (mj.choices[0].message?.content) || (mj.choices[0].text) || '';
          else if (mj.outputs && mj.outputs[0] && mj.outputs[0].content) {
            const c = mj.outputs[0].content;
            if (Array.isArray(c)) answer = c.map(x => x.text || x).join(' ');
            else answer = String(c);
          } else {
            // fallback to stringifying the response (trimmed)
            answer = String(mj);
          }
          answer = (answer || '').toString().trim();
          if (answer.length > 2000) answer = answer.slice(0, 2000) + '...';
          console.log('[hf-chat] mistral answer:', answer);
          return res.json({ answer, source: 'mistral' });
        } else {
          const txt = await mr.text();
          console.error('Mistral error', mr.status, txt);
        }
      } catch (e) {
        console.error('Mistral call failed', e);
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

   

    clearTimeout(timeout);

    if (!r.ok) {
      const text = await r.text();
      console.error('HF error', r.status, text);
      return res.status(502).json({ error: 'model error', details: text });
    }

    const json = await r.json();
    if (Array.isArray(json) && json[0]?.generated_text) answer = json[0].generated_text;
    else if (json.generated_text) answer = json.generated_text;
    else answer = String(json);

    const lower = String(answer || '').toLowerCase();
    if (lower.includes('médicament') || lower.includes('docteur') || lower.includes('hopital')) {
      answer = `${answer}\n\n⚠️ Ceci peut relever de la santé. Consultez un professionnel si nécessaire.`;
    }

    return res.json({ answer, source: 'hf' });
  } catch (err) {
    console.error('hf-proxy error', err);
    if (err && err.name === 'AbortError') return res.status(504).json({ error: 'timeout' });
    return res.status(500).json({ error: 'internal' });
  }
});

module.exports = router;
