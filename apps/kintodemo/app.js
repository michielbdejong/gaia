/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// const REMOTE = "http://5847e599.ngrok.com/v1/"
const REMOTE = "http://e32631f4.ngrok.io/v1/"
// const REMOTE = "http://localhost:8000/v1/"

function toCamelCase(str) {
  var rdashes = /-(.)/g;
  return str.replace(rdashes, (str, p1) => {
    return p1.toUpperCase();
  });
}

var IAC = {
  _ports: {},

  connect: function(portName) {
    if (this._ports[portName]) {
      return Promise.resolve(this._ports[portName]);
    }

    return new Promise((resolve, reject) => {
      navigator.mozApps.getSelf().onsuccess = event => {
        var app = event.target.result;
        app.connect(portName).then(ports => {
          if (!ports || !ports.length) {
            return reject();
          }
          this._ports[portName] = ports[0];
          resolve(this._ports[portName]);
        }).catch(reject);
      };
    });
  },

  request: function(portName, message) {
    return new Promise((resolve, reject) => {
      message.id = Date.now();
      
      var onmessage = (event) => {
        if (!event || !event.data) {
          return reject();
        }
        if (event.data.id != message.id) {
          return;
        }      
        resolve(event.data.result);
      };

      this.connect(portName).then(port => {
        if (port) {
          port.postMessage(message);
          port.onmessage = onmessage;
        } else {
          console.error('No ' + portName + ' port');          
          reject();
        }
      });
    });
  }
};

var CryptoAPI = {
  encrypt: function(clearText, symmetricKey, iv) {
    console.log('encrypt called:', clearText, symmetricKey, iv);
   // return IAC.request('weave-crypto', {
   //   method: 'encrypt',
   //   args: [clearText, symmetricKey, iv]
   // });
  },
  decrypt: function(cypherText, symmetricKey, iv) {
    console.log('decrypt called:', cypherText, symmetricKey, iv);
    //return IAC.request('weave-crypto', {
    //  method: 'decrypt',
    //  args: [cypherText, symmetricKey, iv]
    //});
  },
  generateRandomIV: function() {
    return IAC.request('weave-crypto', {
      method: 'generateRandomIV'
    });
  }
};

var SyncCredentials = {
  getKeys() {
    if (this._credentials) {
      return Promise.resolve(this._credentials);
    }

    return IAC.request('sync-credentials', {
      method: 'getKeys'
    }).then(credentials => {
      this._credentials = credentials;
      return this._credentials;
    });
  },
  getXClientState() {
    return IAC.request('sync-credentials', {
      method: 'getXClientState'
    });
  }
};

var App = {
  init: function() {
    // DOM elements.
    ['sync-tabs-button', 'sync-history-button'].forEach((id) => {
      this[toCamelCase(id)] = document.getElementById(id);
    });

    // Event listeners.
    this.syncTabsButton.addEventListener('click', App.syncTabs.bind(App));
    this.syncHistoryButton.addEventListener('click', App.syncHistory.bind(App));
  },

  ensureDb: function(assertion) {
    return this.getAssertion().then(assertion => {
      if (this._db) {
        return this._db;
      }
      return SyncCredentials.getXClientState().then(xClientState => {
        console.log('xClientState', xClientState);
        this._db = new Kinto({
          bucket: 'syncto',
          remote: REMOTE,
          headers: { 
            "Authorization": "BrowserID " + assertion,
            // XXX use generated client state
            "X-Client-State": xClientState
          }
        });
window.kinto = this._db;
        return this._db;
      });
    });
  },

  getAssertion: function() {
    if (this._assertion) {
      return Promise.resolve(this._assertion);
    }
    var self = this;
    return new Promise((resolve, reject) => {
      navigator.mozId.watch({
        wantIssuer: 'firefox-accounts',
        audience: 'https://token.services.mozilla.com/',
        onlogin: function(assertion) {
          self._assertion = assertion;
          resolve(assertion);
        },
        onerror: function(error) {
          reject(error);
        },
        onlogout: function() {},
        onready: function() {}
      });
      navigator.mozId.request();
    });
  },

  getTabsCollection() {
    if (this._tabs) {
      return Promise.resolve(this._tabs);
    }
    return this.ensureDb().then(db => {
      this._tabs = db.collection('tabs');
      //this._tabs = db.collection('meta');
      //this._tabs = db.collection('crypto');
      return this._tabs;
    });
  },

  renderTabs: function() {
    // Ideally we should store the data unencrypted instead of doing
    // the decryption while rendering it on the screen, but whatever,
    // this is just a prototype...
    SyncCredentials.getKeys().then(credentials => {
      this.getTabsCollection().then(tabsCollection => {
        return tabsCollection.list();
      }).then(result => {
        var tabs = result.tabs;
        console.log('rendering tabs', tabs);
        tabs.forEach(tab => {
          var payload = JSON.parse(payload);        
          CryptoAPI.decrypt(payload.cypherText, payload.iv);
        });
      });
    });
  },

  syncTabs: function() {
    console.log('Retrieving tabs collection... this may take several minutes on first run');
    this.getTabsCollection().then(tabs =>{
      console.log('Tabs ', tabs);
      tabs.sync().then(result => {
        console.log('Sync results ', result);
        window.payload = JSON.parse(result.updated[0].payload);
        console.log('have a look at window.payload!');
        this.renderTabs();
      }).catch(error => {
        console.error(error);
      });
    });
  },

  // ==== History ====
  getHistoryCollection() {
    if (this._history) {
      return Promise.resolve(this._history);
    }
    return this.ensureDb().then(db => {
      this._history = db.collection('history');
      return this._history;
    });
  },

  storeHistoryToDS: function(historyCollection) {
    this.getHistoryCollection().then(coll => {
      return coll.list();
    }).then(recordsData => {
      window.historyRecords = recordsData.data;
      SyncCrypto.decryptRecord(recordsData.data[0]).then(function(record) {
        console.log('decrypted first record', record);
      });
    });
  },

  syncHistory: function() {
    console.log('Retrieving history collection... this may take several minutes on first run');
    this.getHistoryCollection().then(history => {
      console.log('History ', history);
      history.sync().then(result => {
        console.log('Sync results ', result);
        this.storeHistoryToDS(result);
      });
    });

  },
};

window.addEventListener('DOMContentLoaded', App.init);
