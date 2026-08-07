import React, { useState } from 'react';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function JobAnalyzer() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState('idle'); // idle, fetching, analyzing, done

  const HF_API_KEY = process.env.REACT_APP_HF_API_KEY;
  const HF_MODEL = 'mistralai/Mistral-7B-Instruct-v0.2';

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

  const fetchMarkdown = async (jobUrl) => {
    try {
      setStep('fetching');
      setError('');
      
      const response = await fetch(`https://microlink.io?url=${encodeURIComponent(jobUrl)}`);
      if (!response.ok) throw new Error('Microlink error');
      
      const data = await response.json();
      
      if (!data.data || !data.data.text) {
        throw new Error('Could not extract text from URL');
      }
      
      return data.data.text;
    } catch (err) {
      throw new Error(`Extraction failed: ${err.message}`);
    }
  };

  const analyzeWithHF = async (text) => {
    try {
      setStep('analyzing');
      
      const messages = [
        {
          role: 'user',
          content: `Analizza questo annuncio di lavoro secondo il protocollo indicato:\n\n${text}`
        }
      ];

      const response = await fetch(
        `https://api-inference.huggingface.co/models/${HF_MODEL}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${HF_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: systemPrompt + '\n\nANNUNCIO DA ANALIZZARE:\n' + text,
            parameters: {
              max_new_tokens: 1024,
              temperature: 0.7,
              top_p: 0.9,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HF API error: ${errorData.error || response.statusText}`);
      }

      const result = await response.json();
      
      if (!Array.isArray(result) || !result[0]?.generated_text) {
        throw new Error('Invalid response format');
      }

      // Estrai solo la parte generata (scarta il prompt)
      const fullText = result[0].generated_text;
      const analysisStart = fullText.indexOf('ANNUNCIO DA ANALIZZARE:');
      if (analysisStart !== -1) {
        return fullText.substring(analysisStart + 'ANNUNCIO DA ANALIZZARE:'.length).trim();
      }
      
      return fullText;
    } catch (err) {
      throw new Error(`Analysis failed: ${err.message}`);
    }
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setError('Incolla un URL valido');
      return;
    }

    if (!HF_API_KEY) {
      setError('HF_API_KEY non configurata');
      return;
    }

    setLoading(true);
    setAnalysis('');
    setError('');

    try {
      const markdown = await fetchMarkdown(url);
      const result = await analyzeWithHF(markdown);
      setAnalysis(result);
      setStep('done');
    } catch (err) {
      setError(err.message);
      setStep('idle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Analisi Annunci di Lavoro
          </h1>
          <p className="text-slate-400 text-sm">
            Incolla il link dell'annuncio. Scopri le red flag prima di candidarti.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleAnalyze} className="mb-8">
          <div className="flex flex-col gap-3">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.linkedin.com/jobs/view/..."
              disabled={loading}
              className="w-full px-4 py-3 bg-slate-700 text-white placeholder-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-600 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {step === 'fetching' && 'Scarico markdown...'}
                  {step === 'analyzing' && 'Analizzo...'}
                </>
              ) : (
                'Analizza'
              )}
            </button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-lg flex gap-3">
            <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-red-300 text-sm">{error}</div>
          </div>
        )}

        {/* Analysis Result */}
        {analysis && (
          <div className="mb-6 p-6 bg-slate-700/50 border border-slate-600 rounded-lg">
            <div className="flex gap-2 mb-4">
              <CheckCircle2 size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
              <h2 className="text-lg font-semibold text-white">Analisi Completata</h2>
            </div>
            <div className="prose prose-invert max-w-none text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
              {analysis}
            </div>
          </div>
        )}

        {/* Info Footer */}
        <div className="mt-12 text-xs text-slate-500 border-t border-slate-700 pt-6">
          <p className="mb-2">
            <strong>Come funziona:</strong> L'annuncio viene scaricato via Microlink, analizzato da un modello open-source (Mistral 7B) su Hugging Face. Nessun dato è archiviato.
          </p>
          <p>
            <strong>Limite:</strong> 25 richieste/giorno per IP. Se esaurite, riprova domani.
          </p>
        </div>
      </div>
    </div>
  );
}
