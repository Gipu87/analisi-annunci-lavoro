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

  const systemPrompt = `Sei un analista cinico e brutale di annunci di lavoro. Il tuo scopo è smascherare la fuffa aziendale, il gergo tossico e le condizioni di sfruttamento nascoste.
Regole tassative:
- NESSUNA FORMATTAZIONE MARKDOWN. Assolutamente vietati asterischi (*) o grassetti. Testo piatto.
- LINGUA: Rispondi solo e unicamente in italiano.
- TONO: Spietato, diretto, zero diplomazia. Se l'annuncio è spazzatura, trattalo come tale.

Output richiesto (scrivi solo queste tre voci, in questo esatto ordine e formato):
Sintesi: [traduzione cruda e reale del ruolo, spogliato dal marketing aziendale]
Red Flag: [le 3 peggiori omissioni, frasi fatte o segnali di allarme. Sii specifico e tagliente]
Verdetto: [Scegli solo tra: Candidati / Fuggi / Rifiuta / Negozia col sangue]. [Aggiungi una sola riga di motivazione brutale e cinica. Zero pietà per chi nasconde la RAL]`;

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