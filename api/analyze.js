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

  // Estrazione intelligente: cerca keyword critiche
  const extractKeyData = (fullText) => {
    const lines = fullText.split('\n').filter(l => l.trim());
    const extracted = [];

    const keywords = [
      'ral', 'stipendio', 'compenso', 'salary', 'wage',
      'contratto', 'contract', 'tipo di contratto',
      'mansione', 'responsabilità', 'duties', 'role',
      'orari', 'hours', 'full-time', 'part-time', 'remote',
      'sede', 'location', 'where', 'luogo',
      'esperienza', 'experience', 'years', 'anni',
      'benefit', 'benefits', 'ferie', 'holiday'
    ];

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (keywords.some(kw => lower.includes(kw))) {
        extracted.push(line.trim());
        if (extracted.length >= 15) break;
      }
    }

    return extracted;
  };

  const keyData = extractKeyData(text);

  if (keyData.length === 0) {
    return res.status(400).json({ 
      error: "L'annuncio non sembra contenere le informazioni essenziali per un'analisi approfondita." 
    });
  }

  const systemPrompt = `Agisci come un analista spietato di annunci di lavoro. L'output deve essere chirurgico e composto SOLO ed ESCLUSIVAMENTE da queste tre sezioni:
1. Sintesi: breve riassunto del ruolo.
2. Red Flag: le 3 principali criticità o trappole dell'annuncio.
3. Verdetto: (Candidati / Passa / Rifiuta / Negozia) più una riga di motivazione.
Non riepilogare i dati estratti, non aggiungere convenevoli o introduzioni. Zero parole inutili.`;

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
        max_tokens: 500,
        temperature: 0.4,
      }),
    });

    if (!groqResponse.ok) {
      const errorData = await groqResponse.json();
      return res.status(groqResponse.status).json({
        error: `Groq API error: ${errorData.error?.message || groqResponse.statusText}`
      });
    }

    const result = await groqResponse.json();
    
    // Log mantenuto per eventuale debug futuro
    console.log("PAYLOAD GROQ:", JSON.stringify(result, null, 2));

    if (!result.choices || !result.choices[0]?.message?.content) {
      return res.status(500).json({ error: 'Invalid response format from Groq. Controlla i log su Vercel.' });
    }

    return res.status(200).json({ analysis: result.choices[0].message.content });

  } catch (err) {
    return res.status(500).json({ error: `Server error: ${err.message}` });
  }
}