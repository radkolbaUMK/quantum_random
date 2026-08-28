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

document.addEventListener("DOMContentLoaded", async () => {
    await loadPool();
    document
        .getElementById("drawBtn")
        .addEventListener("click", () => {
            console.log("Presenting quantum number");
            document
                .getElementById("result")
                .textContent = getQuantumNumber();
        });
});