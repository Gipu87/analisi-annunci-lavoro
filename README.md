# Analisi Annunci di Lavoro

Una web app minimale e gratuita che analizza gli annunci di lavoro con uno stile cinico e spietato, identificando red flag contrattuali italiane.

## Come Funziona

1. **Input**: Incolla il link dell'annuncio LinkedIn
2. **Estrazione**: Microlink converte l'annuncio in Markdown
3. **Analisi**: Hugging Face (Mistral 7B) lo analizza con il "Motore Cinico"
4. **Output**: Ricevi l'analisi con dati estratti, red flag, e verdetto finale

## Stack

- **Frontend**: React + Tailwind CSS
- **Estrazione**: Microlink.io (gratuito, 25 req/giorno per IP)
- **IA**: Hugging Face Inference API + Mistral 7B (gratuito)
- **Hosting**: Vercel (gratuito)

## Setup Locale

### Prerequisiti
- Node.js 16+
- npm o yarn
- Un account Hugging Face (gratuito) con API key

### Installazione

```bash
git clone https://github.com/[TUO_USERNAME]/analisi-annunci-lavoro
cd analisi-annunci-lavoro
npm install
```

### Configurazione

1. Crea un file `.env.local` nella root:
```
REACT_APP_HF_API_KEY=YOUR_HF_API_KEY_HERE
```

2. Avvia in locale:
```bash
npm start
```

L'app si apre su `http://localhost:3000`

## Deploy su Vercel

### Step 1: Crea un repository GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/[TUO_USERNAME]/analisi-annunci-lavoro.git
git push -u origin main
```

### Step 2: Collega Vercel

1. Vai su [vercel.com](https://vercel.com)
2. Accedi con GitHub
3. Clicca "Add New" → "Project"
4. Seleziona il repo `analisi-annunci-lavoro`
5. Nella sezione "Environment Variables", aggiungi:
   - **Name**: `REACT_APP_HF_API_KEY`
   - **Value**: `YOUR_HF_API_KEY_HERE`
6. Clicca "Deploy"

Finito. La app è live su `https://analisi-annunci-lavoro.vercel.app`

## Limitazioni

- **Microlink**: 25 richieste/giorno per IP (controlla il limite)
- **Hugging Face**: Gratuito, ma lento (5-10 secondi per analisi) e con rate limit
- **Siti bloccati**: LinkedIn e alcuni siti possono bloccare il fetching diretto (fallback: copia-incolla il testo)

## Come Funziona il "Motore Cinico"

Il system prompt (in `motore-cinico-annunci.md`) governa l'IA per:

1. **Estrarre dati oggettivi**: RAL, tipo contratto, mansioni, orari
2. **Smontare la retorica**: Ignorare gli slogan corporate
3. **Identificare red flag**: P.IVA camuffate, apprendistati abusivi, mansioni moltiplicate
4. **Verdetto finale**: Una frase chiara sul da farsi

## Troubleshooting

### "HF_API_KEY non configurata"
Verifica che il file `.env.local` esista nella root e contenga la corretta API key di Hugging Face.

### "Microlink error" o URL non valido
Alcuni siti bloccano il fetching. Prova a copiare il testo dell'annuncio e incollarlo direttamente (feature future).

### L'analisi è lenta
Hugging Face ha rate limit sul free tier. Attendi qualche secondo tra le richieste.

## Licenza

MIT. Usa come vuoi, sotto la tua responsabilità.

## Contatti

Domande? Apri un issue su GitHub.

---

**Made with spite and Mistral 7B** 🔥
