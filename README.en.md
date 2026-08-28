# Everything Brainmap

Generate an interactive mind map from any concept, progressively expanding from a macro overview to specific details, helping beginners quickly establish cognitive frameworks and learning paths.

- **Backend**: Python + FastAPI, calls OpenAI API to generate structured Markdown outlines
- **Frontend**: Native HTML/JS + [markmap](https://markmap.js.org/), renders outlines into zoomable, expandable/collapsible tree-structured mind maps

## 1. Configure API Key

You need a **pay-as-you-go API Key** from the **OpenAI platform** (ChatGPT Plus/Pro subscriptions do not include API credits; you need to create a Key separately at [platform.openai.com](https://platform.openai.com/api-keys) and bind a payment method).

For security reasons, please **do this yourself** (do not share your key with anyone, including pasting it in chat):

```bash
cd backend
cp .env.example .env
```

Then open `backend/.env` with an editor and fill in your OpenAI API Key:

```
OPENAI_API_KEY=sk-xxxxxxxx
```

The default model is `gpt-4o`. If you want to switch to a cheaper model, add this line to `.env`:
```
BRAINMAP_MODEL=gpt-4o-mini
```

## 2. Start the Service

The virtual environment and dependencies are already installed. Just run:

```bash
cd backend
./venv/Scripts/python.exe -m uvicorn main:app --reload --port 8420
```

Then open http://127.0.0.1:8420 in your browser.

## 3. Usage

Type any concept in the input box (e.g., "options", "photosynthesis", "Transformer", "compound interest"), then press Enter or click "Generate Brain Map".

Mind map nodes expand by default. Click the node dot to collapse/expand child nodes. The toolbar in the bottom right allows you to zoom, center, and export.

## Project Structure

```
everything-brainmap/
  backend/
    main.py          FastAPI service: /api/brainmap endpoint + static frontend hosting
    requirements.txt
    .env.example      API key configuration template (.env itself is not committed)
  frontend/
    index.html
    app.js            Backend API calls + markmap rendering logic
    style.css
```

## Known Limitations / Future Enhancements

- Currently each generation is a fresh API call with no caching or history
- No multi-language support detection; the model typically responds in the same language as input
- Potential additions: export results as images/Markdown, history sidebar, secondary generation for deeper exploration of clicked nodes
