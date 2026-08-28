let quantumPool = [];

async function loadPool() {
    console.log("Loading random.json");
    const response = await fetch(
        "random.json?" + Date.now()
    );
    const data = await response.json();
    console.log("Status:", response.status);
    console.log("Numbers:", data.numbers?.length);
    const savedTimestamp =
        localStorage.getItem("generated_at");
    if (savedTimestamp === data.generated_at) {
        const savedPool =
            localStorage.getItem("quantumPool");
        quantumPool = savedPool ? JSON.parse(savedPool) : [...data.numbers];
    } else {
        quantumPool = [...data.numbers];
        localStorage.setItem(
            "generated_at",
            data.generated_at
        );
        localStorage.setItem(
            "quantumPool",
            JSON.stringify(quantumPool)
        );
    }
}

function mapQuantumNumber(value) {
    const min = parseInt(document.getElementById("minValue").value);
    const max = parseInt(document.getElementById("maxValue").value);
    if (max <= min) {
        return "Błędny zakres";
    }
    return (value % (max - min + 1)) + min;
}

function getQuantumNumber() {
    if (quantumPool.length === 0) {
        return "Uruchom workflow, aby wygenerować więcej liczb.";
    }
    const value = quantumPool.pop();
    localStorage.setItem(
        "quantumPool",
        JSON.stringify(quantumPool)
    );
    return value;
}

function drawWinner() {
    const quantum = getQuantumNumber();
    if (typeof quantum !== "number") {
        return quantum;
    }
    const participants =
        document.getElementById("participants").value.split("\n").map(v => v.trim()).filter(v => v.length);
    if (participants.length === 0) {
        return "Brak uczestników";
    }
    const index = quantum % participants.length;
    return participants[index];
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadPool();
    document
        .getElementById("drawBtn")
        .addEventListener("click", () => {
            const quantum = getQuantumNumber();
            if (typeof quantum !== "number") {
                document.getElementById("result").textContent = quantum;
                return;
            }
            const result = mapQuantumNumber(quantum);

            document.getElementById("result").textContent = result;
        });
});