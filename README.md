Ghostery modified to allow automation of detection




Installation
------------

* Install firefox
* Open firefox and install modified addon from this project. File is named 'ghostery-2.8.3-fx+sm.xpi' and can be added using the tools menu in the addons manager
* Install window and tab limiter. This prevents firefox from being overloaded with tabs
* Modify the setting browser.dom.window.dump.enabled to true (This enabled output to the actual console, meaning it can be piped out by a command)
* Download the top 1M sites from alexa from and save in the root of the project http://s3.amazonaws.com/alexa-static/top-1m.csv.zip
* Run analyse.py to analyse the sites








