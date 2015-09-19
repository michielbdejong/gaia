/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

/* global
  LazyLoader,
  SyncEngine
*/

/* exported
  App,
  DataAdapters
*/

var DataAdapters = {
  // To be filled by js/adapters/*.js
};

var App = Object.freeze((() => {
  const loadMainScripts = () => {
    if (typeof SyncEngine !== 'undefined') {
      return Promise.resolve();
    }
    return LazyLoader.load([
      'js/crypto/stringconversion.js',
      'js/crypto/keyderivation.js',
      'js/crypto/fxsyncwebcrypto.js',

      'js/ext/kinto-61ad959.dev.js',
      'js/sync-engine/syncengine.js'
    ]);
  };

  const loadAdapterScript = (collectionName) => {
    if (typeof DataAdapters[collectionName] !== 'undefined') {
      return Promise.resolve();
    }
    return LazyLoader.load(`js/adapters/${collectionName}.js`);
  };

  return {
    /**
      * @param request {Object} Should contain the following fields:
      *                         * assertion
      *                         * keys
      *                         * collections
      *                         * URL (of the Syncto server)
      */
    handleSyncRequest(request) {
      console.log('Loading main scripts');
      return loadMainScripts().then(() => {
        console.log('Loading adapters', request.collections);
        return Promise.all(request.collections.map(collectionName => {
          return loadAdapterScript(collectionName);
        }));
      }).then(() => {
        console.log('Constructing SyncEngine');
        var se = new SyncEngine({
          kB: request.keys.kB,
          URL: request.URL,
          assertion: request.assertion,
          adapters: DataAdapters
        });

        console.log('SyncEngine#syncNow (watch Network tab)');
        return se.syncNow(request.collections);
      }).catch(err => console.error('handleSyncRequest error', err));
    }
  };
})());
