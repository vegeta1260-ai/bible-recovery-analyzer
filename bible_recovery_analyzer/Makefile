PYTHON ?= python

bootstrap:
	bash scripts/bootstrap_env.sh

seed:
	$(PYTHON) scripts/seed_data.py

run:
	uvicorn app.main:app --reload --port 8000

test:
	pytest

smoke:
	$(PYTHON) -m py_compile $(shell rg --files -g '*.py')
