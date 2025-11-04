// script.js — versió robusta amb Firestore i shuffle

document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const wordInput = document.getElementById("word");
  const translationInput = document.getElementById("translation");
  const addButton = document.getElementById("add");
  const cardsContainer = document.getElementById("cards-container");
  const editButton = document.getElementById("edit-mode");
  const nextButton = document.getElementById("next");
  const prevButton = document.getElementById("prev");
  const counter = document.getElementById("counter");
  const shuffleButton = document.getElementById("shuffle-btn");

  // Firestore exposat per index.html (si està inicialitzat)
  const db = window.db || null;
  const firestoreFns = window.firestoreFns || null;
  const useFirestore = Boolean(db && firestoreFns && firestoreFns.collection);

  if (useFirestore) console.log("✅ Usant Firestore (núvol).");
  else console.log("⚠️ Firestore no disponible — usant localStorage.");

  // Estat
  let cards = [];
  let currentIndex = 0;
  let editMode = false;

  const LOCAL_KEY = "vocab";

  function saveLocal() {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(cards));
  }

  // 🔀 Funció per barrejar (Fisher–Yates)
  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // ---------- Càrrega inicial ----------
  async function loadCards() {
    try {
      if (useFirestore) {
        const { collection, getDocs } = firestoreFns;
        const cardsRef = collection(db, "cards");
        const snap = await getDocs(cardsRef);
        cards = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } else {
        cards = JSON.parse(localStorage.getItem(LOCAL_KEY)) || [];
      }

      shuffle(cards); // barrejar-les cada vegada
      currentIndex = 0;
      renderCards();
    } catch (err) {
      console.error("Error carregant targetes:", err);
      cards = [];
      renderCards();
    }
  }

  // ---------- Render ----------
  function renderCards() {
    cardsContainer.innerHTML = "";

    if (!cards.length) {
      cardsContainer.innerHTML = "<p>No hi ha targetes. Afig-ne alguna!</p>";
      if (counter) counter.textContent = "";
      return;
    }

    if (currentIndex >= cards.length) currentIndex = 0;
    const card = cards[currentIndex];

    const cardDiv = document.createElement("div");
    cardDiv.className = "card";
    cardDiv.innerHTML = `
      <div class="card-inner">
        <div class="card-front">
          ${escapeHtml(card.word)}
          <button class="delete-btn" title="Eliminar">🗑️</button>
        </div>
        <div class="card-back">${escapeHtml(card.translation)}</div>
      </div>
    `;

    const deleteBtn = cardDiv.querySelector(".delete-btn");
    deleteBtn.style.display = editMode ? "inline-block" : "none";

    cardDiv.addEventListener("click", () => {
      cardDiv.classList.toggle("flipped");
    });

    deleteBtn.addEventListener("click", async (ev) => {
      ev.stopPropagation();
      if (!editMode) return;

      try {
        if (useFirestore && card.id) {
          await firestoreFns.deleteDoc(firestoreFns.doc(db, "cards", card.id));
        }
      } catch (err) {
        console.warn("Error esborrant al núvol:", err);
      }

      cards.splice(currentIndex, 1);
      saveLocal();
      if (currentIndex >= cards.length) currentIndex = 0;
      renderCards();
    });

    cardsContainer.appendChild(cardDiv);
    if (counter) counter.textContent = `${currentIndex + 1} / ${cards.length}`;
  }

  // ---------- Afegir ----------
  addButton.addEventListener("click", async () => {
    const word = wordInput.value.trim();
    const translation = translationInput.value.trim();
    if (!word || !translation) return;

    const newCard = { word, translation };

    try {
      if (useFirestore) {
        const { addDoc, collection } = firestoreFns;
        const docRef = await addDoc(collection(db, "cards"), newCard);
        newCard.id = docRef.id;
      } else {
        newCard.id = "local_" + Date.now();
      }

      cards.push(newCard);
      saveLocal();
      wordInput.value = "";
      translationInput.value = "";
      wordInput.focus();
      currentIndex = cards.length - 1;
      renderCards();
    } catch (err) {
      console.error("Error afegint targeta:", err);
      alert("Error al guardar la targeta.");
    }
  });

  // Enter per afegir
  [wordInput, translationInput].forEach(input => {
    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        addButton.click();
      }
    });
  });

  // ---------- Navegació ----------
  nextButton.addEventListener("click", () => {
    if (!cards.length) return;
    currentIndex = (currentIndex + 1) % cards.length;
    renderCards();
  });

  prevButton.addEventListener("click", () => {
    if (!cards.length) return;
    currentIndex = (currentIndex - 1 + cards.length) % cards.length;
    renderCards();
  });

  // ---------- Mode edició ----------
  editButton.addEventListener("click", () => {
    editMode = !editMode;
    document.body.classList.toggle("edit-mode", editMode);
    editButton.textContent = editMode ? "✅ Fet" : "✏️ Editar";
    renderCards();
  });

  // ---------- Barrejar manualment (Nou examen) ----------
  shuffleButton.addEventListener("click", () => {
    if (!cards.length) return;
    shuffle(cards);
    currentIndex = 0;
    renderCards();
  });
  // 🔍 CERCA
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const clearSearch = document.getElementById("clear-search");

searchBtn.addEventListener("click", () => {
  const term = searchInput.value.trim().toLowerCase();
  if (!term) return renderCards(); // si no hi ha text, mostra tot
  const foundIndex = cards.findIndex(c =>
    c.word.toLowerCase().includes(term) ||
    c.translation.toLowerCase().includes(term)
  );
  if (foundIndex === -1) {
    alert("No s'ha trobat cap paraula que coincidisca.");
    return;
  }
  currentIndex = foundIndex;
  renderCards();
});

clearSearch.addEventListener("click", () => {
  searchInput.value = "";
  renderCards();
});

searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") searchBtn.click();
});


  // ---------- Utilitats ----------
  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // ---------- Inicialitzar ----------
  loadCards();

  // Exportar per depuració
  window._euskal = { cards, useFirestore };
});
