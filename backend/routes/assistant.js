const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();

const router = express.Router();

router.post('/', async (req, res) => {
  const userMessage = req.body.message || '';
  const context = req.body.context || null;
  if (!userMessage || typeof userMessage !== 'string') return res.status(400).json({ error: 'message required' });

  try {
    try {
      console.log('[assistant] received body:');
    } catch (e) {
      console.log('[assistant] received body (non-serializable)');
    }
    // Build the system content (directive + optional UI context)
    const systemContent = (() => {
      let base = `Tu es un assistant parental spécialisé dans la garde d’enfants, le bien-être et l’éducation des enfants entre 0 et 10 ans.\n\n🎯 Ta mission :\n- Apporter des réponses claires, bienveillantes et pratiques aux parents et nounous.\n- Aider à gérer les émotions et comportements des enfants (pleurs, colères, refus de dormir, anxiété…).\n- Proposer des activités adaptées selon l’âge (créatives, éducatives, motrices, calmes).\n- Conseiller sur les routines quotidiennes (sommeil, repas, jeux, apprentissage).\n- Encourager toujours une approche douce, positive et rassurante.\n\n⚠️ Règles importantes :\n- Ne donne jamais de conseils médicaux. Si une situation semble grave ou médicale, recommande de consulter un professionnel de santé.\n- Évite le jargon technique, répond de façon simple et accessible.\n- Tes réponses doivent être adaptées au contexte familial et à l’âge des enfants.\n- Varie la longueur des réponses : parfois une astuce courte et rapide, parfois une explication plus complète.\n\n✨ Ton ton doit toujours être :\n- Bienveillant et rassurant\n- Positif et encourageant\n- Structuré et clair`;
      if (context) {
        try {
          const c = typeof context === 'string' ? JSON.parse(context) : context;
          const suggested = Array.isArray(c.suggested) ? c.suggested.join(' | ') : '';
          const summary = c.lastChildSummary ? `${c.lastChildSummary.name || ''} (${c.lastChildSummary.age || ''} ans) : humeur=${c.lastChildSummary.mood || ''}, repas=${c.lastChildSummary.meals || ''}, activités=${c.lastChildSummary.activities || ''}` : '';
          base += `\n\nContexte de l'interface: suggestions rapides = [${suggested}]`;
          if (summary) base += `; Dernier résumé enfant = ${summary}`;
        } catch (e) {
        }
      }
      base += "\n\nImportant: utilise les informations fournies dans 'Dernier résumé enfant' (lastChildSummary) si elles existent — mentionne le prénom de l'enfant et propose des actions adaptées. Ne PAS inventer d'informations non présentes dans le résumé; si une information manque, demande une précision. Si le résumé n'est pas pertinent, répond de façon générale mais claire.";
      console.log('[assistant] system prompt:');
      return base;
    })();

    // Build messages array including optional history so the model sees prior turns
    const messagesForModel = [{ role: 'system', content: systemContent }];
    if (Array.isArray(req.body.history)) {
      // expect history elements like { role: 'user'|'assistant', content: '...' }
      for (const h of req.body.history) {
        if (h && (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string') {
          messagesForModel.push({ role: h.role, content: h.content });
        }
      }
    }
    // finally add the current user message
    messagesForModel.push({ role: 'user', content: userMessage });

    const payload = {
      model: 'mistral-small-latest',
      messages: messagesForModel,
    };
    try {
      console.log('[assistant] sending payload to Mistral:');
    } catch (e) {
      console.log('[assistant] sending payload to Mistral (non-serializable)');
    }

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error('Mistral returned error', response.status, t);
      return res.status(502).json({ error: 'Mistral error', details: t });
    }

    const data = await response.json();
    let reply = '';
    if (data.choices && data.choices[0] && data.choices[0].message) reply = data.choices[0].message.content || '';
    else if (data.output_text) reply = data.output_text;
    else reply = JSON.stringify(data).slice(0, 2000);

    return res.json({ reply });
  } catch (err) {
    console.error('Erreur avec Mistral API :', err);
    return res.status(500).json({ error: 'Erreur avec Mistral API' });
  }
});

module.exports = router;
