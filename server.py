"""Static server for the DELE A2 Spanish practice app (Python standard library only).

Run:  python server.py   then open http://localhost:8002
"""
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).with_name("static")
PORT = 8002

if __name__ == "__main__":
    handler = functools.partial(SimpleHTTPRequestHandler, directory=str(ROOT))
    print(f"Serving on http://localhost:{PORT}")
    ThreadingHTTPServer(("127.0.0.1", PORT), handler).serve_forever()
