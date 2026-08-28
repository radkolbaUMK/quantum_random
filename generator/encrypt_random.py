"""Encrypt or decrypt the published random JSON payload."""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
from pathlib import Path

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

ALGORITHM = "AES-256-GCM"
AAD = b"quantum-random/random.json"
NONCE_SIZE = 12


def get_key() -> bytes:
    token = os.getenv("IBM_TOKEN")
    if not token:
        raise RuntimeError("Missing required environment variable: IBM_TOKEN")
    return hashlib.sha256(token.encode("utf-8")).digest()


def encrypt(input_path: Path, output_path: Path) -> None:
    plaintext = input_path.read_bytes()
    nonce = os.urandom(NONCE_SIZE)
    ciphertext = AESGCM(get_key()).encrypt(nonce, plaintext, AAD)
    payload = {
        "algorithm": ALGORITHM,
        "nonce": base64.b64encode(nonce).decode("ascii"),
        "ciphertext": base64.b64encode(ciphertext).decode("ascii"),
    }
    output_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def decrypt(input_path: Path, output_path: Path) -> None:
    payload = json.loads(input_path.read_text(encoding="utf-8"))
    if payload.get("algorithm") != ALGORITHM:
        raise ValueError("Unsupported encrypted payload format")
    nonce = base64.b64decode(payload["nonce"])
    ciphertext = base64.b64decode(payload["ciphertext"])
    plaintext = AESGCM(get_key()).decrypt(nonce, ciphertext, AAD)
    output_path.write_bytes(plaintext)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("encrypt", "decrypt"))
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    if args.action == "encrypt":
        encrypt(args.input, args.output)
    else:
        decrypt(args.input, args.output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
