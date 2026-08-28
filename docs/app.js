let quantumPool = [];

async function loadPool() {

    const response = await fetch(
        "random.json?" + Date.now()
    );

    const data = await response.json();

    quantumPool = data.numbers;

    document
        .getElementById("details")
        .innerHTML =
        `
        Backend: ${data.backend}<br>
        Wygenerowano: ${data.generated_at}<br>
        Liczb w puli: ${data.pool_size}
        `;
}

function getQuantumNumber() {

    if (quantumPool.length === 0) {

        return "Brak danych";
    }

    const randomIndex =
        crypto.getRandomValues(
            new Uint32Array(1)
        )[0] %
        quantumPool.length;

    return quantumPool[randomIndex];
}

document
    .getElementById("drawBtn")
    .addEventListener(
        "click",
        () => {

            document
                .getElementById("result")
                .textContent =
                getQuantumNumber();
        }
    );

loadPool();