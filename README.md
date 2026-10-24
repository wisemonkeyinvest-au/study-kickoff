# Study Kickoff · Blake & Tom

Mobile-first study app for QLD Year 11/12 (desirable difficulties). Kickoff questionnaire, Practice sessions, and Dad-check briefs — method only (no fake past papers, no writing their assignments).

## Live app

**https://wisemonkeyinvest-au.github.io/study-kickoff/**

| Route | What |
|-------|------|
| `/` or `/#` | Home — Kickoff / Practice / Dad check |
| `/#kickoff` | Pitch + questionnaire → Copy Markdown |
| `/#practice` | Student practice (retrieval → mix → explain → chunks → spaced ± exam) |
| `/#dad` | Paste export, tick skipped laws, copy next-session brief |

## Local serve

```bash
cd study-kickoff
python3 -m http.server 8765
```

Open http://localhost:8765/

## How to use

1. **Blake / Tom — Kickoff:** Home → Kickoff → pick name → read the five laws → answer the questionnaire → **Copy answers as Markdown** for Dad / Study Enhancer.
2. **Blake / Tom — Practice:** Home → Practice → pick name → set subject/topic → work through the session closed-book → **Copy session as Markdown**. Optional Exam mode adds timed free-recall.
3. **Dad:** Home → Dad check (or from Practice) → paste their Markdown (or Load last copied export) → tick which of the five laws they’re still skipping → **Copy brief as Markdown**. Dad does not write answers for them.

## Persistence

localStorage keys:

- `study-kickoff:v1:blake|tom` — questionnaire answers
- `study-kickoff:v1:practice:blake|tom` — practice sessions
- `study-kickoff:v1:dad:…` — dad briefs
- `study-kickoff:v1:last-export` — last copied Markdown

## Files

- `index.html` + `styles.css` + `app.js` — GitHub Pages app
- `study-kickoff-standalone.html` — single-file mirror (phone / Drive)

Built for Study Enhancer.
