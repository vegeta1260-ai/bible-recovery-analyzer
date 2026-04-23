#!/usr/bin/env python3
"""Repository migration/integrity verification for bible_recovery_analyzer."""

from __future__ import annotations

import argparse
import importlib
import json
import os
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


@dataclass
class CheckResult:
    name: str
    ok: bool
    details: str


def _check_paths(entries: Iterable[tuple[str, Path, str]]) -> list[CheckResult]:
    results: list[CheckResult] = []
    for name, path, kind in entries:
        exists = path.exists()
        is_kind = path.is_file() if kind == "file" else path.is_dir()
        ok = exists and is_kind
        details = f"{path} ({kind}) {'found' if ok else 'missing'}"
        results.append(CheckResult(name, ok, details))
    return results


def _check_modules(modules: Iterable[str]) -> list[CheckResult]:
    results: list[CheckResult] = []
    for module in modules:
        try:
            importlib.import_module(module)
            results.append(CheckResult(f"module:{module}", True, "import ok"))
        except Exception as exc:  # pragma: no cover - best-effort diagnostics
            results.append(CheckResult(f"module:{module}", False, f"import failed: {exc}"))
    return results


def _check_routes(required_routes: Iterable[str]) -> list[CheckResult]:
    os.environ.setdefault("RECOVERY_PROVIDER", "mock")
    from app.main import app

    existing = {route.path for route in app.routes}
    results: list[CheckResult] = []
    for route in required_routes:
        ok = route in existing
        results.append(CheckResult(f"route:{route}", ok, "registered" if ok else "not registered"))
    return results


def _summarize(results: list[CheckResult]) -> dict:
    passed = [r for r in results if r.ok]
    failed = [r for r in results if not r.ok]
    return {
        "total": len(results),
        "passed": len(passed),
        "failed": len(failed),
        "failed_items": [{"name": r.name, "details": r.details} for r in failed],
    }


def _build_report(all_results: list[CheckResult], summary: dict) -> str:
    completed = [r for r in all_results if r.ok]
    missing = [r for r in all_results if not r.ok]

    completed_lines = "\n".join(f"- ✅ {r.name}: {r.details}" for r in completed) or "- (none)"
    missing_lines = "\n".join(f"- ❌ {r.name}: {r.details}" for r in missing) or "- (none)"

    improvements = "\n".join(
        [
            "- ⚙️ 專案實際程式碼位於 `bible_recovery_analyzer/` 子目錄；目前可運作，但後續可評估是否調整為 repo root 更直觀。",
            "- ⚙️ 建議持續擴充 verify script（例如加上 OpenAPI schema 檢查與 CI gate）。",
            "- ⚙️ 若要進入 production，建議增加啟動前 DB migration / health dependency checks。",
        ]
    )

    ready = "是" if summary["failed"] == 0 else "否"

    return f"""# Migration Verification Report

## Verification Date (UTC)
- {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC

## Summary
- Total checks: {summary['total']}
- Passed: {summary['passed']}
- Failed: {summary['failed']}

## 已完整遷移的部分
{completed_lines}

## 疑似缺漏的部分
{missing_lines}

## 結構上可改善但不影響運作的部分
{improvements}

## 是否可進入本機落地執行階段
- {ready}（依本次自動驗證結果判定）
"""


def run_checks() -> tuple[list[CheckResult], dict]:
    file_checks = _check_paths(
        [
            ("README", ROOT / "README.md", "file"),
            ("requirements", ROOT / "requirements.txt", "file"),
            ("requirements-dev", ROOT / "requirements-dev.txt", "file"),
            ("Dockerfile", ROOT / "Dockerfile", "file"),
            ("openapi", ROOT / "openapi.yaml", "file"),
            ("app", ROOT / "app", "dir"),
            ("docs", ROOT / "docs", "dir"),
            ("tests", ROOT / "tests", "dir"),
            ("scripts", ROOT / "scripts", "dir"),
        ]
    )

    provider_checks = _check_modules(
        [
            "app.services.recovery.providers",
            "app.services.recovery.manager",
            "app.services.recovery_api",
        ]
    )

    # Resolve class symbols explicitly for stronger provider checks.
    class_checks: list[CheckResult] = []
    provider_module = importlib.import_module("app.services.recovery.providers")
    for cls in ["MockRecoveryProvider", "LsmApiRecoveryProvider", "WebFallbackRecoveryProvider"]:
        exists = hasattr(provider_module, cls)
        class_checks.append(CheckResult(f"provider_class:{cls}", exists, "exists" if exists else "missing"))

    route_checks = _check_routes(
        [
            "/verse",
            "/passage",
            "/word",
            "/strongs/{sid}",
            "/lemma",
            "/interlinear",
            "/health",
            "/provider-status",
        ]
    )

    all_results = file_checks + provider_checks[:3] + class_checks + route_checks
    summary = _summarize(all_results)
    return all_results, summary


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify migration completeness and local readiness.")
    parser.add_argument("--write-report", action="store_true", help="Write docs/migration_verification_report.md")
    args = parser.parse_args()

    all_results, summary = run_checks()

    print(json.dumps({
        "summary": summary,
        "checks": [{"name": r.name, "ok": r.ok, "details": r.details} for r in all_results],
    }, ensure_ascii=False, indent=2))

    if args.write_report:
        report = _build_report(all_results, summary)
        report_path = ROOT / "docs" / "migration_verification_report.md"
        report_path.write_text(report, encoding="utf-8")
        print(f"\nReport written to: {report_path}")

    return 0 if summary["failed"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
