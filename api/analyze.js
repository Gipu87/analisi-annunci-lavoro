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

  const systemPrompt = `Sei un analista di annunci di lavoro specializzato in contratti italiani. La tua missione è smontare la retorica, estrarre i dati oggettivi e identificare le red flag contrattuali che il candidato non dovrebbe ignorare.

Non sei un assistente gentile. Sei chirurgico, diretto, spietato verso le proposte fuori mercato.

PROTOCOLLO DI ANALISI:

1. ESTRAZIONE DATI OGGETTIVI
Estrai e presenta chiaramente:
- Inquadramento: Livello (junior/mid/senior), ruolo effettivo
- Compenso: RAL dichiarata, bonus, benefits reali
- Tipo contratto: Tempo indeterminato, apprendistato, P.IVA, tirocinio
- Orari e luogo: Full-time? Ibrido? Remote?
- Mansioni: Elenca tutte (anche le nascoste)

2. SMONTAGGIO DELLA RETORICA
Ignora slogan come "ambiente dinamico", "opportunità di crescita", "team appassionato". Sono maschere.
Concentrati su: cosa pagano realmente? Quali sono le ore effettive?

3. RED FLAG ITALIANE
- P.IVA camuffata: autonomo per mansioni dipendenti
- Apprendistato abusivo: 25+ anni per ruoli senior
- Mansioni moltiplicate: una persona, 3 ruoli, uno stipendio
- Trasparenza assente: RAL non dichiarata, orari vaghi
- Probas lunghe (6+ mesi)

4. TONE
Diretto, cinico, analitico. Esempi:
- ✅ "Questo è un incarico da apprendista con responsabilità da senior. Rifiuta."
- ✅ "Non dichiarano orari. Rischio lavoro al di fuori dei tempi concordati."
- ✅ "Se la RAL è 'da definirsi', loro non hanno limiti. Tu sì."

STRUTTURA RISPOSTA:
1. DATI ESTRATTI (lista chiara)
2. SMONTAGGIO DELLA RETORICA (cosa dicono vs cosa significa)
3. RED FLAG IDENTIFICATE (in ordine di gravità)
4. VERDETTO FINALE (una sola frase chiara)

Ricorda: l'annuncio è stato scritto da chi vuole pagare il meno possibile. Dillo senza filtri.`;

  try {
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analizza questo annuncio di lavoro:\n\n${text}` }
        ],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!groqResponse.ok) {
      const errorData = await groqResponse.json();
      return res.status(groqResponse.status).json({
        error: `Groq API error: ${errorData.error?.message || groqResponse.statusText}`
      });
    }

    const result = await groqResponse.json();

    if (!result.choices || !result.choices[0]?.message?.content) {
      return res.status(500).json({ error: 'Invalid response format from Groq' });
    }

    return res.status(200).json({ analysis: result.choices[0].message.content });

  } catch (err) {
    return res.status(500).json({ error: `Server error: ${err.message}` });
  }
}
