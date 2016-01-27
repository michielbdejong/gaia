'use strict';

/* global 
  DataAdapters,
  asyncStorage
*/

const PASSWORD_LAST_SYNC = '::collections::passwords::last_sync';
const PASSWORD_KEYS_KEY = '::collections::passwords::keys';

var PasswordHelper = (() => {
  var _store = null;

  function _ensureStore() {
    if (_store !== null) {
      return Promise.resolve(_store);
    }

    return navigator.getDataStores('sync_passwords_store').then(stores => {
      _store = stores[0];
      return _store;
    });
  }

  function getLastSync(userId) {
    return new Promise((resolve) => {
      asyncStorage.getItem(userId + PASSWORD_LAST_SYNC, resolve);
    });
  }

  function setLastSync(userId, when) {
    return new Promise((resolve) => {
      console.log('-----> have to setup last sync at ',
          when, 'for ', asyncStorage);
      asyncStorage.setItem(userId + PASSWORD_LAST_SYNC, when, resolve);
    });
  }

  function clearLastSync(userId) {
    return new Promise((resolve) => {
      asyncStorage.removeItem(userId + PASSWORD_LAST_SYNC, resolve);
    });
  }

  function updateLocalPasswords(userId, passwordsList) {
    var now = Date.now();
    return _ensureStore().then((store) => {
      var operations = passwordsList.map((passwordEntry) => {
        return updateOrCreate(userId, passwordEntry);
      });
      return Promise.all(operations).then((results) => {
        return setLastSync(userId, now);
      });
    });
  }

  /**
   * To identify a password record we will use a combination
   * of the hostname and form where it's applied.
   */
  function getRecordKey(pw) {
    return pw.payload.hostname + '_' + pw.payload.formSubmitURL;
  }

  /**
   * Given a password entry, add or modify our current copy.
   * The current entry that we will get from kinto looks like:
   * {
        "id": "{2558f612-8ef4-634d-a603-2640dbb39147}",
        "last_modified": 1452618131840,
        "payload": {
          "id": "{2558f612-8ef4-634d-a603-2640dbb39147}",
          "hostname": "https://example.com",
          "formSubmitURL": "https://example.com",
          "httpRealm": null,
          "username": "myusername",
          "password": "mypassword",
          "usernameField": "username",
          "passwordField": "password",
          "timeCreated": 1452165396209,
          "timePasswordChanged": 1452165396209
        },
        "_status": "synced"
      }

      We will keep entries with the same format, and the key
      to recover it locally will be a combination of entry id
      and password key (see function above): <userId><pw key>

      We also keep a list with all the keys for an specific user
      in a KNOW record in the Datastore.
   */
  function updateOrCreate(userId, password) {
    if (!userId || !password) {
      return Promise.resolve(false);
    }

    var key = userId + getRecordKey(password);
    return _ensureStore().then((store) => {
      return store.put(password, key);
    }).then(() => {
      console.log('------------------------->>> made the put to the ' +
          'datastore for key ', key);
      return getKeysForUser(userId);
    }).then((keys) => {
        if (keys.indexOf(key) > 0) {
          console.log('--------> password updated');
          return Promise.resolve('updated');
        }
        keys.push(key);
        return setKeysForUser(userId, keys).then(() => {
          console.log('--------> password created');
          return Promise.resolve('created');
        });
    });
  }

  /**
   * Returns the keys (all passwords) for an specific user
   */
  function getKeysForUser(userId) {
    var key = userId + PASSWORD_KEYS_KEY;
    return _ensureStore().then((store) => {
      return store.get(key).then((result) => {
        if (!Array.isArray(result)) {
          result = [];
        }
        return result;
      });
    });
  }

  function setKeysForUser(userId, keys) {
    var key = userId + PASSWORD_KEYS_KEY;
    return _ensureStore().then((store) => {
      return store.put(keys, key);
    });
  }

  function applyModifications(userId, passwordsList) {
    var updateOrCreate = [];
    var remove = [];

    passwordsList.forEach((pwEntry) => {
      if (pwEntry.payload.deleted) {
        remove.push(pwEntry);
      } else {
        updateOrCreate(pwEntry);
      }
    });

    var ops = [
      updateLocalPasswords(userId, updateOrCreate),
      removeLocalPasswords(userId, remove)
    ];

    var now = Date.now();
    return Promise.all(ops).then(() => {
      return setLastSync(userId, now);
    });
  }

  function removeLocalPasswords(userId, passwords) {
    if (!userId || !Array.isArray(passwords)) {
      return Promise.resolve(false);
    }

    if (passwords.length === 0) {
      return Promise.resolve(true);
    }

    return Promise.resolve(true);
  }

  return {
    getLastSync,
    setLastSync,
    clearLastSync,
    applyModifications
  };
})();

DataAdapters.passwords = {
  update: function(passwordsCollection, options = { readonly: true }) {
    if (!options.readonly) {
      return Promise.resolve(false);
    }

    return passwordsCollection.list().then((list) => {
      console.log('-------->>> USER ID IS ', options.userid);
      return PasswordHelper.getLastSync(options.userid).then((lastSync) => {
        var passwordList = list.data.sort((a, b) => {
          return b.last_modified - a.last_modified;
        });
        console.log('Last sync happened at ', lastSync);
        // passwordList.forEach(pw => {
        //   console.log('====');
        //   console.log(JSON.stringify(pw));
        // });
        var lastSyncIndex = passwordList.findIndex((item) => {
          //console.log('-----> checking against ', JSON.stringify(item));
          return lastSync > item.last_modified;
        });
        console.log('-----> last sync index is ', lastSyncIndex,
            'with ', passwordList.length);
        if (lastSyncIndex < 0) {
          lastSyncIndex = passwordList.length + 1;
        }
        return passwordList.slice(0, lastSyncIndex);
      }).then((modifications) => {
        console.log('List of modifications ---------->> ',
            modifications.length);
        modifications.forEach(mod => {
          console.log(JSON.stringify(mod));
        });
        return PasswordHelper.applyModifications(options.userid, modifications);
      }).then((result) => {
        // Read only
        return Promise.resolve(false);
      }).catch((error) => {
        console.error('Passwords DataAdapter error: ', error);
        throw error;
      });
    });
  },

  /*
   * handleConflict - Decide how to resolve a Kinto conflict.
   *
   * @param {Object} conflict - A Kinto conflict, see
   * http://kintojs.readthedocs.org/en/latest/api/#resolving-conflicts-manually
   *
   * @returns {Promise} We will resolve the conflicts by returning the latest
   * password updated.
   */
  handleConflict: function(conflict) {
    var resolution = conflict.local.last_modified > 
      conflict.remote.last_modified ? conflict.local : conflict.remote;
    return Promise.resolve(resolution);
  },

  reset: function(options) {
    return Promise.resolve(`Reset passwords for ${options.userid}.`);
  }
};
