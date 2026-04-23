FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt requirements-dev.txt ./
RUN pip install --no-cache-dir -r requirements-dev.txt
COPY . .

ENV RECOVERY_PROVIDER=mock
ENV SQLITE_PATH=/app/data/bible_analyzer.db

RUN python scripts/seed_data.py

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
