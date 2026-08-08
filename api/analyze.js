export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Missing text parameter' });
  }

  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY not configured on server' });
  }

  const cleanNoise = (fullText) => {
    const lines = fullText.split('\n');
    const cleaned = [];
    let skipSection = false;

    const sectionStops = ['similar jobs', 'people also viewed', 'similar searches', 'explore top content'];
    const noiseLine = /^(?:-\s*)?\[.*\]\(.*\)$|^!\[.*\]\(.*\)$|^---+$/i;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const lower = trimmed.toLowerCase();
      if (lower.includes('table of contents')) continue;

      const isRealHeader = /^#{1,3}\s/.test(trimmed); 
      if (isRealHeader && sectionStops.some(stop => lower.includes(stop))) {
        skipSection = true;
        continue;
      }
      if (skipSection) continue;
      if (noiseLine.test(trimmed)) continue;

      cleaned.push(trimmed);
    }
    return cleaned;
  };

  const keyData = cleanNoise(text);

  if (keyData.length === 0) {
    return res.status(400).json({ error: "Analisi fallita: input vuoto o strutturalmente illeggibile." });
  }

  const systemPrompt = `Sei il peggior incubo di un ufficio HR. Analizzi annunci di lavoro per smascherare tentativi di sfruttamento, lacune contrattuali e fuffa di marketing.
REGOLE DI OUTPUT (TASSATIVE):
1. NESSUN MARKDOWN. Niente asterischi, niente grassetti.
2. SINTESI: Descrizione cruda del ruolo. ZERO nomi aziendali.
3. RED FLAG: Elenca le 3 criticità più gravi (RAL assente, clausole vaghe, benefit fittizi, welfare condizionato). Sii brutale.
4. VERDETTO: SOLO "Candidati" o "Rifiuta".
5. MOTIVAZIONE: Una singola riga finale che demolisce l'annuncio o ne evidenzia l'unica parte accettabile, senza pietà.

IGNORA i link di navigazione. IGNORA i benefit generici. Cerca solo la sostanza economica e contrattuale.`;

  try {
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: keyData.join('\n') }
        ],
        max_tokens: 1500,
        temperature: 0.2,
      }),
    });

    if (!groqResponse.ok) {
      const errorData = await groqResponse.json();
      return res.status(groqResponse.status).json({
        error: `Groq API error: ${errorData.error?.message || groqResponse.statusText}`
      });
    }

    const result = await groqResponse.json();
    if (!result.choices?.[0]?.message?.content) {
      return res.status(500).json({ error: "Risposta vuota dall'IA." });
    }

    return res.status(200).json({ analysis: result.choices[0].message.content });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}