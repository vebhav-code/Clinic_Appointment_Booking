"""In-memory sliding window rate limiter for sensitive endpoints (login, register)."""

import time
from collections import defaultdict
from fastapi import Request, status

from app.core.errors import AppError


class InMemoryRateLimiter:
    """Simple in-memory sliding-window rate limiter per client IP."""

    def __init__(self, requests_per_minute: int = 15):
        self.requests_per_minute = requests_per_minute
        self.window_seconds = 60
        self.history: dict[str, list[float]] = defaultdict(list)

    def check(self, request: Request, identifier: str | None = None) -> None:
        """Verify client has not exceeded allowed rate limit."""
        client_ip = identifier
        if not client_ip:
            # Check forwarded header first, then client host
            forwarded = request.headers.get("x-forwarded-for")
            if forwarded:
                client_ip = forwarded.split(",")[0].strip()
            elif request.client:
                client_ip = request.client.host
            else:
                client_ip = "unknown_client"

        now = time.time()
        window_start = now - self.window_seconds

        # Prune older entries
        recent = [ts for ts in self.history[client_ip] if ts > window_start]
        if len(recent) >= self.requests_per_minute:
            retry_after = int(self.window_seconds - (now - recent[0])) + 1
            raise AppError(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                code="RATE_LIMIT_EXCEEDED",
                message=f"Too many requests. Please wait {retry_after} seconds before trying again.",
            )

        recent.append(now)
        self.history[client_ip] = recent


auth_rate_limiter = InMemoryRateLimiter(requests_per_minute=20)
