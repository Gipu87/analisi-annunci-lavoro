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

  const systemPrompt = `Sei un analista cinico e brutale di annunci di lavoro.
REGOLE DI OUTPUT (TASSATIVE):
1. LINGUA RISPOSTA: Scrivi ESCLUSIVAMENTE in italiano. Non importa in che lingua ragioni, l'output deve essere in perfetto italiano.
2. NESSUN MARKDOWN: Testo piatto, niente asterischi o grassetti.
3. SINTESI: Descrizione cruda del ruolo. ZERO nomi aziendali.
4. RED FLAG: Elenca le 3 criticità più gravi. Sii brutale.
5. VERDETTO: SOLO "Candidati" o "Rifiuta".
6. MOTIVAZIONE: Una sola riga finale di pura cinica onestà.`;

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

    const result = await groqResponse.json();
    
    if (!result.choices?.[0]?.message?.content) {
      return res.status(500).json({ error: "Risposta vuota dall'IA." });
    }

    return res.status(200).json({ analysis: result.choices[0].message.content });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}