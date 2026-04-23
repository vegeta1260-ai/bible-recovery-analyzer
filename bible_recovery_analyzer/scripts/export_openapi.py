from pathlib import Path

import yaml

from app.main import app


def main() -> None:
    out = Path("openapi.yaml")
    out.write_text(yaml.safe_dump(app.openapi(), sort_keys=False, allow_unicode=True), encoding="utf-8")
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
