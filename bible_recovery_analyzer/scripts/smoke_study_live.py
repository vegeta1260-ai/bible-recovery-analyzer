from __future__ import annotations

import os
import sys
import logging
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = PROJECT_ROOT / ".env"


def read_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def redact(text: Any, config: dict[str, str]) -> str:
    safe = str(text)
    for key in ["RECOVERY_API_TOKEN", "RECOVERY_API_KEY", "ACTION_API_KEY"]:
        secret = config.get(key, "")
        if secret:
            safe = safe.replace(secret, "[REDACTED]")
    return safe


def credential_skip_reason(config: dict[str, str]) -> str:
    mode = (config.get("RECOVERY_API_AUTH_MODE") or "bearer").lower()
    token = config.get("RECOVERY_API_TOKEN") or config.get("RECOVERY_API_KEY") or ""
    if mode == "none":
        return ""
    if not token:
        return "missing RECOVERY_API_TOKEN / RECOVERY_API_KEY"
    if mode == "basic" and not config.get("RECOVERY_API_APP_ID"):
        return "missing RECOVERY_API_APP_ID for RECOVERY_API_AUTH_MODE=basic"
    return ""


def main() -> int:
    config = read_env(ENV_PATH)
    if not config:
        print("No .env found; live /study smoke skipped.")
        return 0

    skip_reason = credential_skip_reason(config)
    if skip_reason:
        print(f"Live /study smoke skipped: {skip_reason}.")
        return 0

    os.chdir(PROJECT_ROOT)
    for key, value in config.items():
        os.environ[key] = value
    sys.path.insert(0, str(PROJECT_ROOT))
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("app.services.recovery.manager").setLevel(logging.ERROR)

    from fastapi.testclient import TestClient

    from app.main import app

    client = TestClient(app)
    response = client.get("/study", params={"ref": "John 1:1"})
    print(f"http_status={response.status_code}")
    if response.status_code != 200:
        print(f"response={redact(response.text, config)[:600]}")
        return 1

    body = response.json()
    recovery_text = body.get("recovery_text", {})
    diagnostics = body.get("diagnostics", {})
    verses = recovery_text.get("verses", [])
    warnings = diagnostics.get("warnings", [])

    print(f"reference_input={body.get('reference', {}).get('input', '')}")
    print(f"verses_count={len(verses) if isinstance(verses, list) else 0}")
    print(f"copyright_present={bool(recovery_text.get('copyright'))}")
    print(f"diagnostics_provider={diagnostics.get('provider', '')}")
    print(f"lsm_status={diagnostics.get('lsm_status', '')}")
    print(f"upstream_message={redact(diagnostics.get('upstream_message', ''), config)}")
    if warnings:
        print(f"first_warning={redact(warnings[0], config)[:600]}")

    required = [
        body.get("reference", {}).get("input"),
        isinstance(verses, list) and len(verses) > 0,
        recovery_text.get("copyright"),
        diagnostics,
    ]
    if not all(required):
        print("Live /study smoke failed: response is missing required recovery fields.")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
