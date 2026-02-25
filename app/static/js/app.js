const METHODS = ["Budowanie", "Wstrząsanie", "Mieszanie", "Muddlowanie", "Throwing/Rolowanie"];
const GLASSWARE = [
  { id: "highball", label: "Highball" },
  { id: "rocks", label: "Rocks / Old Fashioned" },
  { id: "cocktail", label: "Kieliszek koktajlowy" },
  { id: "wine", label: "Kieliszek do wina" },
  { id: "shot", label: "Kieliszek (Shot)" },
  { id: "margarita", label: "Kieliszek do margarity" },
];

let state = {
  cocktails: [],
  alcohols: [],
  selectedCocktailId: null,
  method: null,
  glassware: null,
  ingredients: [], // [{id, amount}]
  search: "",
};

function qs(id) { return document.getElementById(id); }

function isCoarsePointer() {
  return window.matchMedia && window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

function mobileAddFromTile({ id, label, kind }) {
  if (kind === "method") {
    state.method = label;
    renderPractice();
    qs("method-zone")?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  if (kind === "glass") {
    state.glassware = id;
    renderPractice();
    qs("glass-zone")?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  if (kind === "alcohol" || kind === "other") {
    if (!state.ingredients.some(x => x.id === id)) {
      state.ingredients.push({ id, amount: "" });
      renderPractice();
      qs("ingredients-zone")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
}

async function apiGet(path) {
  const r = await fetch(path, { headers: { "Accept": "application/json" }});
  return await r.json();
}

async function apiPost(path, body) {
  const r = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(body),
  });
  return await r.json();
}

function showScreen(which) {
  qs("screen-list").classList.toggle("hidden", which !== "list");
  qs("screen-practice").classList.toggle("hidden", which !== "practice");
}

function currentCocktail() {
  return state.cocktails.find(c => c.id === state.selectedCocktailId) || null;
}

function alcoholById(id) {
  return state.alcohols.find(a => a.id === id) || null;
}

function makeTile({ id, label, kind }) {
  const el = document.createElement("div");
  el.className = "tile";
  el.textContent = label;
  el.dataset.id = id;
  el.dataset.kind = kind;

  const coarse = isCoarsePointer();

  // Desktop: klasyczne DnD
  if (!coarse) {
    el.draggable = true;
    el.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", JSON.stringify({ id, label, kind }));
    });
    return el;
  }

  // Mobile/touch: WYŁĄCZAMY draggable (bo często blokuje click/tap na mobile)
  el.draggable = false;

  // Tap-to-add (bardziej niezawodne niż "click" na elementach udających drag)
  const onTap = (e) => {
    e.preventDefault();
    e.stopPropagation();
    mobileAddFromTile({ id, label, kind });
  };

  el.addEventListener("pointerup", onTap, { passive: false });
  el.addEventListener("touchend", onTap, { passive: false }); // fallback dla starszych
  el.addEventListener("click", onTap); // fallback

  return el;
}

function renderList() {
  const list = qs("cocktail-list");
  list.innerHTML = "";
  qs("cocktail-count").textContent = `Lista ${state.cocktails.length} koktajli egzaminacyjnych`;

  for (let i = 0; i < state.cocktails.length; i++) {
    const c = state.cocktails[i];

    const card = document.createElement("div");
    card.className = "card";
    card.style.animationDelay = `${Math.min(i * 35, 420)}ms`;

    card.innerHTML = `<div class="muted small">#${String(c.id).padStart(2, "0")}</div><div style="font-weight:800;font-size:18px">${c.name}</div>`;
    card.addEventListener("click", () => {
      state.selectedCocktailId = c.id;
      resetPractice(false);
      renderPractice();
      showScreen("practice");
    });
    list.appendChild(card);
  }
}

function resetPractice(keepCocktail = true) {
  const cid = state.selectedCocktailId;
  state.method = null;
  state.glassware = null;
  state.ingredients = [];
  if (!keepCocktail) state.selectedCocktailId = cid;
  renderPractice();
  setResult(null);
}

function setResult(result) {
  const box = qs("result");
  if (!result) {
    box.className = "result hidden";
    box.innerHTML = "";
    return;
  }

  box.className = "result " + (result.ok ? "ok" : "bad");
  box.classList.remove("hidden");

  const errors = result.errors || [];
  const warnings = result.warnings || [];

  box.innerHTML = `
    <div style="font-weight:800;margin-bottom:6px">${result.ok ? "Doskonale!" : "Prawie dobrze..."}</div>
    ${errors.length ? `<div><b>Błędy:</b><ul>${errors.map(e => `<li>${e}</li>`).join("")}</ul></div>` : ""}
    ${warnings.length ? `<div><b>Uwagi:</b><ul>${warnings.map(w => `<li>${w}</li>`).join("")}</ul></div>` : ""}
  `;
}

function allowDrop(zoneEl, onDrop) {
  zoneEl.addEventListener("dragover", (e) => e.preventDefault());
  zoneEl.addEventListener("drop", (e) => {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData("text/plain"));
    onDrop(data);
  });
}

function renderPractice() {
  const c = currentCocktail();
  if (!c) return;

  qs("cocktail-name").textContent = c.name;

  // Dropzones
  const methodZone = qs("method-zone");
  const glassZone = qs("glass-zone");
  const ingZone = qs("ingredients-zone");

  methodZone.innerHTML = state.method ? `<div class="ing-item"><div>${state.method}</div><button class="btn" id="clear-method">Usuń</button></div>` : `<div class="muted">Przeciągnij metodę...</div>`;
  glassZone.innerHTML = state.glassware ? `<div class="ing-item"><div>${(GLASSWARE.find(g => g.id === state.glassware) || {label: state.glassware}).label}</div><button class="btn" id="clear-glass">Usuń</button></div>` : `<div class="muted">Przeciągnij szkło...</div>`;

  ingZone.innerHTML = "";
  if (state.ingredients.length === 0) {
    ingZone.innerHTML = `<div class="muted">Obszar budowania koktajlu jest pusty</div>`;
  } else {
    for (const ing of state.ingredients) {
      const a = alcoholById(ing.id);
      const row = document.createElement("div");
      row.className = "ing-item";
      row.draggable = true;
      row.dataset.id = ing.id;

      row.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", JSON.stringify({ kind: "picked-ingredient", id: ing.id }));
      });

      row.innerHTML = `
        <div class="ing-left">
          <div style="font-weight:800">${a ? a.brand : ing.id}</div>
          <div class="muted small">${a ? a.type : ""}</div>
        </div>
        <div class="ing-actions">
          <input class="amount" value="${ing.amount || ""}" placeholder="Ilość">
          <button class="btn" data-remove="${ing.id}">Usuń</button>
        </div>
      `;

      row.querySelector("input").addEventListener("input", (e) => {
        ing.amount = e.target.value;
      });

      row.querySelector("button").addEventListener("click", () => {
        state.ingredients = state.ingredients.filter(x => x.id !== ing.id);
        renderPractice();
      });

      ingZone.appendChild(row);
    }
  }

  // wire clear buttons
  const cm = qs("clear-method");
  if (cm) cm.addEventListener("click", () => { state.method = null; renderPractice(); });

  const cg = qs("clear-glass");
  if (cg) cg.addEventListener("click", () => { state.glassware = null; renderPractice(); });

  // enable validate
  qs("validate-btn").disabled = !(state.method && state.glassware && state.ingredients.length);

  // drop handling
  allowDrop(methodZone, (data) => {
    if (data.kind === "method") {
      state.method = data.label;
      renderPractice();
    }
  });

  allowDrop(glassZone, (data) => {
    if (data.kind === "glass") {
      state.glassware = data.id;
      renderPractice();
    }
  });

  // Ingredient drop: add from bank; reorder if dragging ingredient within zone
  allowDrop(ingZone, (data) => {
    if (data.kind === "alcohol" || data.kind === "other") {
      if (!state.ingredients.some(x => x.id === data.id)) {
        state.ingredients.push({ id: data.id, amount: "" });
        renderPractice();
      }
    }
  });

  // simple reorder: when ingredient dragged over another ingredient, swap positions
  ingZone.addEventListener("dragover", (e) => {
    const over = e.target.closest(".ing-item");
    if (!over) return;
    e.preventDefault();
  });

  ingZone.addEventListener("drop", (e) => {
    const over = e.target.closest(".ing-item");
    if (!over) return;

    const payload = JSON.parse(e.dataTransfer.getData("text/plain"));
    if (payload.kind !== "picked-ingredient") return;

    const fromId = payload.id;
    const toId = over.dataset.id;
    if (fromId === toId) return;

    const fromIdx = state.ingredients.findIndex(x => x.id === fromId);
    const toIdx = state.ingredients.findIndex(x => x.id === toId);
    if (fromIdx < 0 || toIdx < 0) return;

    const [item] = state.ingredients.splice(fromIdx, 1);
    state.ingredients.splice(toIdx, 0, item);
    renderPractice();
  });

  renderBanks();
}

function renderBanks() {
  const query = (state.search || "").toLowerCase();
  const isOtherType = (t) => ["Inne", "Soft", "Other"].includes(t);

  // methods bank
  const mb = qs("methods-bank");
  mb.innerHTML = "";
  for (const m of METHODS) {
    mb.appendChild(makeTile({ id: m, label: m, kind: "method" }));
  }

  // glass bank
  const gb = qs("glass-bank");
  gb.innerHTML = "";
  for (const g of GLASSWARE) {
    gb.appendChild(makeTile({ id: g.id, label: g.label, kind: "glass" }));
  }

  // alcohol/others banks
  const ab = qs("alcohols-bank");
  const ob = qs("others-bank");
  ab.innerHTML = "";
  ob.innerHTML = "";

  const filtered = state.alcohols
    .filter(a => (a.brand || "").toLowerCase().includes(query) || (a.type || "").toLowerCase().includes(query))
    .sort((a,b) => (a.brand || "").localeCompare(b.brand || ""));

  for (const a of filtered) {
    const kind = isOtherType(a.type) ? "other" : "alcohol";
    const tile = makeTile({ id: a.id, label: `${a.brand}`, kind });
    (kind === "other" ? ob : ab).appendChild(tile);
  }
}

async function init() {
  MobileDragDrop.polyfill({
    // Ustawienie wymusza opóźnienie rozpoczęcia przeciągania o np. 200ms. 
    // Dzięki temu krótkie dotknięcie/pociągnięcie wciąż będzie przewijać ekran.
    holdToDrag: 200 
  });

  // load data
  const [cocktails, alcohols] = await Promise.all([
    apiGet("/api/cocktails"),
    apiGet("/api/alcohols"),
  ]);
  state.cocktails = cocktails;
  state.alcohols = alcohols;

  // list screen
  renderList();
  showScreen("list");

  // controls
  qs("back-btn").addEventListener("click", () => {
    state.selectedCocktailId = null;
    setResult(null);
    showScreen("list");
  });

  qs("reset-btn").addEventListener("click", () => resetPractice(true));

  qs("search").addEventListener("input", (e) => {
    state.search = e.target.value || "";
    renderBanks();
  });

  qs("validate-btn").addEventListener("click", async () => {
    const payload = {
      cocktailId: state.selectedCocktailId,
      method: state.method,
      glassware: state.glassware,
      ingredients: state.ingredients.map(x => ({ id: x.id, amount: x.amount })),
    };
    const result = await apiPost("/api/validate", payload);
    setResult(result);
  });
}

document.addEventListener("DOMContentLoaded", init);