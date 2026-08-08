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

  const cleanText = text
    .split('\n')
    .filter(line => line.trim().length > 0)
    .join('\n');

  const systemPrompt = `Analizza veloce. Output: 1 riga ruolo+RAL+contratto. 1 riga motivo valido/invalido. 1 riga verdetto (Candidati/Passa/Rifiuta/Negozia). Zero nomi aziendali.`;

  try {
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-saba-24b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: cleanText }
        ],
        max_tokens: 200,
        temperature: 0.5,
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
