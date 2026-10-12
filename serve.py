import http.server
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8767

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, format, *args):
        sys.stdout.write("[samurai] %s - %s\n" % (self.address_string(), format % args))

with socketserver.ThreadingTCPServer(("", PORT), NoCache) as httpd:
    print("samurai demo http://localhost:%d  (Ctrl-C to stop)" % PORT)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass