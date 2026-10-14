// DELE A2 Spanish practice app — vanilla JS, progress stored in localStorage.

const app = document.getElementById("app");
let DATA = null;

// ---------- storage ----------
const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  },
  set(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
};
function addStat(section, correct, total) {
  const stats = store.get("stats", {});
  const s = stats[section] ?? { correct: 0, total: 0 };
  stats[section] = { correct: s.correct + correct, total: s.total + total };
  store.set("stats", stats);
}
function statLine(section) {
  const s = store.get("stats", {})[section];
  return s && s.total ? `${Math.round((100 * s.correct) / s.total)}% de aciertos (${s.correct}/${s.total})` : "Sin empezar";
}

// ---------- helpers ----------
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
// Lowercase, strip accents and punctuation, so dictation is graded on the words themselves.
const normalize = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[¿?¡!.,;:«»"()]/g, " ").split(/\s+/).filter(Boolean);
const wordCount = (s) => s.trim().split(/\s+/).filter(Boolean).length;

// ---------- text-to-speech ----------
let esVoice = null;
function pickVoice() {
  const voices = speechSynthesis.getVoices();
  esVoice = voices.find((v) => v.lang === "es-ES") ?? voices.find((v) => v.lang.startsWith("es")) ?? null;
}
if ("speechSynthesis" in window) {
  pickVoice();
  speechSynthesis.onvoiceschanged = pickVoice;
}
function speak(text, rate = 0.9) {
  if (!("speechSynthesis" in window)) return alert("Tu navegador no permite leer texto en voz alta.");
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "es-ES";
  u.rate = rate;
  if (esVoice) u.voice = esVoice;
  speechSynthesis.speak(u);
}
const speakBtn = (text) => `<button class="speak" data-say="${esc(text)}" title="Escuchar">🔊</button>`;
function wireSpeak(root = app) {
  root.querySelectorAll("[data-say]").forEach((b) => {
    b.onclick = (e) => { e.stopPropagation(); speak(b.dataset.say); };
  });
}

// ---------- home ----------
function home() {
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  const vocabTotal = Object.values(DATA.vocab).reduce((n, w) => n + w.length, 0);
  app.innerHTML = `
    <div class="card">
      <h2>Prepara el DELE A2</h2>
      <p>El examen tiene cuatro pruebas: comprensión de lectura, comprensión auditiva, expresión escrita y expresión oral.
         Para aprobar necesitas al menos 30 de 50 puntos en cada grupo (lectura + escritura y audición + oral).</p>
      <p class="en">The exam has four parts: reading, listening, writing and speaking. You need at least 30/50 in each group (reading + writing, listening + speaking).</p>
    </div>
    <div class="grid">
      <div class="card"><h3>📚 Vocabulario</h3><p>${vocabTotal} palabras en ${Object.keys(DATA.vocab).length} temas</p>
        <p class="stat">${statLine("vocab")}</p><button class="primary" data-go="vocab">Empezar</button></div>
      <div class="card"><h3>✏️ Gramática</h3><p>${DATA.grammar.length} ejercicios</p>
        <p class="stat">${statLine("grammar")}</p><button class="primary" data-go="grammar">Empezar</button></div>
      <div class="card"><h3>📖 Lectura</h3><p>${DATA.reading.length} textos con preguntas</p>
        <p class="stat">${statLine("reading")}</p><button class="primary" data-go="reading">Empezar</button></div>
      <div class="card"><h3>🎧 Audición</h3><p>${DATA.listening.length} dictados</p>
        <p class="stat">${statLine("listening")}</p><button class="primary" data-go="listening">Empezar</button></div>
      <div class="card"><h3>📝 Escritura</h3><p>${DATA.writing.length} tareas tipo examen</p>
        <p class="stat">${store.get("writingDone", []).length} escritas</p><button class="primary" data-go="writing">Empezar</button></div>
      <div class="card"><h3>⚙️ Progreso</h3><p>Borra tus estadísticas y empieza de nuevo.</p>
        <button id="reset">Borrar progreso</button></div>
    </div>
    ${!("speechSynthesis" in window) || esVoice || !speechSynthesis.getVoices().length ? "" :
      `<div class="card en" style="display:block">No Spanish voice found on this device; audio may use a default voice. On Windows: Settings → Time & language → Speech → add a Spanish (Spain) voice.</div>`}`;

  const routes = { vocab: vocabMenu, grammar: grammarMenu, reading: readingMenu, listening: () => listening(shuffle(DATA.listening)), writing: writingMenu };
  app.querySelectorAll("[data-go]").forEach((b) => { b.onclick = routes[b.dataset.go]; });
  app.querySelector("#reset").onclick = () => {
    if (confirm("¿Borrar todo tu progreso?")) {
      ["stats", "writingDone", "drafts"].forEach((k) => localStorage.removeItem(k));
      home();
    }
  };
}

function resultCard(title, correct, total, again) {
  app.innerHTML = `
    <div class="card"><h2>${title}</h2>
      <p class="big">${correct}/${total}</p><p>respuestas correctas</p>
      <div class="row"><button id="again">Repetir</button><button class="primary" id="back">Volver al inicio</button></div>
    </div>`;
  app.querySelector("#again").onclick = again;
  app.querySelector("#back").onclick = home;
}

// ---------- vocabulary ----------
function vocabMenu() {
  const themes = Object.keys(DATA.vocab);
  app.innerHTML = `
    <div class="card"><h2>📚 Vocabulario</h2><p>Elige un tema y un modo.</p>
      <p><label><input type="radio" name="mode" value="cards" checked> Tarjetas</label>
         <label><input type="radio" name="mode" value="quiz"> Test (español → inglés)</label>
         <label><input type="radio" name="mode" value="quiz-rev"> Test (inglés → español)</label></p>
      <div class="grid">
        ${themes.map((t) => `<button data-theme="${esc(t)}"><strong>${t}</strong><br><small>${DATA.vocab[t].length} palabras</small></button>`).join("")}
        <button data-theme="*"><strong>Todos los temas</strong></button>
      </div>
      <div class="row"><button id="back">← Inicio</button></div>
    </div>`;
  app.querySelectorAll("[data-theme]").forEach((b) => {
    b.onclick = () => {
      const t = b.dataset.theme;
      const words = t === "*" ? Object.values(DATA.vocab).flat() : DATA.vocab[t];
      const mode = app.querySelector("input[name=mode]:checked").value;
      if (mode === "cards") flashcards(shuffle(words));
      else vocabQuiz(shuffle(words).slice(0, 15), words, mode === "quiz-rev");
    };
  });
  app.querySelector("#back").onclick = home;
}

function flashcards(cards) {
  let i = 0, flipped = false;
  function render() {
    const [es, en] = cards[i];
    app.innerHTML = `
      <div class="card">
        <div class="meta"><span>Tarjetas</span><span>${i + 1} / ${cards.length}</span></div>
        <div class="flashcard card" id="fc">
          <div>${flipped ? en : es} ${flipped ? "" : speakBtn(es)}</div>
          <small>${flipped ? es : "Toca para ver la traducción"}</small>
        </div>
        <div class="row">
          <button id="prev" ${i === 0 ? "disabled" : ""}>← Anterior</button>
          <button id="menu">Temas</button>
          <button class="primary" id="next">${i < cards.length - 1 ? "Siguiente →" : "Barajar de nuevo"}</button>
        </div>
      </div>`;
    wireSpeak();
    app.querySelector("#fc").onclick = () => { flipped = !flipped; render(); };
    app.querySelector("#prev").onclick = () => { i--; flipped = false; render(); };
    app.querySelector("#next").onclick = () => {
      if (i < cards.length - 1) i++; else { cards = shuffle(cards); i = 0; }
      flipped = false; render();
    };
    app.querySelector("#menu").onclick = vocabMenu;
  }
  render();
}

function vocabQuiz(list, pool, reverse) {
  let i = 0, correct = 0;
  function render() {
    if (i >= list.length) {
      addStat("vocab", correct, list.length);
      return resultCard("Test de vocabulario", correct, list.length, () => vocabQuiz(shuffle(pool).slice(0, 15), pool, reverse));
    }
    const word = list[i];
    const [prompt, answer] = reverse ? [word[1], word[0]] : word;
    const distractors = shuffle(pool.filter((w) => w !== word)).slice(0, 3).map((w) => (reverse ? w[0] : w[1]));
    const options = shuffle([answer, ...distractors]);
    app.innerHTML = `
      <div class="card">
        <div class="meta"><span>Vocabulario</span><span>${i + 1} / ${list.length} · ✔ ${correct}</span></div>
        <h2>${prompt} ${reverse ? "" : speakBtn(prompt)}</h2>
        ${options.map((o) => `<button class="option" data-o="${esc(o)}">${o}</button>`).join("")}
        <div class="row"><button id="quit">Salir</button><button class="primary" id="next" hidden>Siguiente →</button></div>
      </div>`;
    wireSpeak();
    app.querySelectorAll(".option").forEach((b) => {
      b.onclick = () => {
        const ok = b.dataset.o === answer;
        if (ok) correct++;
        app.querySelectorAll(".option").forEach((x) => {
          x.disabled = true;
          if (x.dataset.o === answer) x.classList.add("correct");
          else if (x === b) x.classList.add("wrong");
        });
        speak(word[0]);
        app.querySelector("#next").hidden = false;
        app.querySelector("#next").focus();
      };
    });
    app.querySelector("#next").onclick = () => { i++; render(); };
    app.querySelector("#quit").onclick = vocabMenu;
  }
  render();
}

// ---------- grammar ----------
function grammarMenu() {
  const topics = [...new Set(DATA.grammar.map((g) => g.topic))];
  app.innerHTML = `
    <div class="card"><h2>✏️ Gramática</h2><p>Elige un tema.</p>
      <div class="grid">
        ${topics.map((t) => `<button data-topic="${esc(t)}"><strong>${t}</strong><br>
          <small>${DATA.grammar.filter((g) => g.topic === t).length} ejercicios</small></button>`).join("")}
        <button data-topic="*"><strong>Todo mezclado</strong><br><small>${DATA.grammar.length} ejercicios</small></button>
      </div>
      <div class="row"><button id="back">← Inicio</button></div>
    </div>`;
  app.querySelectorAll("[data-topic]").forEach((b) => {
    b.onclick = () => {
      const t = b.dataset.topic;
      grammarQuiz(shuffle(t === "*" ? DATA.grammar : DATA.grammar.filter((g) => g.topic === t)));
    };
  });
  app.querySelector("#back").onclick = home;
}

function grammarQuiz(list) {
  let i = 0, correct = 0;
  function render() {
    if (i >= list.length) {
      addStat("grammar", correct, list.length);
      return resultCard("Gramática", correct, list.length, () => grammarQuiz(shuffle(list)));
    }
    const g = list[i];
    const sentence = esc(g.s).replace("___", `<span class="blank" id="blank">&nbsp;</span>`);
    app.innerHTML = `
      <div class="card">
        <div class="meta"><span>${g.topic}</span><span>${i + 1} / ${list.length} · ✔ ${correct}</span></div>
        <p class="sentence">${sentence}</p>
        <div class="en">${g.en}</div>
        ${g.options.map((o, k) => `<button class="option" data-k="${k}">${o}</button>`).join("")}
        <div id="feedback"></div>
        <div class="row"><button id="quit">Salir</button><button class="primary" id="next" hidden>Siguiente →</button></div>
      </div>`;
    app.querySelectorAll(".option").forEach((b) => {
      b.onclick = () => {
        const k = Number(b.dataset.k), ok = k === g.answer;
        if (ok) correct++;
        app.querySelectorAll(".option").forEach((x, idx) => {
          x.disabled = true;
          if (idx === g.answer) x.classList.add("correct");
          else if (idx === k) x.classList.add("wrong");
        });
        app.querySelector("#blank").textContent = g.options[g.answer];
        const full = g.s.replace("___", g.options[g.answer]).replace(/\s*\([^)]*\)/g, "");
        app.querySelector("#feedback").innerHTML =
          `<div class="explain"><strong>${ok ? "✔ ¡Correcto!" : "✘ Incorrecto"}</strong> ${g.explain} ${speakBtn(full)}</div>`;
        wireSpeak();
        app.querySelector("#next").hidden = false;
        app.querySelector("#next").focus();
      };
    });
    app.querySelector("#next").onclick = () => { i++; render(); };
    app.querySelector("#quit").onclick = grammarMenu;
  }
  render();
}

// ---------- reading ----------
function readingMenu() {
  app.innerHTML = `
    <div class="card"><h2>📖 Comprensión de lectura</h2><p>Lee el texto y responde a las preguntas.</p>
      <div class="grid">${DATA.reading.map((r, k) =>
        `<button data-r="${k}"><strong>${r.title}</strong><div class="en">${r.en_title}</div></button>`).join("")}</div>
      <div class="row"><button id="back">← Inicio</button></div>
    </div>`;
  app.querySelectorAll("[data-r]").forEach((b) => { b.onclick = () => reading(DATA.reading[b.dataset.r]); });
  app.querySelector("#back").onclick = home;
}

function reading(r) {
  const answers = new Array(r.questions.length).fill(null);
  app.innerHTML = `
    <div class="card">
      <h2>${r.title} ${speakBtn(r.text)}</h2>
      <div class="en">${r.en_title}</div>
      <div class="text-box">${esc(r.text)}</div>
    </div>
    <div class="card" id="qs">
      ${r.questions.map((q, n) => `
        <p><strong>${n + 1}. ${q.q}</strong></p>
        ${q.options.map((o, k) => `<button class="option" data-q="${n}" data-k="${k}">${"abc"[k]}) ${o}</button>`).join("")}`).join("")}
      <div id="result"></div>
      <div class="row"><button id="back">← Textos</button><button class="primary" id="check">Corregir</button></div>
    </div>`;
  wireSpeak();
  app.querySelectorAll("#qs .option").forEach((b) => {
    b.onclick = () => {
      const n = Number(b.dataset.q);
      answers[n] = Number(b.dataset.k);
      app.querySelectorAll(`[data-q="${n}"]`).forEach((x) => x.classList.toggle("selected", x === b));
    };
  });
  app.querySelector("#check").onclick = () => {
    if (answers.includes(null) && !confirm("Hay preguntas sin responder. ¿Corregir de todos modos?")) return;
    let correct = 0;
    r.questions.forEach((q, n) => {
      if (answers[n] === q.answer) correct++;
      app.querySelectorAll(`[data-q="${n}"]`).forEach((x) => {
        const k = Number(x.dataset.k);
        x.disabled = true;
        x.classList.remove("selected");
        if (k === q.answer) x.classList.add("correct");
        else if (k === answers[n]) x.classList.add("wrong");
      });
    });
    addStat("reading", correct, r.questions.length);
    app.querySelector("#result").innerHTML = `<div class="explain"><strong>${correct}/${r.questions.length}</strong> respuestas correctas.</div>`;
    app.querySelector("#check").disabled = true;
  };
  app.querySelector("#back").onclick = readingMenu;
}

// ---------- listening (dictation) ----------
function listening(list) {
  let i = 0, correct = 0;
  function render() {
    if (i >= list.length) {
      return resultCard("Dictado", correct, list.length, () => listening(shuffle(DATA.listening)));
    }
    const [es, en] = list[i];
    app.innerHTML = `
      <div class="card">
        <div class="meta"><span>🎧 Dictado</span><span>${i + 1} / ${list.length} · ✔ ${correct}</span></div>
        <p>Escucha la frase y escríbela. No importan las tildes ni la puntuación.</p>
        <p class="en">Listen and type the sentence. Accents and punctuation don't count.</p>
        <div class="row" style="justify-content:flex-start">
          <button class="primary" id="play">🔊 Escuchar</button>
          <button id="slow">🐢 Más despacio</button>
        </div>
        <p><input type="text" id="answer" autocomplete="off" spellcheck="false" placeholder="Escribe aquí lo que oyes..."></p>
        <div id="feedback"></div>
        <div class="row"><button id="quit">Salir</button>
          <span><button id="reveal">Ver solución</button> <button class="primary" id="check">Comprobar</button></span></div>
      </div>`;
    const input = app.querySelector("#answer");
    app.querySelector("#play").onclick = () => { speak(es, 0.9); input.focus(); };
    app.querySelector("#slow").onclick = () => { speak(es, 0.6); input.focus(); };
    setTimeout(() => speak(es, 0.9), 300);
    input.focus();

    function grade(gaveUp) {
      const target = normalize(es), typed = normalize(input.value);
      const ok = !gaveUp && target.join(" ") === typed.join(" ");
      if (ok) correct++;
      addStat("listening", ok ? 1 : 0, 1);
      // Word-by-word comparison against the original sentence.
      const marked = es.split(/\s+/).map((w, k) => {
        const good = normalize(w).join(" ") === (typed[k] ?? "");
        return `<span class="${good ? "word-ok" : "word-missing"}">${esc(w)}</span>`;
      }).join(" ");
      app.querySelector("#feedback").innerHTML = `
        <div class="explain"><strong>${ok ? "✔ ¡Perfecto!" : "Solución:"}</strong> ${marked} ${speakBtn(es)}
          <div class="en">${en}</div></div>`;
      wireSpeak();
      input.disabled = true;
      app.querySelector("#reveal").remove();
      const btn = app.querySelector("#check");
      btn.textContent = "Siguiente →";
      btn.onclick = () => { i++; render(); };
      btn.focus();
    }
    app.querySelector("#check").onclick = () => grade(false);
    app.querySelector("#reveal").onclick = () => grade(true);
    input.onkeydown = (e) => { if (e.key === "Enter") app.querySelector("#check").click(); };
    app.querySelector("#quit").onclick = home;
  }
  render();
}

// ---------- writing ----------
function writingMenu() {
  const done = new Set(store.get("writingDone", []));
  app.innerHTML = `
    <div class="card"><h2>📝 Expresión escrita</h2>
      <p>En el DELE A2 escribirás dos textos breves (unas 60–80 palabras cada uno). Escribe tu texto y compáralo con el modelo.</p>
      <p class="en">In the DELE A2 you write two short texts (about 60–80 words each). Write yours, then compare it with the model answer.</p>
      <div class="grid">${DATA.writing.map((w, k) =>
        `<button data-w="${k}"><strong>${done.has(k) ? "✔ " : ""}${w.title}</strong><div class="en">${w.en}</div></button>`).join("")}</div>
      <div class="row"><button id="back">← Inicio</button></div>
    </div>`;
  app.querySelectorAll("[data-w]").forEach((b) => { b.onclick = () => writing(Number(b.dataset.w)); });
  app.querySelector("#back").onclick = home;
}

function writing(k) {
  const w = DATA.writing[k];
  const drafts = store.get("drafts", {});
  const [min, max] = w.words;
  app.innerHTML = `
    <div class="card">
      <h2>${w.title}</h2>
      <p>${w.prompt}</p>
      <div class="en">${w.en}</div>
      <p>${w.tips.map((t) => `<span class="pill">${esc(t)}</span>`).join("")}</p>
      <textarea id="text" placeholder="Escribe tu texto aquí...">${esc(drafts[k] ?? "")}</textarea>
      <div class="row"><span class="stat" id="count"></span>
        <span><button id="back">← Tareas</button> <button class="primary" id="model">Ver texto modelo</button></span></div>
      <div id="model-box"></div>
    </div>`;
  const ta = app.querySelector("#text"), count = app.querySelector("#count");
  const update = () => {
    const n = wordCount(ta.value);
    count.textContent = `${n} palabras (objetivo: ${min}–${max})`;
    count.style.color = n >= min && n <= max ? "var(--ok)" : "";
    const d = store.get("drafts", {});
    d[k] = ta.value;
    store.set("drafts", d);
  };
  ta.oninput = update;
  update();
  app.querySelector("#model").onclick = () => {
    if (wordCount(ta.value) >= min) {
      const done = new Set(store.get("writingDone", []));
      done.add(k);
      store.set("writingDone", [...done]);
    }
    app.querySelector("#model-box").innerHTML = `
      <div class="explain"><strong>Texto modelo</strong> (${wordCount(w.model)} palabras) ${speakBtn(w.model)}
        <div class="text-box" style="margin-top:.5rem">${esc(w.model)}</div>
        <p class="stat">Revisa: ¿has respondido a todos los puntos? ¿Usas bien los tiempos verbales? ¿Hay saludo y despedida?</p>
      </div>`;
    wireSpeak();
  };
  app.querySelector("#back").onclick = writingMenu;
}

// ---------- boot ----------
const enToggle = document.getElementById("show-en");
enToggle.checked = store.get("showEn", true);
document.body.classList.toggle("hide-en", !enToggle.checked);
enToggle.onchange = () => {
  store.set("showEn", enToggle.checked);
  document.body.classList.toggle("hide-en", !enToggle.checked);
};
document.getElementById("home-link").onclick = () => DATA && home();

fetch("data.json")
  .then((r) => r.json())
  .then((d) => { DATA = d; home(); })
  .catch(() => { app.innerHTML = `<div class="card">No se pudo cargar el contenido. Ejecuta <code>python server.py</code>.</div>`; });
