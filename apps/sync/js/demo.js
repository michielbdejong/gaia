/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

/* global
  App
*/

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

var Demo = {
  init() {
    navigator.mozId.watch({
      wantIssuer: 'firefox-accounts',
      audience: 'https://token.services.mozilla.com/',
      onlogin: function(assertion) {
        IAC.request('sync-credentials', {
          method: 'getKeys'
        }).then(keys => {
          console.log('Got keys', keys);
          App.handleSyncRequest({
            assertion,
            keys,
            URL: 'http://localhost:8000/v1/',
            collections: [ 'history', 'bookmarks', 'passwords', 'tabs']
          }).then(
            result => console.log('Success', result),
            err => console.error('Error', err)
          );
        }, err => {
          console.log('Got error', err);
        });
      },
      onerror: function(error) {
        reject(error);
      },
      onlogout: function() {},
      onready: function() {}
    });
    document.getElementById('sync-button').onclick = () => {
      navigator.mozId.request({
        oncancel: function() {
          console.log('User killed dialog.');
        }
      });
    };
  }
};

//...
Demo.init();
