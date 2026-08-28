"""Generate a pool of quantum random bytes and publish them for the web app."""

from __future__ import annotations

import argparse
import json
import os
import tempfile
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from qiskit import QuantumCircuit
from qiskit.transpiler import generate_preset_pass_manager
from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2

DEFAULT_POOL_SIZE = 100
DEFAULT_OUTPUT = Path(__file__).resolve().parents[1] / "docs" / "random.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--pool-size",
        type=int,
        default=int(os.getenv("POOL_SIZE", DEFAULT_POOL_SIZE)),
        help="Number of random bytes to publish (default: %(default)s)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(os.getenv("OUTPUT_PATH", DEFAULT_OUTPUT)),
        help="Output JSON path (default: docs/random.json)",
    )
    return parser.parse_args()


def required_setting(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def generate_numbers(pool_size: int) -> tuple[list[int], str]:
    if pool_size < 1:
        raise ValueError("pool size must be greater than zero")

    service = QiskitRuntimeService(
        channel="ibm_quantum_platform",
        token=required_setting("IBM_TOKEN"),
        instance=required_setting("IBM_INSTANCE"),
    )
    backend = service.least_busy(simulator=False, operational=True)

    circuit = QuantumCircuit(8)
    circuit.h(range(8))
    circuit.measure_all()
    isa_circuit = generate_preset_pass_manager(
        backend=backend,
        optimization_level=1,
    ).run(circuit)

    job = SamplerV2(mode=backend).run([isa_circuit], shots=pool_size)
    counts = job.result()[0].data.meas.get_counts()
    numbers = [
        int(bitstring, 2)
        for bitstring, count in counts.items()
        for _ in range(count)
    ]
    if len(numbers) != pool_size:
        raise RuntimeError(
            f"Quantum backend returned {len(numbers)} values; expected {pool_size}"
        )
    return numbers, backend.name


def write_payload(output: Path, numbers: list[int], backend_name: str) -> None:
    payload: dict[str, Any] = {
        "generated_at": datetime.now(UTC).isoformat(),
        "provider": "IBM Quantum",
        "backend": backend_name,
        "pool_size": len(numbers),
        "numbers": numbers,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        mode="w",
        encoding="utf-8",
        dir=output.parent,
        prefix=f".{output.name}.",
        suffix=".tmp",
        delete=False,
    ) as temporary:
        json.dump(payload, temporary, indent=2)
        temporary.write("\n")
        temporary_path = Path(temporary.name)
    temporary_path.replace(output)


def main() -> int:
    args = parse_args()
    numbers, backend_name = generate_numbers(args.pool_size)
    write_payload(args.output, numbers, backend_name)
    print(f"Generated {len(numbers)} values with {backend_name}.")
    print(f"Published {args.output}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
