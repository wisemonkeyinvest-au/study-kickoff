/**
 * Study Kickoff — Blake & Tom
 * Hash routes: # (kickoff) | #practice | #dad
 * Splash → Kickoff (pitch + questionnaire) | Practice | Dad check
 */
(function () {
  "use strict";

  const STUDENTS = {
    blake: { id: "blake", name: "Blake", year: "11", initial: "B" },
    tom: { id: "tom", name: "Tom", year: "12", initial: "T" },
  };

  const STORAGE_PREFIX = "study-kickoff:v1:";
  const PRACTICE_PREFIX = "study-kickoff:v1:practice:";
  const DAD_PREFIX = "study-kickoff:v1:dad:";
  const LAST_EXPORT_KEY = "study-kickoff:v1:last-export";

  const Q8_OPTS = [
    { id: "reread", label: "Reread / highlight" },
    { id: "block", label: "Practice questions from one topic in a block" },
    { id: "mix", label: "Mix topics" },
    { id: "explain", label: "Explain things out loud" },
    { id: "cram", label: "Cram the night before" },
    { id: "other", label: "Other", hasOther: true },
  ];

  const Q9_OPTS = [
    { id: "class", label: "Only in class / tests" },
    { id: "after-reread", label: "After rereading" },
    { id: "closed", label: "Closed-book, from memory" },
    { id: "unsure", label: "Not sure" },
  ];

  const SECTIONS = [
    { id: "about", title: "About you", short: "About" },
    { id: "subjects", title: "Subjects", short: "Subjects" },
    { id: "study", title: "How you study", short: "Study habits" },
    { id: "goals", title: "Goals & blockers", short: "Goals" },
  ];

  const LAWS = [
    { id: "retrieval", num: 1, title: "Retrieval, not review", short: "Retrieval" },
    { id: "spaced", num: 2, title: "Spaced repetition", short: "Spaced" },
    { id: "interleave", num: 3, title: "Interleaving", short: "Interleaving" },
    { id: "explain", num: 4, title: "Active explanation", short: "Explain aloud" },
    { id: "chunks", num: 5, title: "Build chunks, not facts", short: "Chunks" },
  ];

  const PRACTICE_STEPS = [
    { id: "retrieval", title: "Closed-book retrieval", short: "Retrieve" },
    { id: "interleave", title: "Interleaved problems", short: "Mix" },
    { id: "explain", title: "Explain aloud", short: "Explain" },
    { id: "chunks", title: "Three chunk questions", short: "Chunks" },
    { id: "spaced", title: "Next spaced review", short: "Space" },
  ];

  const INTERLEAVE_PROMPTS = [
    "Write one problem or question that mixes two topics you listed. Solve it closed-book.",
    "Name a method from topic A that could apply to topic B. Sketch how.",
    "Without looking, list the first step you’d take on a mixed exam question that touches both subjects.",
    "What cue would tell you which topic a mixed question is really testing?",
    "Invent a short “trick” question that looks like one topic but needs another.",
  ];

  const emptyAnswers = (student) => ({
    name: student.name,
    year: student.year,
    pathway: "",
    subjects: "",
    worry: "",
    weakTopics: "",
    firstThing: "",
    studyHabits: [],
    studyHabitsOther: "",
    checkMemory: [],
    longestGap: "",
    examFeel: "",
    derails: "",
    focusBlock: "",
    anythingElse: "",
    completedAt: null,
  });

  const emptyPractice = () => ({
    subject: "",
    topic: "",
    retrieval: "",
    interleaveAnswers: ["", "", ""],
    interleavePrompts: [],
    explainMinutes: 2,
    explainTimerStarted: null,
    explainTimerSecs: 0,
    explainChecklist: { closed: false, taught: false, gaps: false },
    explainStuck: "",
    chunks: ["", "", ""],
    chunkAnswers: ["", "", ""],
    nextReview: "",
    nextReviewDays: 2,
    examMode: false,
    examMins: 10,
    examStarted: null,
    examSecsLeft: 0,
    examRecall: "",
    examGaps: "",
    completedAt: null,
  });

  const emptyDad = () => ({
    paste: "",
    studentId: null,
    skipping: [],
    notes: "",
    briefAt: null,
  });

  let state = {
    route: "home",
    view: "splash",
    studentId: null,
    sectionIndex: 0,
    answers: null,
    practiceStep: 0,
    practice: null,
    dad: emptyDad(),
    explainRunning: false,
    examRunning: false,
  };

  let explainInterval = null;
  let examInterval = null;

  const app = document.getElementById("app");

  function parseHash() {
    const h = (location.hash || "#").replace(/^#\/?/, "").toLowerCase();
    if (h === "practice" || h.startsWith("practice/")) return "practice";
    if (h === "dad" || h.startsWith("dad/")) return "dad";
    if (h === "kickoff" || h.startsWith("kickoff/")) return "kickoff";
    return "home";
  }

  function setHash(route) {
    const next =
      route === "home" ? "" : route === "kickoff" ? "#kickoff" : "#" + route;
    const cur = location.hash.replace(/^#/, "") ? location.hash : "";
    const want = next;
    if (cur !== want) {
      if (!want) {
        history.replaceState(null, "", location.pathname + location.search);
      } else {
        location.hash = want;
      }
    }
  }

  function applyRoute(route) {
    stopTimers();
    state.route = route;
    if (route === "home") {
      state.view = "splash";
      state.studentId = null;
      state.answers = null;
      state.practice = null;
    } else if (route === "kickoff") {
      state.view = "pick";
      state.studentId = null;
      state.answers = null;
    } else if (route === "practice") {
      state.view = "pick";
      state.studentId = null;
      state.practice = null;
    } else if (route === "dad") {
      state.view = "dad";
      const saved = loadDad(state.dad.studentId || "shared");
      state.dad = { ...emptyDad(), ...(saved || {}) };
      if (!state.dad.paste) {
        try {
          state.dad.paste = localStorage.getItem(LAST_EXPORT_KEY) || "";
        } catch (e) { /* ignore */ }
      }
    }
    render();
  }

  function storageKey(id) { return STORAGE_PREFIX + id; }

  function loadAnswers(id) {
    try {
      const raw = localStorage.getItem(storageKey(id));
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  function saveAnswers(id, answers) {
    localStorage.setItem(storageKey(id), JSON.stringify(answers));
  }

  function loadPractice(id) {
    try {
      const raw = localStorage.getItem(PRACTICE_PREFIX + id);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  function savePractice(id, data) {
    localStorage.setItem(PRACTICE_PREFIX + id, JSON.stringify(data));
  }

  function loadDad(id) {
    try {
      const raw = localStorage.getItem(DAD_PREFIX + (id || "shared"));
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  function saveDad(id, data) {
    localStorage.setItem(DAD_PREFIX + (id || "shared"), JSON.stringify(data));
  }

  function persistKickoff() {
    if (state.studentId && state.answers) saveAnswers(state.studentId, state.answers);
  }

  function persistPractice() {
    if (state.studentId && state.practice) savePractice(state.studentId, state.practice);
  }

  function persistDad() {
    saveDad(state.dad.studentId || "shared", state.dad);
  }

  function subjectListFromAnswers(answers) {
    if (!answers || !answers.subjects) return [];
    return answers.subjects
      .split(/\n/)
      .map((l) => l.replace(/^[-*•]\s*/, "").trim())
      .filter(Boolean);
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function pickStudentKickoff(id) {
    const student = STUDENTS[id];
    if (!student) return;
    const saved = loadAnswers(id);
    const answers = saved ? { ...emptyAnswers(student), ...saved } : emptyAnswers(student);
    if (!answers.name) answers.name = student.name;
    if (!answers.year) answers.year = student.year;
    state.studentId = id;
    state.answers = answers;
    state.sectionIndex = 0;
    state.view = "pitch";
    render();
  }

  function pickStudentPractice(id) {
    const student = STUDENTS[id];
    if (!student) return;
    const saved = loadPractice(id);
    const answers = loadAnswers(id);
    const practice = saved ? { ...emptyPractice(), ...saved } : emptyPractice();
    if (!practice.subject && answers) {
      const subs = subjectListFromAnswers(answers);
      if (subs.length) practice.subject = subs[0];
    }
    if (!practice.topic && answers && answers.weakTopics) {
      practice.topic = answers.weakTopics.split(/[,\n]/)[0].trim();
    }
    if (!practice.interleavePrompts || !practice.interleavePrompts.length) {
      practice.interleavePrompts = shuffle(INTERLEAVE_PROMPTS).slice(0, 3);
    }
    state.studentId = id;
    state.answers = answers ? { ...emptyAnswers(student), ...answers } : emptyAnswers(student);
    state.practice = practice;
    state.practiceStep = 0;
    state.view = "practice-hub";
    persistPractice();
    render();
  }

  function toMarkdown(student, a) {
    const habitLabels = (a.studyHabits || [])
      .map((id) => {
        const opt = Q8_OPTS.find((o) => o.id === id);
        if (!opt) return null;
        if (opt.hasOther) {
          const extra = (a.studyHabitsOther || "").trim();
          return `- [x] Other: ${extra || "—"}`;
        }
        return `- [x] ${opt.label}`;
      })
      .filter(Boolean);

    const uncheckedHabits = Q8_OPTS.filter(
      (o) => !(a.studyHabits || []).includes(o.id)
    ).map((o) =>
      o.hasOther ? `- [ ] Other: ___________` : `- [ ] ${o.label}`
    );

    const checkLabels = (a.checkMemory || [])
      .map((id) => {
        const opt = Q9_OPTS.find((o) => o.id === id);
        return opt ? `- [x] ${opt.label}` : null;
      })
      .filter(Boolean);

    const uncheckedCheck = Q9_OPTS.filter(
      (o) => !(a.checkMemory || []).includes(o.id)
    ).map((o) => `- [ ] ${o.label}`);

    const subjectsList = (a.subjects || "")
      .split(/\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => (l.startsWith("-") ? l : `- ${l}`))
      .join("\n");

    return `# Study Kickoff answers — ${a.name || student.name} (Year ${a.year || student.year})

## About you

1. **Name:** ${a.name || "—"}
2. **Year:** ${a.year || "—"}
3. **School / subject pathway notes:** ${a.pathway || "—"}

## Subjects

4. **Subjects this year:**
${subjectsList || "- —"}

5. **Which 1–2 subjects worry you most right now? Why?**
${a.worry || "—"}

6. **Which topics inside those subjects feel weakest?**
${a.weakTopics || "—"}

## How you study now

7. **When you sit down to study, what do you usually do first?**
${a.firstThing || "—"}

8. **Do you mostly…**
${[...habitLabels, ...uncheckedHabits].join("\n") || "—"}

9. **When do you usually check if you actually remember something?**
${[...checkLabels, ...uncheckedCheck].join("\n") || "—"}

10. **What’s the longest you’ve gone between studying the same topic?**
${a.longestGap || "—"}

## Goals & blockers

11. **What’s one thing you want exams to feel like (that they don’t feel like now)?**
${a.examFeel || "—"}

12. **What usually derails a study session?**
${a.derails || "—"}

13. **How long can you usually focus in one block before you need a break?**
${a.focusBlock || "—"}

14. **Anything you want this helper to know?**
${a.anythingElse || "—"}

---
Handed to Dad · Study Enhancer
`;
  }

  function summarisePracticeGaps(p) {
    const gaps = [];
    if (!(p.retrieval || "").trim()) gaps.push("- No retrieval written");
    if ((p.retrieval || "").trim().length < 40) gaps.push("- Retrieval looks thin — may need another pass");
    const emptyMix = (p.interleaveAnswers || []).filter((a) => !(a || "").trim()).length;
    if (emptyMix) gaps.push(`- ${emptyMix} interleaved prompt(s) unanswered`);
    if (!(p.explainStuck || "").trim()) gaps.push("- Didn’t note what stuck after explain-aloud");
    if (!p.explainChecklist || !p.explainChecklist.taught) gaps.push("- Explain-aloud checklist incomplete");
    const emptyChunks = (p.chunkAnswers || []).filter((a) => !(a || "").trim()).length;
    if (emptyChunks) gaps.push(`- ${emptyChunks} chunk answer(s) blank`);
    if (!(p.nextReview || "").trim()) gaps.push("- No next review date set");
    if (p.examMode && (p.examGaps || "").trim()) gaps.push(`- Exam gaps: ${p.examGaps.trim()}`);
    return gaps.length ? gaps.join("\n") : "- Session looks complete — check weak topics next time";
  }

  function practiceToMarkdown(student, p) {
    const prompts = p.interleavePrompts || [];
    const interleaveBlock = prompts
      .map((pr, i) => {
        const ans = (p.interleaveAnswers || [])[i] || "—";
        return `### Mix ${i + 1}\n**Prompt:** ${pr}\n**Answer:**\n${ans}`;
      })
      .join("\n\n");

    const chunkBlock = (p.chunks || [])
      .map((c, i) => {
        const ans = (p.chunkAnswers || [])[i] || "—";
        return `- **Chunk ${i + 1}:** ${c || "—"}\n  - Answer: ${ans}`;
      })
      .join("\n");

    const examBlock = p.examMode
      ? `
## Exam mode (timed free-recall)

**Recall under pressure:**
${p.examRecall || "—"}

**Gaps I marked:**
${p.examGaps || "—"}
`
      : "";

    return `# Practice session — ${student.name} (Year ${student.year})

**Subject:** ${p.subject || "—"}
**Topic:** ${p.topic || "—"}
**Completed:** ${p.completedAt || new Date().toISOString()}

## 1. Closed-book retrieval

${p.retrieval || "—"}

## 2. Interleaved (unlabelled mix)

${interleaveBlock || "—"}

## 3. Active explain aloud

- Checklist: closed book ${p.explainChecklist && p.explainChecklist.closed ? "✓" : "✗"} · taught aloud ${p.explainChecklist && p.explainChecklist.taught ? "✓" : "✗"} · named gaps ${p.explainChecklist && p.explainChecklist.gaps ? "✓" : "✗"}
- Timer target: ${p.explainMinutes || 2} min
- What stuck / what didn’t:
${p.explainStuck || "—"}

## 4. Three chunk questions

${chunkBlock || "—"}

## 5. Next spaced review

**Date:** ${p.nextReview || "—"} (${p.nextReviewDays || "?"} days out)
${examBlock}
## Gaps / weak spots (self-marked)

${summarisePracticeGaps(p)}

---
Handed to Dad · Study Enhancer · method only (no canned papers)
`;
  }

  function parseExportGaps(text) {
    const gaps = [];
    if (!text || !text.trim()) return ["No export pasted yet"];
    const weak = text.match(/weak(?:est)? topics?[^\n]*\n+([\s\S]*?)(?=\n##|\n---|\n\d+\.|$)/i);
    if (weak) {
      const body = weak[1].trim().slice(0, 400);
      if (body && body !== "—") gaps.push("Weak topics from export:\n" + body);
    }
    const worry = text.match(/worry you most[^\n]*\n+([\s\S]*?)(?=\n##|\n\d+\.|$)/i);
    if (worry) {
      const body = worry[1].trim().slice(0, 300);
      if (body && body !== "—") gaps.push("Worry subjects:\n" + body);
    }
    const gapSection = text.match(/## Gaps[^\n]*\n+([\s\S]*?)(?=\n##|\n---|$)/i);
    if (gapSection) {
      const body = gapSection[1].trim().slice(0, 500);
      if (body) gaps.push("Self-marked gaps:\n" + body);
    }
    if (/\[x\]\s*Reread/i.test(text)) gaps.push("- Still leaning on reread/highlight");
    if (/\[x\]\s*Cram/i.test(text)) gaps.push("- Cramming flagged");
    if (/\[ \]\s*Mix topics/i.test(text) && !/\[x\]\s*Mix topics/i.test(text))
      gaps.push("- Not mixing topics yet");
    if (/\[ \]\s*Explain/i.test(text) && !/\[x\]\s*Explain/i.test(text))
      gaps.push("- Not explaining out loud yet");
    if (/\[x\]\s*Only in class/i.test(text))
      gaps.push("- Memory checks mostly only in class/tests");
    if (!gaps.length) gaps.push("Couldn’t auto-extract gaps — skim the paste and tick laws below.");
    return gaps;
  }

  function dadBriefMarkdown(dad, gaps) {
    const skipping = LAWS.filter((l) => (dad.skipping || []).includes(l.id));
    const nameMatch = dad.paste && dad.paste.match(/—\s*([A-Za-z]+)\s*\(Year/i);
    const student =
      (dad.studentId && STUDENTS[dad.studentId] && STUDENTS[dad.studentId].name) ||
      (nameMatch && nameMatch[1]) ||
      "Student";

    const lawLines = skipping.length
      ? skipping.map((l) => `- **${l.num}. ${l.title}** — prioritise next session`).join("\n")
      : "- None ticked — reinforce all five lightly";

    const focus = skipping.length
      ? skipping.map((l) => l.short).join(", ")
      : "balanced retrieval + space + mix";

    return `# Next-session brief — ${student}

**For Dad / Study Enhancer** · method only (do not write their answers)

## Gaps / weak spots spotted
${gaps.map((g) => (g.startsWith("-") ? g : "- " + g.replace(/\n/g, "\n  "))).join("\n")}

## Laws still skipping
${lawLines}

## Next session (keep it short)
1. Closed-book retrieval on the weakest topic named above (5–8 min)
2. One interleaved mix across two listed subjects
3. Explain aloud 2 min, then note what stuck
4. Three chunk questions on that topic
5. Set the next spaced review before finishing

**Focus this week:** ${focus}

${dad.notes ? `## Dad notes\n${dad.notes}\n` : ""}---
Dad check · Study Kickoff
`;
  }

  async function copyText(md, toastMsg) {
    try {
      await navigator.clipboard.writeText(md);
      try { localStorage.setItem(LAST_EXPORT_KEY, md); } catch (e) { /* ignore */ }
      showToast(toastMsg || "Copied — hand this to Dad");
    } catch (err) {
      const ta = document.createElement("textarea");
      ta.value = md;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        try { localStorage.setItem(LAST_EXPORT_KEY, md); } catch (e2) { /* ignore */ }
        showToast(toastMsg || "Copied — hand this to Dad");
      } catch (e3) {
        showToast("Couldn’t copy — select & copy manually");
        alert(md);
      }
      document.body.removeChild(ta);
    }
  }

  async function copyKickoffMd() {
    await copyText(toMarkdown(STUDENTS[state.studentId], state.answers));
  }

  async function copyPracticeMd() {
    await copyText(practiceToMarkdown(STUDENTS[state.studentId], state.practice), "Practice copied — hand to Dad");
  }

  async function copyDadBrief() {
    const gaps = parseExportGaps(state.dad.paste);
    await copyText(dadBriefMarkdown(state.dad, gaps), "Brief copied");
  }

  let toastTimer;
  function showToast(msg) {
    let el = document.querySelector(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
  }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function footer() {
    return `<footer class="site-footer"><strong>Study Enhancer</strong> · for Blake &amp; Tom</footer>`;
  }

  function topBar(showBack, backAction) {
    const s = STUDENTS[state.studentId];
    const back = showBack
      ? `<button type="button" class="back-link" data-action="${esc(backAction)}">← Back</button>`
      : `<span></span>`;
    const chip = s
      ? `<span class="student-chip">${esc(s.name)} · Year ${esc((state.answers && state.answers.year) || s.year)}</span>`
      : "";
    return `<div class="top-bar">${back}${chip}</div>`;
  }

  function formatSecs(total) {
    const m = Math.floor(total / 60);
    const s = total % 60;
    return m + ":" + String(s).padStart(2, "0");
  }

  function stopTimers() {
    if (explainInterval) { clearInterval(explainInterval); explainInterval = null; }
    if (examInterval) { clearInterval(examInterval); examInterval = null; }
    state.explainRunning = false;
    state.examRunning = false;
  }

  function daysFromNow(days) {
    const d = new Date();
    d.setDate(d.getDate() + Number(days || 0));
    return d.toISOString().slice(0, 10);
  }

  function renderSplash() {
    return `
      <section class="screen splash">
        <div class="splash-mark" aria-hidden="true">SK</div>
        <h1>Study Kickoff</h1>
        <p class="lede">Desirable difficulties for Blake &amp; Tom. Pick a path.</p>
        <div class="mode-grid" role="list">
          <button type="button" class="mode-card" data-action="go-kickoff" role="listitem">
            <span class="mode-icon" aria-hidden="true">1</span>
            <span class="mode-body">
              <span class="mode-title">Kickoff</span>
              <span class="mode-desc">Pitch + questionnaire · hand Markdown to Dad</span>
            </span>
            <span class="pick-arrow" aria-hidden="true">→</span>
          </button>
          <button type="button" class="mode-card" data-action="go-practice" role="listitem">
            <span class="mode-icon mode-icon-practice" aria-hidden="true">P</span>
            <span class="mode-body">
              <span class="mode-title">Practice</span>
              <span class="mode-desc">Retrieval · mix · explain · chunks · spaced review</span>
            </span>
            <span class="pick-arrow" aria-hidden="true">→</span>
          </button>
          <button type="button" class="mode-card mode-card-secondary" data-action="go-dad" role="listitem">
            <span class="mode-icon mode-icon-dad" aria-hidden="true">D</span>
            <span class="mode-body">
              <span class="mode-title">Dad check</span>
              <span class="mode-desc">Paste their export · tick skipped laws · next-session brief</span>
            </span>
            <span class="pick-arrow" aria-hidden="true">→</span>
          </button>
        </div>
        ${footer()}
      </section>`;
  }

  function renderPick(forRoute) {
    const title = forRoute === "practice" ? "Who’s practising?" : "Who’s kicking off?";
    const lede =
      forRoute === "practice"
        ? "Same phone is fine — picks save under their name."
        : "One each — Blake and Tom.";
    const resume = Object.values(STUDENTS).map((s) => {
      if (forRoute === "practice") {
        const saved = loadPractice(s.id);
        const done = saved && saved.completedAt;
        let status = `Year ${s.year}`;
        if (done) status = `Year ${s.year} · last session ✓`;
        else if (saved) status = `Year ${s.year} · in progress`;
        return { s, status };
      }
      const saved = loadAnswers(s.id);
      const done = saved && saved.completedAt;
      const partial = saved && !done;
      let status = `Year ${s.year}`;
      if (done) status = `Year ${s.year} · done ✓`;
      else if (partial) status = `Year ${s.year} · in progress`;
      return { s, status };
    });

    const pickAttr = forRoute === "practice" ? "data-pick-practice" : "data-pick";

    return `
      <section class="screen splash">
        ${topBar(true, "home")}
        <div class="splash-mark" aria-hidden="true">${forRoute === "practice" ? "P" : "SK"}</div>
        <h1>${esc(title)}</h1>
        <p class="lede">${esc(lede)}</p>
        <div class="pick-grid" role="list">
          ${resume
            .map(
              ({ s, status }) => `
            <button type="button" class="pick-card" ${pickAttr}="${s.id}" role="listitem">
              <span class="pick-avatar" aria-hidden="true">${s.initial}</span>
              <span class="pick-meta">
                <span class="pick-name">${esc(s.name)}</span>
                <span class="pick-year">${esc(status)}</span>
              </span>
              <span class="pick-arrow" aria-hidden="true">→</span>
            </button>`
            )
            .join("")}
        </div>
        ${footer()}
      </section>`;
  }

  function renderPitch() {
    return `
      <section class="screen">
        ${topBar(true, "kickoff-pick")}
        <div class="screen-header">
          <p class="eyebrow">The pitch · read once</p>
          <h1>How we’ll study</h1>
          <p class="lede">Most study feels productive and isn’t. Here’s the short version.</p>
        </div>
        <div class="pitch-scroll">
          <div class="pitch-intro">
            <p>Rereading notes and highlighting feels smooth — that’s the <strong>fluency illusion</strong>. Easy ≠ known.</p>
            <p>What actually sticks is a bit uncomfortable. Psychologists call these <strong>desirable difficulties</strong> (Robert Bjork). They feel harder in the moment and lock memory in for exams.</p>
          </div>

          <p class="section-label">The five laws we’ll use</p>

          <article class="law-card"><div class="law-num">1</div><div><h3>Retrieval, not review</h3><p>Close the notes. Try to pull it out of your head with no cues. Then check. Beats rereading every time.</p></div></article>
          <article class="law-card"><div class="law-num">2</div><div><h3>Spaced repetition</h3><p>Come back when you’ve <em>almost</em> forgotten — not one giant cram the night before. We’ll set the next review before you finish each session.</p></div></article>
          <article class="law-card"><div class="law-num">3</div><div><h3>Interleaving</h3><p>Mix problem types and topics. Ten of method A then ten of B feels smoother; mixed practice wins on the real paper.</p></div></article>
          <article class="law-card"><div class="law-num">4</div><div><h3>Active explanation</h3><p>Close the book. Explain it out loud like you’re teaching someone. Spot the gaps. Understanding while reading ≠ being able to produce it.</p></div></article>
          <article class="law-card"><div class="law-num">5</div><div><h3>Build chunks, not facts</h3><p>Organise ideas into meaningful schemas — like chess masters remember patterns, not single pieces. Not a pile of random flashcards.</p></div></article>

          <p class="section-label">Two ideas that explain why</p>
          <div class="idea-card"><h3>Storage strength vs retrieval strength</h3><p>Something can be “in there” but hard to get out. Practice <em>getting it out</em> builds the skill exams actually test.</p></div>
          <div class="idea-card"><h3>The fluency illusion</h3><p>If it feels easy to reread, your brain is lying that you know it. Struggle on purpose in practice so exam day is calmer.</p></div>

          <p class="section-label">What this solves for you</p>
          <div class="solves"><ul>
            <li>Less “I studied for hours and still blanked”</li>
            <li>Clear next steps every session (not guesswork)</li>
            <li>Study that matches QLD Year 11 / 12 exam pressure</li>
            <li>Weak topics get named and attacked, not avoided</li>
          </ul></div>

          <div class="bottom-line"><p>Bottom line: we make practice slightly harder on purpose so the exam feels fairer.</p></div>
        </div>

        <div class="actions">
          <button type="button" class="btn btn-primary btn-block" data-action="start-quiz">I’m ready →</button>
          <button type="button" class="btn btn-ghost btn-block" data-action="kickoff-pick">Switch person</button>
        </div>
      </section>`;
  }

  function progressHtml() {
    const total = SECTIONS.length;
    const i = state.sectionIndex;
    const pct = Math.round(((i + 1) / total) * 100);
    const sec = SECTIONS[i];
    return `
      <div class="progress-wrap">
        <div class="progress-meta">
          <span>Step <strong>${i + 1}</strong> of ${total} · ${esc(sec.short)}</span>
          <span>${pct}%</span>
        </div>
        <div class="progress-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-fill" style="width:${pct}%"></div>
        </div>
      </div>`;
  }

  function practiceProgressHtml() {
    const total = PRACTICE_STEPS.length + (state.practice && state.practice.examMode ? 1 : 0);
    const i = state.practiceStep;
    const pct = Math.round(((i + 1) / Math.max(total, 1)) * 100);
    const label = i < PRACTICE_STEPS.length ? PRACTICE_STEPS[i].short : "Exam";
    return `
      <div class="progress-wrap">
        <div class="progress-meta">
          <span>Step <strong>${i + 1}</strong> of ${total} · ${esc(label)}</span>
          <span>${pct}%</span>
        </div>
        <div class="progress-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-fill" style="width:${pct}%"></div>
        </div>
      </div>`;
  }

  function checkListHtml(name, opts, selected, otherVal) {
    return `
      <div class="check-list" role="group" aria-label="${esc(name)}">
        ${opts
          .map((o) => {
            const checked = (selected || []).includes(o.id);
            const otherInput =
              o.hasOther
                ? `<div class="other-row"><input type="text" data-field="studyHabitsOther" placeholder="What else?" value="${esc(otherVal || "")}" ${checked ? "" : "disabled"} /></div>`
                : "";
            return `
              <label class="check-item${o.hasOther ? " other-row" : ""}">
                <input type="checkbox" data-check="${esc(name)}" value="${esc(o.id)}" ${checked ? "checked" : ""} />
                <span>${esc(o.label)}${o.hasOther ? ":" : ""}</span>
              </label>
              ${otherInput}`;
          })
          .join("")}
      </div>`;
  }

  function renderWizard() {
    const a = state.answers;
    const sec = SECTIONS[state.sectionIndex];
    let body = "";

    if (sec.id === "about") {
      body = `
        <div class="form-stack">
          <div class="field">
            <label for="f-name">1. Name</label>
            <input id="f-name" type="text" data-field="name" value="${esc(a.name)}" autocomplete="name" />
          </div>
          <div class="field">
            <span class="label" id="year-label">2. Year</span>
            <div class="year-toggle" role="group" aria-labelledby="year-label">
              <button type="button" class="year-opt" data-year="11" aria-pressed="${a.year === "11"}">Year 11</button>
              <button type="button" class="year-opt" data-year="12" aria-pressed="${a.year === "12"}">Year 12</button>
            </div>
          </div>
          <div class="field">
            <label for="f-pathway">3. School / subject pathway notes <span class="hint">(optional)</span></label>
            <textarea id="f-pathway" data-field="pathway" placeholder="e.g. ATAR pathway, Maths Methods…">${esc(a.pathway)}</textarea>
          </div>
        </div>`;
    } else if (sec.id === "subjects") {
      body = `
        <div class="form-stack">
          <div class="field">
            <label for="f-subjects">4. List every subject you’re doing this year</label>
            <p class="hint">And level if it matters (e.g. Math Methods / General). One per line is fine.</p>
            <textarea id="f-subjects" data-field="subjects" placeholder="English&#10;Math Methods&#10;…">${esc(a.subjects)}</textarea>
          </div>
          <div class="field">
            <label for="f-worry">5. Which 1–2 subjects worry you most right now? Why?</label>
            <textarea id="f-worry" data-field="worry" placeholder="Be honest — short answers are fine">${esc(a.worry)}</textarea>
          </div>
          <div class="field">
            <label for="f-weak">6. Which topics inside those subjects feel weakest?</label>
            <p class="hint">Be specific if you can.</p>
            <textarea id="f-weak" data-field="weakTopics" placeholder="e.g. trig identities, essay structure…">${esc(a.weakTopics)}</textarea>
          </div>
        </div>`;
    } else if (sec.id === "study") {
      body = `
        <div class="form-stack">
          <div class="field">
            <label for="f-first">7. When you sit down to study, what do you usually do first?</label>
            <p class="hint">e.g. reread notes, highlight, watch videos, do practice questions, make flashcards…</p>
            <textarea id="f-first" data-field="firstThing">${esc(a.firstThing)}</textarea>
          </div>
          <div class="field">
            <span class="label">8. Do you mostly… <span class="hint">(pick all that apply)</span></span>
            ${checkListHtml("studyHabits", Q8_OPTS, a.studyHabits, a.studyHabitsOther)}
          </div>
          <div class="field">
            <span class="label">9. When do you usually check if you actually remember something? <span class="hint">(pick all that apply)</span></span>
            ${checkListHtml("checkMemory", Q9_OPTS, a.checkMemory)}
          </div>
          <div class="field">
            <label for="f-gap">10. What’s the longest you’ve gone between studying the same topic?</label>
            <p class="hint">Rough guess is fine.</p>
            <input id="f-gap" type="text" data-field="longestGap" value="${esc(a.longestGap)}" placeholder="e.g. a few weeks, whole term…" />
          </div>
        </div>`;
    } else if (sec.id === "goals") {
      body = `
        <div class="form-stack">
          <div class="field">
            <label for="f-exam">11. What’s one thing you want exams to feel like (that they don’t feel like now)?</label>
            <textarea id="f-exam" data-field="examFeel">${esc(a.examFeel)}</textarea>
          </div>
          <div class="field">
            <label for="f-derail">12. What usually derails a study session?</label>
            <p class="hint">Phone, tired, don’t know where to start, etc.</p>
            <textarea id="f-derail" data-field="derails">${esc(a.derails)}</textarea>
          </div>
          <div class="field">
            <label for="f-focus">13. How long can you usually focus in one block before you need a break?</label>
            <input id="f-focus" type="text" data-field="focusBlock" value="${esc(a.focusBlock)}" placeholder="e.g. 20–25 mins" />
          </div>
          <div class="field">
            <label for="f-else">14. Anything you want this helper to know?</label>
            <p class="hint">Learning preferences, stress, subjects you already feel solid on…</p>
            <textarea id="f-else" data-field="anythingElse">${esc(a.anythingElse)}</textarea>
          </div>
        </div>`;
    }

    const isLast = state.sectionIndex === SECTIONS.length - 1;
    const backAction = state.sectionIndex === 0 ? "pitch" : "prev-section";

    return `
      <section class="screen">
        ${topBar(true, backAction)}
        ${progressHtml()}
        <div class="screen-header">
          <p class="eyebrow">Questionnaire</p>
          <h1>${esc(sec.title)}</h1>
          <p class="lede">Short answers are fine. Honest ones help more.</p>
        </div>
        ${body}
        <div class="actions">
          <div class="actions-row">
            <button type="button" class="btn btn-secondary btn-flex" data-action="${backAction === "pitch" ? "pitch" : "prev-section"}">Back</button>
            <button type="button" class="btn btn-primary btn-flex" data-action="${isLast ? "to-review" : "next-section"}">
              ${isLast ? "Review →" : "Next →"}
            </button>
          </div>
        </div>
      </section>`;
  }

  function reviewRow(q, a) {
    const text = (a || "").trim() || "—";
    return `<div class="review-row"><p class="review-q">${esc(q)}</p><p class="review-a">${esc(text)}</p></div>`;
  }

  function renderReview() {
    const a = state.answers;
    const habits = (a.studyHabits || [])
      .map((id) => {
        const o = Q8_OPTS.find((x) => x.id === id);
        if (!o) return null;
        if (o.hasOther) return `Other: ${(a.studyHabitsOther || "").trim() || "—"}`;
        return o.label;
      })
      .filter(Boolean)
      .join("; ");

    const checks = (a.checkMemory || [])
      .map((id) => Q9_OPTS.find((x) => x.id === id) && Q9_OPTS.find((x) => x.id === id).label)
      .filter(Boolean)
      .join("; ");

    return `
      <section class="screen">
        ${topBar(true, "back-to-goals")}
        <div class="screen-header">
          <p class="eyebrow">Almost done</p>
          <h1>Review your answers</h1>
          <p class="lede">Looks good? Submit, then copy for Dad.</p>
        </div>
        <div class="review-card"><h3>About you</h3>
          ${reviewRow("Name", a.name)}${reviewRow("Year", a.year)}${reviewRow("Pathway notes", a.pathway)}
        </div>
        <div class="review-card"><h3>Subjects</h3>
          ${reviewRow("Subjects", a.subjects)}${reviewRow("Worry most", a.worry)}${reviewRow("Weak topics", a.weakTopics)}
        </div>
        <div class="review-card"><h3>How you study</h3>
          ${reviewRow("Usually do first", a.firstThing)}${reviewRow("Mostly…", habits)}${reviewRow("Check memory", checks)}${reviewRow("Longest gap", a.longestGap)}
        </div>
        <div class="review-card"><h3>Goals & blockers</h3>
          ${reviewRow("Want exams to feel like", a.examFeel)}${reviewRow("Derails session", a.derails)}${reviewRow("Focus block", a.focusBlock)}${reviewRow("Anything else", a.anythingElse)}
        </div>
        <div class="actions">
          <button type="button" class="btn btn-primary btn-block" data-action="submit">Looks good — submit</button>
          <button type="button" class="btn btn-secondary btn-block" data-action="edit-answers">Edit answers</button>
        </div>
      </section>`;
  }

  function renderDone() {
    const s = STUDENTS[state.studentId];
    return `
      <section class="screen">
        ${topBar(false)}
        <div class="done-banner">
          <div class="emoji" aria-hidden="true">✓</div>
          <h2>Hand this to Dad</h2>
          <p>Answers saved on this phone for ${esc(s.name)}. Copy the markdown so Study Enhancer can paste it.</p>
        </div>
        <div class="review-card">
          <h3>What happens next</h3>
          <ol style="margin:0;padding-left:1.2em;color:var(--muted);font-size:0.95rem;">
            <li style="margin-bottom:6px">Save your subjects and weak spots</li>
            <li style="margin-bottom:6px">Pick which of the five laws you’re skipping most</li>
            <li>Run a real session: closed-book retrieval → mixed practice → explain aloud → name the chunk → set the next spaced review</li>
          </ol>
          <p style="margin:12px 0 0;font-size:0.9rem;color:var(--muted);">No assignment writing. No fake past papers. Just the method that makes the work stick.</p>
        </div>
        <div class="actions">
          <button type="button" class="btn btn-primary btn-block" data-action="copy-md">Copy answers as Markdown</button>
          <button type="button" class="btn btn-secondary btn-block" data-action="go-practice-same">Start a practice session →</button>
          <button type="button" class="btn btn-ghost btn-block" data-action="edit-answers">Edit answers</button>
          <button type="button" class="btn btn-ghost btn-block" data-action="home">Done · back to start</button>
        </div>
        ${footer()}
      </section>`;
  }

  function renderPracticeHub() {
    const p = state.practice;
    const subs = subjectListFromAnswers(state.answers);
    const chips = subs
      .map(
        (s) =>
          `<button type="button" class="chip-pick${p.subject === s ? " active" : ""}" data-set-subject="${esc(s)}">${esc(s)}</button>`
      )
      .join("");

    return `
      <section class="screen">
        ${topBar(true, "practice-pick")}
        <div class="screen-header">
          <p class="eyebrow">Practice hub</p>
          <h1>Today’s session</h1>
          <p class="lede">Method only — you invent the prompts from memory. No canned papers.</p>
        </div>
        <div class="form-stack">
          <div class="field">
            <label for="p-subject">Subject</label>
            ${chips ? `<div class="chip-row">${chips}</div>` : ""}
            <input id="p-subject" type="text" data-pfield="subject" value="${esc(p.subject)}" placeholder="e.g. Math Methods" />
          </div>
          <div class="field">
            <label for="p-topic">Topic (be specific)</label>
            <input id="p-topic" type="text" data-pfield="topic" value="${esc(p.topic)}" placeholder="e.g. trig identities" />
          </div>
          <label class="check-item">
            <input type="checkbox" data-exam-toggle ${p.examMode ? "checked" : ""} />
            <span><strong>Exam mode</strong> — add a timed free-recall block at the end</span>
          </label>
        </div>
        <div class="review-card" style="margin-top:16px">
          <h3>Session flow</h3>
          <ol class="flow-list">
            <li>Closed-book retrieval</li>
            <li>Interleaved (mixed) prompts</li>
            <li>Explain aloud</li>
            <li>Three chunk questions</li>
            <li>Set next spaced review</li>
            ${p.examMode ? "<li>Exam mode · timed recall</li>" : ""}
          </ol>
        </div>
        <div class="actions">
          <button type="button" class="btn btn-primary btn-block" data-action="practice-start">Start practice →</button>
          <button type="button" class="btn btn-secondary btn-block" data-action="go-dad">Dad check instead</button>
          <button type="button" class="btn btn-ghost btn-block" data-action="home">Home</button>
        </div>
      </section>`;
  }

  function renderPracticeStep() {
    const p = state.practice;
    const stepId =
      state.practiceStep < PRACTICE_STEPS.length
        ? PRACTICE_STEPS[state.practiceStep].id
        : "exam";
    const title =
      stepId === "exam" ? "Exam mode" : PRACTICE_STEPS[state.practiceStep].title;
    let body = "";

    if (stepId === "retrieval") {
      body = `
        <div class="callout">Close your notes. Type everything you can recall about <strong>${esc(p.topic || "this topic")}</strong> in <strong>${esc(p.subject || "your subject")}</strong>.</div>
        <div class="field">
          <label for="p-retrieval">From memory</label>
          <textarea id="p-retrieval" data-pfield="retrieval" placeholder="Definitions, steps, examples, formulas… keep going until you’re stuck">${esc(p.retrieval)}</textarea>
        </div>
        <p class="hint">Then (off-app) check notes and mentally mark blanks — don’t paste the notes here.</p>`;
    } else if (stepId === "interleave") {
      const prompts = p.interleavePrompts || [];
      body = `
        <div class="callout">Unlabelled mix — prompts don’t name which topic. Self-answer; invent the problem if needed.</div>
        ${prompts
          .map(
            (pr, i) => `
          <div class="review-card">
            <h3>Mix ${i + 1}</h3>
            <p class="mix-prompt">${esc(pr)}</p>
            <div class="field">
              <label for="mix-${i}">Your answer</label>
              <textarea id="mix-${i}" data-mix="${i}" placeholder="Sketch the question + your attempt">${esc((p.interleaveAnswers || [])[i] || "")}</textarea>
            </div>
          </div>`
          )
          .join("")}
        <button type="button" class="btn btn-ghost btn-block" data-action="reshuffle-mix">Shuffle new mix prompts</button>`;
    } else if (stepId === "explain") {
      const cl = p.explainChecklist || {};
      body = `
        <div class="callout">Explain <strong>${esc(p.topic || "the topic")}</strong> out loud like you’re teaching someone. Phone notes closed.</div>
        <div class="timer-card">
          <div class="timer-display" id="explain-timer">${formatSecs(p.explainTimerSecs || 0)}</div>
          <div class="field">
            <label for="explain-mins">Target minutes</label>
            <input id="explain-mins" type="number" min="1" max="15" data-pfield-num="explainMinutes" value="${esc(p.explainMinutes || 2)}" />
          </div>
          <div class="actions-row">
            <button type="button" class="btn btn-primary btn-flex" data-action="explain-toggle">${state.explainRunning ? "Pause" : "Start timer"}</button>
            <button type="button" class="btn btn-secondary btn-flex" data-action="explain-reset">Reset</button>
          </div>
        </div>
        <div class="check-list" style="margin-top:12px">
          <label class="check-item"><input type="checkbox" data-explain-check="closed" ${cl.closed ? "checked" : ""} /><span>Notes closed</span></label>
          <label class="check-item"><input type="checkbox" data-explain-check="taught" ${cl.taught ? "checked" : ""} /><span>Taught it out loud</span></label>
          <label class="check-item"><input type="checkbox" data-explain-check="gaps" ${cl.gaps ? "checked" : ""} /><span>Named where I blanked</span></label>
        </div>
        <div class="field" style="margin-top:12px">
          <label for="p-stuck">What stuck / what didn’t</label>
          <textarea id="p-stuck" data-pfield="explainStuck" placeholder="One sentence on solid bits, one on gaps">${esc(p.explainStuck)}</textarea>
        </div>`;
    } else if (stepId === "chunks") {
      body = `
        <div class="callout">Break <strong>${esc(p.topic || "the topic")}</strong> into three meaningful chunks (schemas), then answer each briefly.</div>
        ${[0, 1, 2]
          .map(
            (i) => `
          <div class="review-card">
            <div class="field">
              <label for="chunk-name-${i}">Chunk ${i + 1} name</label>
              <input id="chunk-name-${i}" type="text" data-chunk-name="${i}" value="${esc((p.chunks || [])[i] || "")}" placeholder="e.g. core definition / worked pattern / common trap" />
            </div>
            <div class="field">
              <label for="chunk-ans-${i}">Brief answer from memory</label>
              <textarea id="chunk-ans-${i}" data-chunk-ans="${i}" placeholder="2–4 sentences">${esc((p.chunkAnswers || [])[i] || "")}</textarea>
            </div>
          </div>`
          )
          .join("")}`;
    } else if (stepId === "spaced") {
      body = `
        <div class="callout">Come back when you’ve <em>almost</em> forgotten — not tonight’s cram.</div>
        <div class="field">
          <span class="label">In how many days?</span>
          <div class="chip-row">
            ${[1, 2, 3, 5, 7]
              .map(
                (d) =>
                  `<button type="button" class="chip-pick${Number(p.nextReviewDays) === d ? " active" : ""}" data-set-days="${d}">${d}d</button>`
              )
              .join("")}
          </div>
        </div>
        <div class="field">
          <label for="p-review">Next review date</label>
          <input id="p-review" type="date" data-pfield="nextReview" value="${esc(p.nextReview || daysFromNow(p.nextReviewDays || 2))}" />
        </div>
        <p class="hint">Tip: if today’s retrieval felt easy, push the date out; if you blanked hard, pull it closer.</p>`;
    } else if (stepId === "exam") {
      body = `
        <div class="callout warn">Timed free-recall under pressure. No notes. When time’s up, mark your own gaps — Dad won’t write answers for you.</div>
        <div class="timer-card">
          <div class="timer-display" id="exam-timer">${formatSecs(p.examSecsLeft || (p.examMins || 10) * 60)}</div>
          <div class="field">
            <label for="exam-mins">Minutes</label>
            <input id="exam-mins" type="number" min="3" max="45" data-pfield-num="examMins" value="${esc(p.examMins || 10)}" ${state.examRunning ? "disabled" : ""} />
          </div>
          <div class="actions-row">
            <button type="button" class="btn btn-primary btn-flex" data-action="exam-toggle">${state.examRunning ? "Pause" : "Start"}</button>
            <button type="button" class="btn btn-secondary btn-flex" data-action="exam-reset">Reset</button>
          </div>
        </div>
        <div class="field" style="margin-top:12px">
          <label for="exam-recall">Free-recall under the clock</label>
          <textarea id="exam-recall" data-pfield="examRecall" placeholder="Write as much as you can…">${esc(p.examRecall)}</textarea>
        </div>
        <div class="field">
          <label for="exam-gaps">Gaps I noticed (self-mark)</label>
          <textarea id="exam-gaps" data-pfield="examGaps" placeholder="What blanked? What felt shaky?">${esc(p.examGaps)}</textarea>
        </div>`;
    }

    const isLast =
      (p.examMode && stepId === "exam") || (!p.examMode && stepId === "spaced");
    const backAction = state.practiceStep === 0 ? "practice-hub" : "practice-prev";

    return `
      <section class="screen">
        ${topBar(true, backAction)}
        ${practiceProgressHtml()}
        <div class="screen-header">
          <p class="eyebrow">${esc(p.subject || "Practice")} · ${esc(p.topic || "topic")}</p>
          <h1>${esc(title)}</h1>
        </div>
        <div class="form-stack">${body}</div>
        <div class="actions">
          <div class="actions-row">
            <button type="button" class="btn btn-secondary btn-flex" data-action="${backAction}">Back</button>
            <button type="button" class="btn btn-primary btn-flex" data-action="${isLast ? "practice-finish" : "practice-next"}">
              ${isLast ? "Finish →" : "Next →"}
            </button>
          </div>
        </div>
      </section>`;
  }

  function renderPracticeDone() {
    const s = STUDENTS[state.studentId];
    const p = state.practice;
    return `
      <section class="screen">
        ${topBar(false)}
        <div class="done-banner">
          <div class="emoji" aria-hidden="true">✓</div>
          <h2>Session logged</h2>
          <p>${esc(s.name)} · ${esc(p.subject || "Subject")} · next review ${esc(p.nextReview || "—")}</p>
        </div>
        <div class="review-card">
          <h3>Self-marked gaps</h3>
          <pre class="gap-pre">${esc(summarisePracticeGaps(p))}</pre>
        </div>
        <div class="actions">
          <button type="button" class="btn btn-primary btn-block" data-action="copy-practice-md">Copy session as Markdown</button>
          <button type="button" class="btn btn-secondary btn-block" data-action="go-dad">Dad check →</button>
          <button type="button" class="btn btn-ghost btn-block" data-action="practice-hub">Another round</button>
          <button type="button" class="btn btn-ghost btn-block" data-action="home">Home</button>
        </div>
        ${footer()}
      </section>`;
  }

  function renderDad() {
    const dad = state.dad;
    const gaps = parseExportGaps(dad.paste);
    const brief = dad.paste.trim() ? dadBriefMarkdown(dad, gaps) : "";

    return `
      <section class="screen">
        ${topBar(true, "home")}
        <div class="screen-header">
          <p class="eyebrow">Dad check</p>
          <h1>Mark &amp; brief</h1>
          <p class="lede">Paste their Markdown export. Tick laws they’re still skipping. You don’t write their answers.</p>
        </div>
        <div class="form-stack">
          <div class="field">
            <span class="label">Student (optional)</span>
            <div class="year-toggle">
              <button type="button" class="year-opt" data-dad-student="blake" aria-pressed="${dad.studentId === "blake"}">Blake</button>
              <button type="button" class="year-opt" data-dad-student="tom" aria-pressed="${dad.studentId === "tom"}">Tom</button>
            </div>
          </div>
          <div class="field">
            <label for="dad-paste">Paste last Markdown export</label>
            <textarea id="dad-paste" data-dad-field="paste" placeholder="Paste Kickoff or Practice Markdown here…">${esc(dad.paste)}</textarea>
            <button type="button" class="btn btn-ghost" data-action="dad-load-last" style="align-self:flex-start;padding-left:0">Load last copied export</button>
          </div>
        </div>
        <div class="review-card">
          <h3>Gaps / weak spots</h3>
          <pre class="gap-pre">${esc(gaps.join("\n\n"))}</pre>
        </div>
        <p class="section-label">Laws still skipping</p>
        <div class="check-list">
          ${LAWS.map(
            (l) => `
            <label class="check-item">
              <input type="checkbox" data-dad-law="${l.id}" ${(dad.skipping || []).includes(l.id) ? "checked" : ""} />
              <span><strong>${l.num}. ${esc(l.title)}</strong></span>
            </label>`
          ).join("")}
        </div>
        <div class="field" style="margin-top:14px">
          <label for="dad-notes">Dad notes <span class="hint">(optional)</span></label>
          <textarea id="dad-notes" data-dad-field="notes" placeholder="Anything to remember for Study Enhancer…">${esc(dad.notes || "")}</textarea>
        </div>
        ${
          brief
            ? `<div class="review-card" style="margin-top:14px">
          <h3>Next-session brief</h3>
          <pre class="gap-pre brief-pre">${esc(brief)}</pre>
        </div>`
            : ""
        }
        <div class="actions">
          <button type="button" class="btn btn-primary btn-block" data-action="copy-dad-brief" ${brief ? "" : "disabled"}>Copy brief as Markdown</button>
          <button type="button" class="btn btn-secondary btn-block" data-action="dad-save">Save on this device</button>
          <button type="button" class="btn btn-ghost btn-block" data-action="go-practice">Back to Practice</button>
        </div>
        ${footer()}
      </section>`;
  }

  function render() {
    let html = "";
    switch (state.view) {
      case "splash": html = renderSplash(); break;
      case "pick": html = renderPick(state.route === "practice" ? "practice" : "kickoff"); break;
      case "pitch": html = renderPitch(); break;
      case "wizard": html = renderWizard(); break;
      case "review": html = renderReview(); break;
      case "done": html = renderDone(); break;
      case "practice-hub": html = renderPracticeHub(); break;
      case "practice-step": html = renderPracticeStep(); break;
      case "practice-done": html = renderPracticeDone(); break;
      case "dad": html = renderDad(); break;
      default: html = renderSplash();
    }
    app.innerHTML = html;
    window.scrollTo(0, 0);
  }

  function collectKickoffFields() {
    if (!state.answers) return;
    app.querySelectorAll("[data-field]").forEach((el) => {
      state.answers[el.getAttribute("data-field")] = el.value;
    });
    const habitBoxes = app.querySelectorAll('[data-check="studyHabits"]');
    if (habitBoxes.length) {
      state.answers.studyHabits = [...habitBoxes].filter((c) => c.checked).map((c) => c.value);
    }
    const memBoxes = app.querySelectorAll('[data-check="checkMemory"]');
    if (memBoxes.length) {
      state.answers.checkMemory = [...memBoxes].filter((c) => c.checked).map((c) => c.value);
    }
    persistKickoff();
  }

  function collectPracticeFields() {
    if (!state.practice) return;
    app.querySelectorAll("[data-pfield]").forEach((el) => {
      state.practice[el.getAttribute("data-pfield")] = el.value;
    });
    app.querySelectorAll("[data-pfield-num]").forEach((el) => {
      state.practice[el.getAttribute("data-pfield-num")] = Number(el.value) || 0;
    });
    app.querySelectorAll("[data-mix]").forEach((el) => {
      const i = Number(el.getAttribute("data-mix"));
      if (!state.practice.interleaveAnswers) state.practice.interleaveAnswers = ["", "", ""];
      state.practice.interleaveAnswers[i] = el.value;
    });
    app.querySelectorAll("[data-chunk-name]").forEach((el) => {
      const i = Number(el.getAttribute("data-chunk-name"));
      if (!state.practice.chunks) state.practice.chunks = ["", "", ""];
      state.practice.chunks[i] = el.value;
    });
    app.querySelectorAll("[data-chunk-ans]").forEach((el) => {
      const i = Number(el.getAttribute("data-chunk-ans"));
      if (!state.practice.chunkAnswers) state.practice.chunkAnswers = ["", "", ""];
      state.practice.chunkAnswers[i] = el.value;
    });
    persistPractice();
  }

  function collectDadFields() {
    app.querySelectorAll("[data-dad-field]").forEach((el) => {
      state.dad[el.getAttribute("data-dad-field")] = el.value;
    });
    persistDad();
  }

  function toggleExplainTimer() {
    collectPracticeFields();
    if (state.explainRunning) {
      stopExplainTimer(false);
      render();
      return;
    }
    state.explainRunning = true;
    if (explainInterval) clearInterval(explainInterval);
    explainInterval = setInterval(() => {
      state.practice.explainTimerSecs = (state.practice.explainTimerSecs || 0) + 1;
      const el = document.getElementById("explain-timer");
      if (el) el.textContent = formatSecs(state.practice.explainTimerSecs);
      const target = (state.practice.explainMinutes || 2) * 60;
      if (state.practice.explainTimerSecs >= target) {
        stopExplainTimer(false);
        showToast("Explain time’s up");
        const btn = app.querySelector('[data-action="explain-toggle"]');
        if (btn) btn.textContent = "Start timer";
      }
      persistPractice();
    }, 1000);
    render();
  }

  function stopExplainTimer(reset) {
    if (explainInterval) { clearInterval(explainInterval); explainInterval = null; }
    state.explainRunning = false;
    if (reset && state.practice) {
      state.practice.explainTimerSecs = 0;
      persistPractice();
    }
  }

  function toggleExamTimer() {
    collectPracticeFields();
    if (state.examRunning) {
      stopExamTimer(false);
      render();
      return;
    }
    if (!state.practice.examSecsLeft) {
      state.practice.examSecsLeft = (state.practice.examMins || 10) * 60;
    }
    state.examRunning = true;
    if (examInterval) clearInterval(examInterval);
    examInterval = setInterval(() => {
      state.practice.examSecsLeft = Math.max(0, (state.practice.examSecsLeft || 0) - 1);
      const el = document.getElementById("exam-timer");
      if (el) el.textContent = formatSecs(state.practice.examSecsLeft);
      if (state.practice.examSecsLeft <= 0) {
        stopExamTimer(false);
        showToast("Time’s up — mark your gaps");
        const btn = app.querySelector('[data-action="exam-toggle"]');
        if (btn) btn.textContent = "Start";
      }
      persistPractice();
    }, 1000);
    render();
  }

  function stopExamTimer(reset) {
    if (examInterval) { clearInterval(examInterval); examInterval = null; }
    state.examRunning = false;
    if (reset && state.practice) {
      state.practice.examSecsLeft = (state.practice.examMins || 10) * 60;
      persistPractice();
    }
  }

  app.addEventListener("click", (e) => {
    const pick = e.target.closest("[data-pick]");
    if (pick) { pickStudentKickoff(pick.getAttribute("data-pick")); return; }
    const pickP = e.target.closest("[data-pick-practice]");
    if (pickP) { pickStudentPractice(pickP.getAttribute("data-pick-practice")); return; }

    const yearBtn = e.target.closest("[data-year]");
    if (yearBtn && state.answers) {
      state.answers.year = yearBtn.getAttribute("data-year");
      persistKickoff();
      render();
      return;
    }

    const dadStu = e.target.closest("[data-dad-student]");
    if (dadStu) {
      state.dad.studentId = dadStu.getAttribute("data-dad-student");
      persistDad();
      render();
      return;
    }

    const setSub = e.target.closest("[data-set-subject]");
    if (setSub && state.practice) {
      state.practice.subject = setSub.getAttribute("data-set-subject");
      persistPractice();
      render();
      return;
    }

    const setDays = e.target.closest("[data-set-days]");
    if (setDays && state.practice) {
      collectPracticeFields();
      const d = Number(setDays.getAttribute("data-set-days"));
      state.practice.nextReviewDays = d;
      state.practice.nextReview = daysFromNow(d);
      persistPractice();
      render();
      return;
    }

    const actionEl = e.target.closest("[data-action]");
    if (!actionEl) return;
    const action = actionEl.getAttribute("data-action");

    if (state.view === "wizard") collectKickoffFields();
    if (state.view === "practice-hub" || state.view === "practice-step") collectPracticeFields();
    if (state.view === "dad") collectDadFields();

    switch (action) {
      case "home":
        stopTimers();
        setHash("home");
        applyRoute("home");
        break;
      case "go-kickoff":
        setHash("kickoff");
        applyRoute("kickoff");
        break;
      case "go-practice":
        setHash("practice");
        applyRoute("practice");
        break;
      case "go-practice-same": {
        const id = state.studentId;
        setHash("practice");
        state.route = "practice";
        if (id) pickStudentPractice(id);
        else applyRoute("practice");
        break;
      }
      case "go-dad":
        setHash("dad");
        applyRoute("dad");
        break;
      case "kickoff-pick":
        state.view = "pick";
        state.route = "kickoff";
        render();
        break;
      case "practice-pick":
        state.view = "pick";
        state.route = "practice";
        render();
        break;
      case "pitch":
        state.view = "pitch";
        render();
        break;
      case "start-quiz":
        state.view = "wizard";
        state.sectionIndex = 0;
        render();
        break;
      case "next-section":
        if (state.sectionIndex < SECTIONS.length - 1) { state.sectionIndex += 1; render(); }
        break;
      case "prev-section":
        if (state.sectionIndex > 0) { state.sectionIndex -= 1; render(); }
        break;
      case "to-review":
        state.view = "review";
        render();
        break;
      case "back-to-goals":
        state.view = "wizard";
        state.sectionIndex = SECTIONS.length - 1;
        render();
        break;
      case "edit-answers":
        state.view = "wizard";
        state.sectionIndex = 0;
        if (state.answers) { state.answers.completedAt = null; persistKickoff(); }
        render();
        break;
      case "submit":
        state.answers.completedAt = new Date().toISOString();
        persistKickoff();
        state.view = "done";
        render();
        break;
      case "copy-md": copyKickoffMd(); break;
      case "copy-practice-md": copyPracticeMd(); break;
      case "copy-dad-brief": copyDadBrief(); break;
      case "practice-hub":
        stopTimers();
        state.view = "practice-hub";
        render();
        break;
      case "practice-start":
        if (!state.practice.interleavePrompts || !state.practice.interleavePrompts.length) {
          state.practice.interleavePrompts = shuffle(INTERLEAVE_PROMPTS).slice(0, 3);
        }
        if (!state.practice.nextReview) {
          state.practice.nextReview = daysFromNow(state.practice.nextReviewDays || 2);
        }
        state.practiceStep = 0;
        state.view = "practice-step";
        persistPractice();
        render();
        break;
      case "practice-next":
        stopTimers();
        state.practiceStep += 1;
        state.view = "practice-step";
        render();
        break;
      case "practice-prev":
        stopTimers();
        if (state.practiceStep > 0) state.practiceStep -= 1;
        state.view = "practice-step";
        render();
        break;
      case "practice-finish":
        stopTimers();
        state.practice.completedAt = new Date().toISOString();
        persistPractice();
        state.view = "practice-done";
        render();
        break;
      case "reshuffle-mix":
        state.practice.interleavePrompts = shuffle(INTERLEAVE_PROMPTS).slice(0, 3);
        state.practice.interleaveAnswers = ["", "", ""];
        persistPractice();
        render();
        break;
      case "explain-toggle": toggleExplainTimer(); break;
      case "explain-reset": stopExplainTimer(true); render(); break;
      case "exam-toggle": toggleExamTimer(); break;
      case "exam-reset": stopExamTimer(true); render(); break;
      case "dad-load-last":
        try { state.dad.paste = localStorage.getItem(LAST_EXPORT_KEY) || state.dad.paste; } catch (err) { /* ignore */ }
        persistDad();
        render();
        break;
      case "dad-save":
        state.dad.briefAt = new Date().toISOString();
        persistDad();
        showToast("Dad check saved");
        break;
    }
  });

  app.addEventListener("input", (e) => {
    const field = e.target.getAttribute("data-field");
    if (field && state.answers) { state.answers[field] = e.target.value; persistKickoff(); }
    const pf = e.target.getAttribute("data-pfield");
    if (pf && state.practice) { state.practice[pf] = e.target.value; persistPractice(); }
    const pfn = e.target.getAttribute("data-pfield-num");
    if (pfn && state.practice) { state.practice[pfn] = Number(e.target.value) || 0; persistPractice(); }
    const mix = e.target.getAttribute("data-mix");
    if (mix != null && state.practice) {
      if (!state.practice.interleaveAnswers) state.practice.interleaveAnswers = ["", "", ""];
      state.practice.interleaveAnswers[Number(mix)] = e.target.value;
      persistPractice();
    }
    const cn = e.target.getAttribute("data-chunk-name");
    if (cn != null && state.practice) {
      if (!state.practice.chunks) state.practice.chunks = ["", "", ""];
      state.practice.chunks[Number(cn)] = e.target.value;
      persistPractice();
    }
    const ca = e.target.getAttribute("data-chunk-ans");
    if (ca != null && state.practice) {
      if (!state.practice.chunkAnswers) state.practice.chunkAnswers = ["", "", ""];
      state.practice.chunkAnswers[Number(ca)] = e.target.value;
      persistPractice();
    }
    const df = e.target.getAttribute("data-dad-field");
    if (df) {
      state.dad[df] = e.target.value;
      persistDad();
      if (df === "paste") {
        const t = e.target;
        const pos = t.selectionStart;
        render();
        const again = app.querySelector("#dad-paste");
        if (again) {
          again.focus();
          try { again.setSelectionRange(pos, pos); } catch (err) { /* ignore */ }
        }
      }
    }
  });

  app.addEventListener("change", (e) => {
    if (e.target.matches("[data-check]")) {
      collectKickoffFields();
      if (e.target.value === "other" && e.target.getAttribute("data-check") === "studyHabits") {
        const otherInput = app.querySelector('[data-field="studyHabitsOther"]');
        if (otherInput) {
          otherInput.disabled = !e.target.checked;
          if (!e.target.checked) {
            otherInput.value = "";
            state.answers.studyHabitsOther = "";
            persistKickoff();
          }
        }
      }
    }
    if (e.target.matches("[data-exam-toggle]") && state.practice) {
      state.practice.examMode = e.target.checked;
      persistPractice();
      render();
    }
    if (e.target.matches("[data-explain-check]") && state.practice) {
      const key = e.target.getAttribute("data-explain-check");
      if (!state.practice.explainChecklist) state.practice.explainChecklist = {};
      state.practice.explainChecklist[key] = e.target.checked;
      persistPractice();
    }
    if (e.target.matches("[data-dad-law]")) {
      const id = e.target.getAttribute("data-dad-law");
      const set = new Set(state.dad.skipping || []);
      if (e.target.checked) set.add(id);
      else set.delete(id);
      state.dad.skipping = [...set];
      persistDad();
      render();
    }
  });

  window.addEventListener("hashchange", () => {
    const route = parseHash();
    if (route !== state.route) applyRoute(route);
  });

  applyRoute(parseHash());
})();
