"""Serve the map locally for previewing: python scripts/serve.py [port]

Python's built-in `http.server` ignores HTTP range requests, and the project boundary
(data/project_area.pmtiles) is read in ranges, as GitHub Pages serves it. This adds
single-range support and nothing else. Standard library only.
"""
import os
import re
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RANGE = re.compile(r"bytes=(\d*)-(\d*)$")


class RangeHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        match = RANGE.match(self.headers.get("Range", ""))
        path = self.translate_path(self.path)
        if not match or not os.path.isfile(path):
            return super().send_head()

        size = os.path.getsize(path)
        first, last = match.groups()
        if first == "":  # suffix range: the last N bytes
            start, end = max(size - int(last), 0), size - 1
        else:
            start, end = int(first), min(int(last) if last else size - 1, size - 1)
        if start > end or start >= size:
            self.send_error(416, "Requested range not satisfiable")
            return None

        f = open(path, "rb")
        f.seek(start)
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(end - start + 1))
        self.send_header("Accept-Ranges", "bytes")
        self.end_headers()
        self._remaining = end - start + 1
        return f

    def copyfile(self, source, outputfile):
        remaining = getattr(self, "_remaining", None)
        if remaining is None:
            return super().copyfile(source, outputfile)
        while remaining > 0:
            chunk = source.read(min(64 * 1024, remaining))
            if not chunk:
                break
            outputfile.write(chunk)
            remaining -= len(chunk)
        self._remaining = None


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    server = ThreadingHTTPServer(("127.0.0.1", port), partial(RangeHandler, directory=str(ROOT)))
    print(f"Serving {ROOT} at http://127.0.0.1:{port}/  (Ctrl+C to stop)")
    server.serve_forever()
