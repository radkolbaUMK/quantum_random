import json
import os
from datetime import datetime, UTC
from qiskit import QuantumCircuit
from qiskit_ibm_runtime import QiskitRuntimeService
from qiskit_ibm_runtime import SamplerV2

POOL_SIZE = 256
numbers = []

token = os.environ["IBM_TOKEN"]
service = QiskitRuntimeService(
    channel="ibm_quantum_platform",
    token=token
)
backend = service.least_busy(
    simulator=False,
    operational=True
)

while len(numbers) < POOL_SIZE:
    qc = QuantumCircuit(8)
    for q in range(8):
        qc.h(q)
    qc.measure_all()
    sampler = SamplerV2(backend)
    job = sampler.run([qc], shots=128)
    result = job.result()
    counts = result[0].data.meas.get_counts()
    for bit_string in counts.keys():
        if len(numbers) >= POOL_SIZE:
            break
        numbers.append(int(bit_string, 2))

payload = {
    "generated_at": datetime.now(
        UTC
    ).isoformat(),
    "backend": backend.name,
    "provider": "IBM Quantum",
    "pool_size": len(numbers),
    "numbers": numbers
}

with open("docs/random.json", "w", encoding="utf-8") as f:
    json.dump(payload, f, ensure_ascii=False)

print(
    f"Wygenerowano {len(numbers)} liczb "
    f"na backendzie {backend.name}"
)