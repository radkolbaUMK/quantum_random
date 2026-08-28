import json
import os
from datetime import datetime, UTC
from qiskit import QuantumCircuit
from qiskit.transpiler import generate_preset_pass_manager
from qiskit_ibm_runtime import (
    QiskitRuntimeService,
    SamplerV2 as Sampler,
)

POOL_SIZE = 100


service = QiskitRuntimeService(
    channel="ibm_quantum_platform",
    token=os.environ["IBM_TOKEN"],
    instance=os.environ["IBM_INSTANCE"]
)
backend = service.least_busy(
    simulator=False,
    operational=True
)
print(f"Backend: {backend.name}")
qc = QuantumCircuit(8)
for q in range(8):
    qc.h(q)
qc.measure_all()
pm = generate_preset_pass_manager(
    backend=backend,
    optimization_level=1
)
isa_circuit = pm.run(qc)
sampler = Sampler(mode=backend)
job = sampler.run(
    [isa_circuit],
    shots=POOL_SIZE
)
print("JOB:", job.job_id())
result = job.result()
print(result)
numbers = []
pub_result = result[0]

try:
    counts = pub_result.data.meas.get_counts()
    for bitstring, count in counts.items():
        value = int(bitstring, 2)
        for _ in range(count):
            numbers.append(value)

except Exception:
    print("Nie udało się automatycznie odczytać wyników")
    print(pub_result)
    raise

payload = {
    "generated_at": datetime.now(
        UTC
    ).isoformat(),
    "provider": "IBM Quantum",
    "backend": backend.name,
    "pool_size": len(numbers),
    "numbers": numbers
}

with open(
    "docs/random.json",
    "w",
    encoding="utf-8"
) as f:
    json.dump(
        payload,
        f,
        indent=2,
        ensure_ascii=False
    )

print(
    f"Zapisano {len(numbers)} liczb."
)