import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI

from app.core.config import get_settings
from app.deps import init_db
from app.routers.api import router

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    Path(settings.sqlite_path).parent.mkdir(parents=True, exist_ok=True)
    init_db()
    yield


app = FastAPI(
    title="Bible Recovery Version & Original Language Analyzer API",
    version="0.2.0",
    description="供 ChatGPT Actions 呼叫的聖經恢復本＋原文字義研究 API 原型",
    lifespan=lifespan,
)

app.include_router(router)
