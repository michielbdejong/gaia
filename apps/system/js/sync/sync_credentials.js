/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* exported SyncCredentials */

'use strict';

(function(exports) {
  var SyncCredentials = {
    getKeys: function() {
      return new Promise((resolve, reject) => {
        LazyLoader.load('js/fx_accounts_client.js', () => {
          FxAccountsClient.getKeys(resolve, reject);
        });
      });
    }
  };

  exports.SyncCredentials = SyncCredentials;
}(window));
