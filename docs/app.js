let quantumPool = [];

async function loadPool() {
    const response = await fetch(
        "random.json?" + Date.now()
    );
    const data = await response.json();
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