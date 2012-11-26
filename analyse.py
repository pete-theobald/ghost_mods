

firefox_executable = 'C:/Program Files/Mozilla Firefox/firefox.exe'
firefox_max_tabs = 10

import threading


def generate_urls():
    import csv
    import zipfile
    import itertools
    sitesZip = zipfile.ZipFile('top-1m.csv.zip')
    sitesFile = csv.reader(sitesZip.open('top-1m.csv'))
    for row in itertools.islice(sitesFile,0,3):
        print row
        yield row[1]


import subprocess
from time import sleep

class firefox_wrapper(threading.Thread):
    def __init__(self,url):
        threading.Thread.__init__(self)
        self.url = url
        self.start()
    def run(self):
        subprocess.call( [firefox_executable, '-new-tab', 'http://www.%s' % self.url ] )
        
import sys
import BaseHTTPServer
from SimpleHTTPServer import SimpleHTTPRequestHandler

class ServerHandler(SimpleHTTPRequestHandler):

    def do_GET(self):
        SimpleHTTPServer.SimpleHTTPRequestHandler.do_GET(self)

    def do_POST(self):
        print self.headers
        SimpleHTTPServer.SimpleHTTPRequestHandler.do_GET(self)


class webserver(threading.Thread):
    def run(self):
        # Start basic webserver to catch ajax object dumps
        import sys
        import BaseHTTPServer
        from SimpleHTTPServer import SimpleHTTPRequestHandler

        HandlerClass = ServerHandler
        ServerClass  = BaseHTTPServer.HTTPServer
        Protocol     = "HTTP/1.0"

        self.httpd = ServerClass( ("127.0.0.1",8765), HandlerClass)
        HandlerClass.protocol_version = Protocol
        print "Serving HTTP"
        self.httpd.serve_forever()


if __name__ == '__main__':
    
    #initialise the webserver
    Webserver = webserver()
    Webserver.start()
    sleep(5)

    for url in generate_urls():
        # call firefox with the url to open. Firefox will start if not already running
        firefox_wrapper(url)

    Webserver.httpd.socket.close()



