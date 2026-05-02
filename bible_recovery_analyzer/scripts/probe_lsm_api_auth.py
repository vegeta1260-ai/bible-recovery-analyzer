from __future__ import annotations

import json
from base64 import b64encode
from pathlib import Path
from typing import Any

import httpx


PROJECT_ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = PROJECT_ROOT / ".env"
PROBE_URL = "https://api.lsm.org/recver/txo.php?String=John%201:1&Out=json"


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


def secret_values(config: dict[str, str]) -> list[str]:
    token = config.get("RECOVERY_API_TOKEN") or config.get("RECOVERY_API_KEY") or ""
    app_id = config.get("RECOVERY_API_APP_ID", "")
    values = [
        token,
        config.get("RECOVERY_API_KEY", ""),
        config.get("ACTION_API_KEY", ""),
    ]
    if app_id and token:
        values.append(b64encode(f"{app_id}:{token}".encode("utf-8")).decode("ascii"))
    return [value for value in values if value]


def redact(text: Any, secrets: list[str]) -> str:
    safe = str(text)
    for secret in secrets:
        safe = safe.replace(secret, "[REDACTED]")
    return safe


def looks_unauthorized(status_code: int, body: str, message: str) -> bool:
    haystack = f"{status_code} {message} {body[:500]}".lower()
    return any(
        marker in haystack
        for marker in [
            "not authorized",
            "unauthorized",
            "authorization token",
            "auth denied",
            "access denied",
            "401",
            "403",
        ]
    )


def summarize_response(response: httpx.Response, secrets: list[str]) -> dict[str, Any]:
    body = response.text
    parsed_json = False
    verses_count = 0
    message = ""
    try:
        payload = response.json()
        parsed_json = True
        if isinstance(payload, dict):
            verses = payload.get("verses")
            if isinstance(verses, list):
                verses_count = len(verses)
            if isinstance(payload.get("message"), str):
                message = payload["message"]
    except json.JSONDecodeError:
        pass

    preview = " ".join(redact(body, secrets).split())[:200]
    unauthorized = looks_unauthorized(response.status_code, body, message)
    authorized = response.status_code == 200 and parsed_json and verses_count > 0 and not unauthorized
    return {
        "http_status": response.status_code,
        "content_type": response.headers.get("content-type", ""),
        "json_parsed": parsed_json,
        "verses_count": verses_count,
        "message": redact(message, secrets),
        "response_preview": preview,
        "authorized_like": authorized,
        "unauthorized_like": unauthorized,
    }


def run_probe(name: str, headers: dict[str, str], secrets: list[str]) -> None:
    print(f"--- {name}")
    try:
        with httpx.Client(timeout=20.0) as client:
            response = client.get(PROBE_URL, headers=headers)
        summary = summarize_response(response, secrets)
    except httpx.HTTPError as exc:
        print(f"error={redact(exc, secrets)}")
        return

    for key, value in summary.items():
        print(f"{key}={value}")


def main() -> int:
    config = read_env(ENV_PATH)
    token = config.get("RECOVERY_API_TOKEN") or config.get("RECOVERY_API_KEY") or ""
    if not token:
        print("No RECOVERY_API_TOKEN or RECOVERY_API_KEY configured; probe skipped.")
        return 0

    header_name = config.get("RECOVERY_API_AUTH_HEADER_NAME") or "Authorization"
    secrets = secret_values(config)

    run_probe("A Authorization raw token", {"Authorization": token}, secrets)
    run_probe("B Authorization bearer token", {"Authorization": f"Bearer {token}"}, secrets)
    run_probe(f"C configured header raw token ({header_name})", {header_name: token}, secrets)

    app_id = config.get("RECOVERY_API_APP_ID", "")
    if app_id:
        basic = b64encode(f"{app_id}:{token}".encode("utf-8")).decode("ascii")
        run_probe("D Basic appid/token", {"Authorization": f"Basic {basic}"}, secrets)
    else:
        print("--- D Basic appid/token")
        print("skipped=missing RECOVERY_API_APP_ID")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
