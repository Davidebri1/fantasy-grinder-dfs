import os
import sys
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

PORT = 7889
BUILD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dist')

class SPANavHandler(SimpleHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BUILD_DIR, **kwargs)

    def do_GET(self):
        path = self.translate_path(self.path)
        if not os.path.exists(path):
            self.path = '/index.html'
        elif os.path.isdir(path) and not os.path.exists(os.path.join(path, 'index.html')):
            self.path = '/index.html'
        return super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

if __name__ == '__main__':
    port = PORT
    if len(sys.argv) > 1:
        port = int(sys.argv[1])
    server_address = ('127.0.0.1', port)
    httpd = ThreadingHTTPServer(server_address, SPANavHandler)
    httpd.daemon_threads = True
    print(f"React Web SPA multithreaded server running on http://127.0.0.1:{port}", flush=True)
    httpd.serve_forever()
