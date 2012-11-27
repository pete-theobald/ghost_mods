
firefox_executable = 'C:/Program Files/Mozilla Firefox/firefox.exe'
firefox_max_tabs = 10
top_n = 10
firefox_rate_limit = 1

import threading
import Queue
import subprocess
from time import sleep
import sys
import BaseHTTPServer
from SimpleHTTPServer import SimpleHTTPRequestHandler
import urllib


class logfile_wrapper(threading.Thread):
    def __init__(self):
        threading.Thread.__init__(self)
        self.queue = Queue.Queue()
        self.start()
    def send(self,item):
        self.queue.put( item )
    def run(self):
        logfile = open("logfile.json","w")
        logfile.write("[\n")
        while True:
            item = self.queue.get(True)
            logfile.write("%s,\n" % item)
        # Bug here - JSON format not correctly closed as no way to identify when all items have been sent
        # Easy fix is to manually add square bracket in text editor...
        logfile.close()
logfile = logfile_wrapper()

def generate_urls():
    '''
    Open the top million sites and read in the top rows
    '''
    import csv
    import zipfile
    import itertools
    sitesZip = zipfile.ZipFile('top-1m.csv.zip')
    sitesFile = csv.reader(sitesZip.open('top-1m.csv'))
    for row in itertools.islice(sitesFile,0,top_n):
        print row
        yield row[1]


def firefox_wrapper(url):
    '''
    Open the target url in firefox
    Modified ghostery plugin will send details of any tracker to webserver
    '''
    subprocess.call( [firefox_executable, '-new-tab', 'http://www.%s' % url ] )
    #Pause a little while. This combined with max tabs setting defines the time a page gets to load
    sleep(firefox_rate_limit)


class ServerHandler(SimpleHTTPRequestHandler):
    '''
    Identify any request containing trackers and send details to log
    '''
    def do_GET(self):
        if 'tracker/?' in self.path:
            print "TRACKER --> %s\n" % urllib.unquote(self.path)[10:]
            #Send tracker json to logfile thread
            logfile.send(urllib.unquote(self.path)[10:])
        SimpleHTTPRequestHandler.do_GET(self)
    def do_POST(self):
        SimpleHTTPRequestHandler.do_GET(self)


class webserver(threading.Thread):
    def start(self):
        #start the server but hang the calling thread for 5 seconds to make sure we're ready
        threading.Thread.start(self)
        sleep(5)
    def run(self):
        # Start basic webserver to catch ajax object dumps
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

    for url in generate_urls():
        # call firefox with the url to open. Firefox will start if not already running
        firefox_wrapper(url)

    sleep(60)
    Webserver.httpd.socket.close()



