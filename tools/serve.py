#!/usr/bin/env python3
"""Preview synthe.live locally with caching turned off, so every reload shows your latest edit.

  python3 tools/serve.py            # http://127.0.0.1:8790
  python3 tools/serve.py 8000       # another port
"""
import functools
import http.server
import sys
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8790
    handler = functools.partial(NoCacheHandler, directory=str(SITE))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
    print(f"Serving {SITE} at http://127.0.0.1:{port} (no cache)")
    server.serve_forever()
