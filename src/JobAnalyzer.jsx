import React, { useState } from 'react';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function JobAnalyzer() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState('idle'); // idle, fetching, analyzing, done

  const fetchMarkdown = async (jobUrl) => {
    try {
      setStep('fetching');
      setError('');

      const response = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(jobUrl)}&data.markdown.attr=markdown&meta=false`);
      if (!response.ok) throw new Error('Microlink error');

      const data = await response.json();

      if (!data.data || !data.data.markdown) {
        throw new Error('Could not extract text from URL');
      }

      return data.data.markdown;
    } catch (err) {
      throw new Error(`Extraction failed: ${err.message}`);
    }
  };

  const analyzeViaServerless = async (text) => {
    try {
      setStep('analyzing');

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Analysis failed');
      }

      return result.analysis;
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

    setLoading(true);
    setAnalysis('');
    setError('');

    try {
      const markdown = await fetchMarkdown(url);
      const result = await analyzeViaServerless(markdown);
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
            <strong>Come funziona:</strong> L'annuncio viene scaricato via Microlink e analizzato da Groq (Llama 3.3 70B). Nessun dato è archiviato.
          </p>
          <p>
            <strong>Limite:</strong> 25 richieste/giorno per IP su Microlink. Se esaurite, riprova domani.
          </p>
        </div>
      </div>
    </div>
  );
}
