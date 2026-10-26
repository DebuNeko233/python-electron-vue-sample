"""Readable development logs and rotating production log files."""

import sys
from loguru import logger

from .settings import data_directory


def configure_logging() -> None:
    log_dir = data_directory() / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)

    logger.remove()
    if sys.stderr is not None and not sys.stderr.closed:
        logger.add(sys.stderr, level="DEBUG" if __debug__ else "INFO", colorize=False)
    logger.add(
        log_dir / "backend.log",
        level="INFO",
        rotation="10 MB",
        retention="7 days",
        encoding="utf-8",
        enqueue=True,
        backtrace=True,
        diagnose=False,
    )
    logger.info("Backend logging ready; log directory: {}", log_dir)
