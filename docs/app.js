const STORAGE_KEY = "quantum-random-state";
const MAX_HISTORY_ITEMS = 20;

let state = {
    pool: [],
    generatedAt: null,
    metadata: null,
    history: [],
};

const $ = (id) => document.getElementById(id);

function setStatus(message, type = "loading") {
    const status = $("status");
    if (!status) return;
    status.className = `status status-${type}`;
    status.querySelector(".status-text").textContent = message;
}

function showResult(value, meta = "") {
    $("result").textContent = value;
    $("resultMeta").textContent = meta;
}

function readSavedState() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
        if (saved?.generatedAt === state.generatedAt && Array.isArray(saved.pool)) {
            state.pool = saved.pool.filter(Number.isInteger);
            state.history = Array.isArray(saved.history) ? saved.history.slice(0, MAX_HISTORY_ITEMS) : [];
            return true;
        }
    } catch {
        console.warn("Ignoring invalid saved application state.");
        localStorage.removeItem(STORAGE_KEY);
    }
    return false;
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        generatedAt: state.generatedAt,
        pool: state.pool,
        history: state.history,
    }));
}

function shuffle(values) {
    const shuffled = [...values];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const swapIndex = randomUintBelow(index + 1);
        [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
}

function randomUintBelow(limit) {
    const maximum = 2 ** 32;
    const acceptedMaximum = maximum - (maximum % limit);
    const randomValue = new Uint32Array(1);
    do {
        crypto.getRandomValues(randomValue);
    } while (randomValue[0] >= acceptedMaximum);
    return randomValue[0] % limit;
}

function updateView() {
    const total = state.metadata?.pool_size || 0;
    $("poolInfo").textContent = `${state.pool.length} z ${total} liczb pozostało`;
    $("progressValue").style.width = total ? `${(state.pool.length / total) * 100}%` : "0%";
    $("details").textContent = state.metadata
        ? `${state.metadata.provider} · ${state.metadata.backend} · ${new Date(state.generatedAt).toLocaleString("pl-PL")}`
        : "";
    const history = $("history");
    history.replaceChildren();
    if (!state.history.length) {
        const empty = document.createElement("li");
        empty.className = "empty-state";
        empty.textContent = "Brak losowań w tej sesji.";
        history.append(empty);
        return;
    }
    state.history.forEach(({ value, kind, time }) => {
        const item = document.createElement("li");
        item.className = "history-item";
        item.textContent = `${kind}: ${value} · ${new Date(time).toLocaleTimeString("pl-PL")}`;
        history.append(item);
    });
}

async function loadPool() {
    setStatus("Ładowanie źródła losowości…");
    const response = await fetch(`random.json?${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (
        !Array.isArray(data.numbers) ||
        !data.numbers.length ||
        !data.numbers.every((value) => Number.isInteger(value) && value >= 0 && value <= 255) ||
        !data.generated_at
    ) {
        throw new Error("Nieprawidłowy format danych losowych.");
    }
    state.generatedAt = data.generated_at;
    state.metadata = {
        provider: data.provider || "Nieznany dostawca",
        backend: data.backend || "Nieznany backend",
        pool_size: data.pool_size || data.numbers.length,
    };
    if (!readSavedState()) state.pool = shuffle(data.numbers);
    saveState();
    setStatus("Źródło gotowe", "ready");
    updateView();
}

function takeUniformIndex(limit) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 256) {
        throw new Error("Losowanie obsługuje zakresy od 1 do 256 wartości.");
    }
    const acceptedLimit = Math.floor(256 / limit) * limit;
    while (state.pool.length) {
        const value = state.pool.pop();
        if (value < acceptedLimit) return value % limit;
    }
    return null;
}

function recordHistory(kind, value) {
    state.history.unshift({ value, kind, time: new Date().toISOString() });
    state.history = state.history.slice(0, MAX_HISTORY_ITEMS);
    saveState();
    updateView();
}

function drawNumber() {
    const min = Number($("minValue").value);
    const max = Number($("maxValue").value);
    const range = max - min + 1;
    if (
        !Number.isSafeInteger(min) ||
        !Number.isSafeInteger(max) ||
        !Number.isSafeInteger(range) ||
        min > max
    ) {
        showResult("Błędny zakres", "Podaj całkowite wartości, gdzie Od jest mniejsze lub równe Do.");
        return;
    }
    let index;
    try {
        index = takeUniformIndex(range);
    } catch (error) {
        showResult("Błędny zakres", error.message);
        return;
    }
    if (index !== null) {
        const result = min + index;
        recordHistory("Liczba", result);
        showResult(result, "Wylosowano ze źródła kwantowego");
    }
}

function drawWinner() {
    const participants = $("participants").value.split("\n").map((name) => name.trim()).filter(Boolean);
    if (!participants.length) {
        showResult("Brak uczestników", "Dodaj co najmniej jedną osobę.");
        return;
    }
    const index = takeUniformIndex(participants.length);
    if (index === null) {
        showResult("Brak liczb", "Uruchom workflow, aby wygenerować nową pulę.");
        return;
    }
    const winner = participants[index];
    if ($("removeWinner").checked) {
        participants.splice(index, 1);
        $("participants").value = participants.join("\n");
    }
    recordHistory("Osoba", winner);
    showResult(winner, "Zwycięzca został wybrany ze źródła kwantowego");
}

function setupTabs() {
    document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => {
        document.querySelectorAll(".tab, .tab-panel").forEach((element) => element.classList.remove("active"));
        tab.classList.add("active");
        $(`${tab.dataset.tab}Panel`).classList.add("active");
    }));
}

document.addEventListener("DOMContentLoaded", async () => {
    setupTabs();
    $("drawBtn").addEventListener("click", drawNumber);
    $("winnerBtn").addEventListener("click", drawWinner);
    $("clearHistory").addEventListener("click", () => {
        state.history = [];
        saveState();
        updateView();
    });
    try {
        await loadPool();
    } catch (error) {
        setStatus("Źródło niedostępne", "error");
        showResult("Błąd ładowania", "Spróbuj odświeżyć stronę lub uruchom workflow generowania.");
        console.error("Unable to load quantum random pool:", error);
    }
});
