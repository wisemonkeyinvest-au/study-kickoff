/**
 * Study Kickoff — Blake & Tom
 * Static SPA: splash → pick → pitch → questionnaire wizard → hand to Dad
 */
(function () {
  "use strict";

  const STUDENTS = {
    blake: { id: "blake", name: "Blake", year: "11", initial: "B" },
    tom: { id: "tom", name: "Tom", year: "12", initial: "T" },
  };

  const STORAGE_PREFIX = "study-kickoff:v1:";

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

  // —— state ——
  let state = {
    view: "splash", // splash | pitch | wizard | review | done
    studentId: null,
    sectionIndex: 0,
    answers: null,
  };

  const app = document.getElementById("app");

  // —— storage ——
  function storageKey(id) {
    return STORAGE_PREFIX + id;
  }

  function loadAnswers(id) {
    try {
      const raw = localStorage.getItem(storageKey(id));
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function saveAnswers(id, answers) {
    localStorage.setItem(storageKey(id), JSON.stringify(answers));
  }

  function pickStudent(id) {
    const student = STUDENTS[id];
    if (!student) return;
    const saved = loadAnswers(id);
    const answers = saved
      ? { ...emptyAnswers(student), ...saved }
      : emptyAnswers(student);
    // Prefill name/year if blank
    if (!answers.name) answers.name = student.name;
    if (!answers.year) answers.year = student.year;
    state.studentId = id;
    state.answers = answers;
    state.sectionIndex = 0;
    state.view = "pitch";
    render();
  }

  function persist() {
    if (state.studentId && state.answers) {
      saveAnswers(state.studentId, state.answers);
    }
  }

  // —— markdown export (matches Doc structure) ——
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

  async function copyMarkdown() {
    const student = STUDENTS[state.studentId];
    const md = toMarkdown(student, state.answers);
    try {
      await navigator.clipboard.writeText(md);
      showToast("Copied — hand this to Dad");
    } catch {
      // Fallback: prompt select
      const ta = document.createElement("textarea");
      ta.value = md;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        showToast("Copied — hand this to Dad");
      } catch {
        showToast("Couldn’t copy — select & copy manually");
        alert(md);
      }
      document.body.removeChild(ta);
    }
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

  // —— helpers ——
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
    const back =
      showBack
        ? `<button type="button" class="back-link" data-action="${esc(backAction)}">← Back</button>`
        : `<span></span>`;
    const chip = s
      ? `<span class="student-chip">${esc(s.name)} · Year ${esc(state.answers?.year || s.year)}</span>`
      : "";
    return `<div class="top-bar">${back}${chip}</div>`;
  }

  // —— views ——
  function renderSplash() {
    const resume = Object.values(STUDENTS)
      .map((s) => {
        const saved = loadAnswers(s.id);
        const done = saved?.completedAt;
        const partial = saved && !done;
        let status = `Year ${s.year}`;
        if (done) status = `Year ${s.year} · done ✓`;
        else if (partial) status = `Year ${s.year} · in progress`;
        return { s, status, done };
      });

    return `
      <section class="screen splash">
        <div class="splash-mark" aria-hidden="true">SK</div>
        <h1>Study Kickoff</h1>
        <p class="lede">A quick pitch on how we’ll study, then a short questionnaire. One each — Blake and Tom.</p>
        <div class="pick-grid" role="list">
          ${resume
            .map(
              ({ s, status }) => `
            <button type="button" class="pick-card" data-pick="${s.id}" role="listitem">
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
        ${topBar(true, "home")}
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

          <article class="law-card">
            <div class="law-num">1</div>
            <div>
              <h3>Retrieval, not review</h3>
              <p>Close the notes. Try to pull it out of your head with no cues. Then check. Beats rereading every time.</p>
            </div>
          </article>
          <article class="law-card">
            <div class="law-num">2</div>
            <div>
              <h3>Spaced repetition</h3>
              <p>Come back when you’ve <em>almost</em> forgotten — not one giant cram the night before. We’ll set the next review before you finish each session.</p>
            </div>
          </article>
          <article class="law-card">
            <div class="law-num">3</div>
            <div>
              <h3>Interleaving</h3>
              <p>Mix problem types and topics. Ten of method A then ten of B feels smoother; mixed practice wins on the real paper.</p>
            </div>
          </article>
          <article class="law-card">
            <div class="law-num">4</div>
            <div>
              <h3>Active explanation</h3>
              <p>Close the book. Explain it out loud like you’re teaching someone. Spot the gaps. Understanding while reading ≠ being able to produce it.</p>
            </div>
          </article>
          <article class="law-card">
            <div class="law-num">5</div>
            <div>
              <h3>Build chunks, not facts</h3>
              <p>Organise ideas into meaningful schemas — like chess masters remember patterns, not single pieces. Not a pile of random flashcards.</p>
            </div>
          </article>

          <p class="section-label">Two ideas that explain why</p>
          <div class="idea-card">
            <h3>Storage strength vs retrieval strength</h3>
            <p>Something can be “in there” but hard to get out. Practice <em>getting it out</em> builds the skill exams actually test.</p>
          </div>
          <div class="idea-card">
            <h3>The fluency illusion</h3>
            <p>If it feels easy to reread, your brain is lying that you know it. Struggle on purpose in practice so exam day is calmer.</p>
          </div>

          <p class="section-label">What this solves for you</p>
          <div class="solves">
            <ul>
              <li>Less “I studied for hours and still blanked”</li>
              <li>Clear next steps every session (not guesswork)</li>
              <li>Study that matches QLD Year 11 / 12 exam pressure</li>
              <li>Weak topics get named and attacked, not avoided</li>
            </ul>
          </div>

          <div class="bottom-line">
            <p>Bottom line: we make practice slightly harder on purpose so the exam feels fairer.</p>
          </div>
        </div>

        <div class="actions">
          <button type="button" class="btn btn-primary btn-block" data-action="start-quiz">I’m ready →</button>
          <button type="button" class="btn btn-ghost btn-block" data-action="home">Switch person</button>
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
      .map((id) => Q9_OPTS.find((x) => x.id === id)?.label)
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

        <div class="review-card">
          <h3>About you</h3>
          ${reviewRow("Name", a.name)}
          ${reviewRow("Year", a.year)}
          ${reviewRow("Pathway notes", a.pathway)}
        </div>
        <div class="review-card">
          <h3>Subjects</h3>
          ${reviewRow("Subjects", a.subjects)}
          ${reviewRow("Worry most", a.worry)}
          ${reviewRow("Weak topics", a.weakTopics)}
        </div>
        <div class="review-card">
          <h3>How you study</h3>
          ${reviewRow("Usually do first", a.firstThing)}
          ${reviewRow("Mostly…", habits)}
          ${reviewRow("Check memory", checks)}
          ${reviewRow("Longest gap", a.longestGap)}
        </div>
        <div class="review-card">
          <h3>Goals & blockers</h3>
          ${reviewRow("Want exams to feel like", a.examFeel)}
          ${reviewRow("Derails session", a.derails)}
          ${reviewRow("Focus block", a.focusBlock)}
          ${reviewRow("Anything else", a.anythingElse)}
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
          <button type="button" class="btn btn-secondary btn-block" data-action="edit-answers">Edit answers</button>
          <button type="button" class="btn btn-ghost btn-block" data-action="home">Done · back to start</button>
        </div>
        ${footer()}
      </section>`;
  }

  function render() {
    let html = "";
    switch (state.view) {
      case "splash":
        html = renderSplash();
        break;
      case "pitch":
        html = renderPitch();
        break;
      case "wizard":
        html = renderWizard();
        break;
      case "review":
        html = renderReview();
        break;
      case "done":
        html = renderDone();
        break;
      default:
        html = renderSplash();
    }
    app.innerHTML = html;
    window.scrollTo(0, 0);
  }

  // —— collect form fields from current DOM into state ——
  function collectFields() {
    if (!state.answers) return;
    app.querySelectorAll("[data-field]").forEach((el) => {
      const key = el.getAttribute("data-field");
      state.answers[key] = el.value;
    });

    // checkboxes
    const habitBoxes = app.querySelectorAll('[data-check="studyHabits"]');
    if (habitBoxes.length) {
      state.answers.studyHabits = [...habitBoxes]
        .filter((c) => c.checked)
        .map((c) => c.value);
    }
    const memBoxes = app.querySelectorAll('[data-check="checkMemory"]');
    if (memBoxes.length) {
      state.answers.checkMemory = [...memBoxes]
        .filter((c) => c.checked)
        .map((c) => c.value);
    }
    persist();
  }

  // —— events ——
  app.addEventListener("click", (e) => {
    const pick = e.target.closest("[data-pick]");
    if (pick) {
      pickStudent(pick.getAttribute("data-pick"));
      return;
    }

    const yearBtn = e.target.closest("[data-year]");
    if (yearBtn) {
      state.answers.year = yearBtn.getAttribute("data-year");
      persist();
      render();
      return;
    }

    const actionEl = e.target.closest("[data-action]");
    if (!actionEl) return;
    const action = actionEl.getAttribute("data-action");

    if (state.view === "wizard") collectFields();

    switch (action) {
      case "home":
        state.view = "splash";
        state.studentId = null;
        state.answers = null;
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
        if (state.sectionIndex < SECTIONS.length - 1) {
          state.sectionIndex += 1;
          render();
        }
        break;
      case "prev-section":
        if (state.sectionIndex > 0) {
          state.sectionIndex -= 1;
          render();
        }
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
        // clear completed flag so splash shows in-progress
        if (state.answers) {
          state.answers.completedAt = null;
          persist();
        }
        render();
        break;
      case "submit":
        state.answers.completedAt = new Date().toISOString();
        persist();
        state.view = "done";
        render();
        break;
      case "copy-md":
        copyMarkdown();
        break;
    }
  });

  // Live-save on input / checkbox change
  app.addEventListener("input", (e) => {
    const field = e.target.getAttribute("data-field");
    if (field && state.answers) {
      state.answers[field] = e.target.value;
      persist();
    }
  });

  app.addEventListener("change", (e) => {
    if (e.target.matches("[data-check]")) {
      collectFields();
      // Enable/disable Other text when Q8 other toggled
      if (e.target.value === "other" && e.target.getAttribute("data-check") === "studyHabits") {
        const otherInput = app.querySelector('[data-field="studyHabitsOther"]');
        if (otherInput) {
          otherInput.disabled = !e.target.checked;
          if (!e.target.checked) {
            otherInput.value = "";
            state.answers.studyHabitsOther = "";
            persist();
          }
        }
      }
    }
  });

  // Boot
  render();
})();
