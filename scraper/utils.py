"""
scraper/utils.py — Shared scraper utilities.

Provides retry decorators with exponential backoff (sync and async variants).
No external dependencies required.
"""

import asyncio
import time
import functools


def retry(max_attempts: int = 3, delay: float = 2.0, backoff: float = 2.0, exceptions: tuple = (Exception,)):
    """
    Synchronous retry decorator with exponential backoff.

    Args:
        max_attempts: Maximum number of attempts (including the first).
        delay:        Initial delay in seconds between retries.
        backoff:      Multiplier applied to delay after each failure.
        exceptions:   Tuple of exception types to catch and retry on.

    Usage:
        @retry(max_attempts=3, delay=2.0, exceptions=(Exception,))
        def fetch_page(url):
            ...
    """
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            attempt = 0
            current_delay = delay
            while attempt < max_attempts:
                try:
                    return fn(*args, **kwargs)
                except exceptions as e:
                    attempt += 1
                    if attempt >= max_attempts:
                        raise
                    print(
                        f"  [retry] {fn.__name__} failed ({e}), "
                        f"retrying in {current_delay:.1f}s ({attempt}/{max_attempts})"
                    )
                    time.sleep(current_delay)
                    current_delay *= backoff
        return wrapper
    return decorator


def async_retry(max_attempts: int = 3, delay: float = 2.0, backoff: float = 2.0, exceptions: tuple = (Exception,)):
    """
    Async retry decorator with exponential backoff for coroutines.

    Usage:
        @async_retry(max_attempts=3, delay=2.0, exceptions=(Exception,))
        async def scrape_dispensary(page, slug, name):
            ...
    """
    def decorator(fn):
        @functools.wraps(fn)
        async def wrapper(*args, **kwargs):
            attempt = 0
            current_delay = delay
            while attempt < max_attempts:
                try:
                    return await fn(*args, **kwargs)
                except exceptions as e:
                    attempt += 1
                    if attempt >= max_attempts:
                        raise
                    print(
                        f"  [retry] {fn.__name__} failed ({e}), "
                        f"retrying in {current_delay:.1f}s ({attempt}/{max_attempts})"
                    )
                    await asyncio.sleep(current_delay)
                    current_delay *= backoff
        return wrapper
    return decorator
