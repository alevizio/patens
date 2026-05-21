"""
Vercel Python serverless function: POST /api/hint-font

Auto-hints a TTF binary via ttfautohint. Replaces the previous Node
SvelteKit route at src/routes/api/hint-font/+server.ts (which required
the ttfautohint binary to be on PATH or bundled separately).

ttfautohint-py (https://pypi.org/project/ttfautohint-py/, Aug 2024)
ships the binary inside the wheel — no separate install step, no
binary committed to git, no Vercel includeFiles config. Free-tier
Vercel Python runtime + ~5 MB function size.

Endpoint shape mirrors the previous Node route so the client
(src/lib/font/hint.ts) doesn't change:
- GET → JSON { available: bool, version?: str, reason?: str }
- POST raw TTF binary + ?rangeMin=N&rangeMax=N → hinted TTF binary
"""

import io
import json
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

try:
    from ttfautohint import ttfautohint as _ttfautohint  # type: ignore
    from ttfautohint.info import version as _hinter_version  # type: ignore
    _LOAD_ERROR: str | None = None
except Exception as e:  # pragma: no cover — only fires when the dep is missing
    _ttfautohint = None
    _hinter_version = None
    _LOAD_ERROR = str(e)

# Match the Node route's safety caps.
MAX_BYTES = 8 * 1024 * 1024  # 8 MB
SUBPROCESS_TIMEOUT_SECONDS = 30


def _clamp_int(raw: str | None, lo: int, hi: int, default: int) -> int:
    if raw is None:
        return default
    try:
        v = int(raw)
    except ValueError:
        return default
    return max(lo, min(hi, v))


class handler(BaseHTTPRequestHandler):  # Vercel Python entrypoint convention
    def do_GET(self) -> None:  # noqa: N802 — Vercel convention
        """Cheap health check — the UI uses this to decide whether to show the toggle."""
        if _ttfautohint is None:
            body = json.dumps(
                {"available": False, "reason": f"ttfautohint-py import failed: {_LOAD_ERROR}"}
            ).encode("utf-8")
            self._send(200, "application/json", body)
            return
        version = "unknown"
        if _hinter_version is not None:
            try:
                version = str(_hinter_version())
            except Exception as e:  # pragma: no cover
                version = f"unknown ({e})"
        body = json.dumps({"available": True, "version": version}).encode("utf-8")
        self._send(200, "application/json", body)

    def do_POST(self) -> None:  # noqa: N802 — Vercel convention
        if _ttfautohint is None:
            self._error(
                503,
                f"Hinting unavailable: ttfautohint-py failed to load ({_LOAD_ERROR}).",
            )
            return

        content_length = int(self.headers.get("Content-Length", "0") or "0")
        if content_length == 0:
            self._error(400, "Empty body — POST a TTF binary.")
            return
        if content_length > MAX_BYTES:
            self._error(
                413,
                f"Font is {content_length / 1024 / 1024:.1f} MB; max {MAX_BYTES // 1024 // 1024} MB.",
            )
            return

        raw = self.rfile.read(content_length)
        if len(raw) < 4:
            self._error(400, "Body too short to be a font binary.")
            return
        # SFNT TTF magic: 0x00010000. Reject CFF/OTF (0x4F54544F == 'OTTO').
        magic = (raw[0] << 24) | (raw[1] << 16) | (raw[2] << 8) | raw[3]
        if magic != 0x00010000:
            self._error(
                400,
                "Not a TTF — sfntVersion is not 0x00010000. (OTF/CFF must be "
                "converted to glyf first.)",
            )
            return

        # Parse query string for hint-range overrides.
        qs = parse_qs(urlparse(self.path).query)
        range_min = _clamp_int(qs.get("rangeMin", [None])[0], 4, 50, 8)
        range_max = _clamp_int(qs.get("rangeMax", [None])[0], range_min, 200, 50)

        in_stream = io.BytesIO(raw)
        out_stream = io.BytesIO()
        try:
            _ttfautohint(
                in_file=in_stream,
                out_file=out_stream,
                hinting_range_min=range_min,
                hinting_range_max=range_max,
                no_info=True,
            )
        except Exception as e:  # noqa: BLE001
            self._error(500, f"ttfautohint failed: {e}")
            return

        hinted = out_stream.getvalue()
        self.send_response(200)
        self.send_header("Content-Type", "font/ttf")
        self.send_header("Content-Length", str(len(hinted)))
        self.send_header("X-Hinter", "ttfautohint-py")
        self.send_header("X-Hint-Range", f"{range_min}-{range_max}")
        self.end_headers()
        self.wfile.write(hinted)

    # --- helpers -----------------------------------------------------

    def _send(self, status: int, content_type: str, body: bytes) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _error(self, status: int, message: str) -> None:
        body = json.dumps({"error": message}).encode("utf-8")
        self._send(status, "application/json", body)

    def log_message(self, format: str, *args: object) -> None:  # noqa: A002
        """Silence the default per-request stderr noise."""
        return
