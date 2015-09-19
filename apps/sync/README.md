# Trying out the Sync app

The Sync app is still under construction, but with this branch, you can already test some parts of it:

* Run [Syncto](https://github.com/mozilla-services/syncto) on localhost.
* Check out this branch
* cd gaia && rm -r profile && make
* BUILD_APP_NAME=sync make ; /Applications/B2G.app/Contents/MacOS/b2g-bin -start-debugger-server 6000 -profile \`pwd\`/profile
* Go to the Sync app with WebIDE, and click 'Sync Now'.
* You should see the tabs and history data come in.
* Edit apps/sync/js/demo.js near line 72 to select which of the 4 supported collections to sync.
