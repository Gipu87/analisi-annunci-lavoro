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

  // Rimuove solo il rumore strutturale fisso di LinkedIn
  const cleanNoise = (fullText) => {
    const lines = fullText.split('\n');
    const cleaned = [];
    let skipSection = false;

    // ESCLUDIAMO 'table of contents' dai blocchi che attivano lo skipSection
    const sectionStops = [
      'similar jobs', 'people also viewed', 'similar searches',
      'explore top content'
    ];
    
    // REGEX BLINDATA: intercetta i link dell'indice, le immagini e le righe divisorie ---
    const noiseLine = /^(?:-\s*)?\[.*\]\(.*\)$|^!\[.*\]\(.*\)$|^---+$/i;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      const lower = trimmed.toLowerCase();

      // Mantiene l'intestazione Table of Contents se c'è, ma non attiva il blocco
      if (lower.includes('table of contents')) {
          continue; 
      }

      const isRealHeader = /^#{1,3}\s/.test(trimmed); 

      // Se troviamo un vero titolo h1/h2/h3 che coincide con le sezioni da scartare, attiviamo il blocco
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
    return res.status(400).json({ 
      error: "L'annuncio non sembra contenere le informazioni essenziali per un'analisi approfondita." 
    });
  }

  const systemPrompt = `Sei un analista onesto e diretto di annunci di lavoro. Il tuo scopo è evidenziare punti di forza reali e criticità nascoste nel gergo aziendale, senza esagerare o accusare senza prove.
Regole tassative:
- NESSUNA FORMATTAZIONE MARKDOWN. Assolutamente vietati asterischi (*) o grassetti. Testo piatto.
- LINGUA: Rispondi solo e unicamente in italiano.
- TONO: Diretto e onesto, ma equilibrato. Se l'annuncio è valido, dillo chiaramente. Se ha problemi, segnalali senza accusare di frode o malafede se non ci sono prove certe.

Output richiesto (scrivi solo queste tre voci, in questo esatto ordine e formato):
Sintesi: [descrizione chiara e reale del ruolo, spogliato dal marketing aziendale, zero nomi aziendali]
Red Flag: [le 3 criticità principali o assenza di informazioni chiave. Sii specifico ma misurato. Vietato considerare come red flag l'assenza di dettagli sul "come candidarsi" o "link per candidarsi": su piattaforme come LinkedIn la candidatura avviene tramite un pulsante che non compare nel testo estratto, quindi questa non è un'ambiguità reale del datore di lavoro]
Verdetto: [Usa ESCLUSIVAMENTE Candidati oppure Rifiuta. Non usare mai parole come Negozia, Valuta, Considera.]. [Aggiungi una sola riga di motivazione chiara e onesta, senza accuse di truffa se non ci sono prove esplicite]`;

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
    
    console.log("PAYLOAD GROQ:", JSON.stringify(result, null, 2));

    if (!result.choices || !result.choices[0]?.message?.content) {
      return res.status(500).json({ error: 'Invalid response format from Groq. Controlla i log su Vercel.' });
    }

    return res.status(200).json({ analysis: result.choices[0].message.content });

  } catch (err) {
    return res.status(500).json({ error: `Server error: ${err.message}` });
  }
}
