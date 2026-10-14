# Español A2 – práctica para el DELE A2

A static practice app for the DELE A2 Spanish exam (a requirement for Spanish citizenship):
vocabulary flashcards and quizzes, grammar exercises, reading comprehension, dictation
(using the browser's text-to-speech) and exam-style writing tasks.

No build step and no dependencies: everything lives in `static/`.

## Run locally

```
python server.py
```

Then open http://localhost:8002.

## Deploy

Every push to `main` publishes `static/` to GitHub Pages via `.github/workflows/pages.yml`.
In the repo settings, set **Pages → Build and deployment → Source** to **GitHub Actions**.

## Editing content

All exercises are in `static/data.json` (`vocab`, `grammar`, `reading`, `listening`, `writing`).
Progress is stored in the browser's localStorage.
