function str2ba(str) {
  var buf = new ArrayBuffer(str.length); // 1 bytes for each char
  var bufView = new Uint8Array(buf);
  for (var i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return bufView;
}
function hexStringToByteArray(hexString) {
  if (hexString.length % 2 !== 0) {
    throw Error('Must have an even number of hex digits to convert to bytes');
  }
  var numBytes = hexString.length / 2;
  var byteArray = new Uint8Array(numBytes);
  for (var i = 0; i < numBytes; i++) {
    byteArray[i] = parseInt(hexString.substr(i * 2, 2), 16);
  }
  return byteArray;
}
function base64ToArrayBuffer(base64) {
  var binary_string = window.atob(base64);
  var len = binary_string.length;
  var bytes = new Uint8Array(len);
  for (var i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

function fetchAndDumpTabs() {
  SyncCredentials.getKeys().then(function (a) {
    console.log('success', a);
    window.key = a;
    window.kB = hexStringToByteArray(window.key.kB);
    return window.hawkCredentials;
  }).then(function (hC) {
    console.log('init');
    window.hC = hC;
    return window.hC.hkdf(window.kB, str2ba('identity.mozilla.com/picl/v1/oldsync'), new Uint8Array(64), 64);
  }).then(function (output) {
    window.encPlusHmac = output;
    console.log('See window.encPlusHmac.slice(0, 32) - next step: try to decrypt crypto/keys with that!');
    return window.encPlusHmac.slice(0, 32).buffer;
  }).then(function (bundleKey) {
    console.log('importing bundleKey', bundleKey)
    return window.crypto.subtle.importKey('raw', bundleKey, {
      name: 'AES-CBC',
      length: 256
    }, true, [
      'encrypt',
      'decrypt'
    ]
    );
  }).then(function (importedKey) {
    console.log('main sync key imported', importedKey);
    window.bKobj = importedKey;
    return App.ensureDb();
  }).then(function (db) {
    console.log('got db');
    return db.collection('crypto').list();
  }).then(function (result) {
    console.log('got result', result);
    window.cryptoCollRecords = result.data;
    window.firstCryptoCollObj = JSON.parse(window.cryptoCollRecords[0].payload);
    //convert payload.ciphertext and payload.iv from base64:
    window.cryptoKeysCiphertext = base64ToArrayBuffer(window.firstCryptoCollObj.ciphertext);
    window.cryptoKeysIV = base64ToArrayBuffer(window.firstCryptoCollObj.IV);
    console.log('imported ciphertext and IV', window.cryptoKeysCiphertext, window.cryptoKeysIV);
    //try to decrypt with imported main sync key:
    return crypto.subtle.decrypt({
      name: 'AES-CBC',
      iv: window.cryptoKeysIV
    }, window.bKobj, window.cryptoKeysCiphertext);
  }).then(function (keyBundle) {
    window.keyBundle = keyBundle;
    window.keyBundleObj = JSON.parse(String.fromCharCode.apply(null, new Uint8Array(window.keyBundle)));
    console.log('here is the keyBundle you were looking for:', window.keyBundle, window.keyBundleObj);
    return window.keyBundleObj;
  }).then(function (keyBundleObj) {
    console.log('fetching tabs');
    return App.ensureDb().then(function (db) {
      console.log('got db');
      return db.collection('tabs').list();
    });
  }).then(function (result) {
    console.log('got result', result);
    window.tabs = result.data;
    console.log('rendering tabs', tabs);
    return crypto.subtle.importKey('raw', base64ToArrayBuffer(keyBundleObj.default[0]), {
      name: 'AES-CBC',
      length: 256
    }, true, [
      'decrypt'
    ]);
  }).then(function (defaultCollDecKeyObj) {
    document.body.innerHTML = '<ul>';
    window.tabs.forEach(function (tab) {
      console.log('got tab', tab);
      var payload = JSON.parse(tab.payload);
      console.log('got payload', payload)
      crypto.subtle.decrypt({
        name: 'AES-CBC',
        iv: base64ToArrayBuffer(payload.IV)
      }, defaultCollDecKeyObj, base64ToArrayBuffer(payload.ciphertext)).then(function (recordAB) {
        var recordObj = JSON.parse(String.fromCharCode.apply(null, new Uint8Array(recordAB)));
        console.log('decrypted a record!', recordAB, recordObj);
        document.body.innerHTML += '</ul><h1>' + recordObj.clientName + '</h1><ul>';
        recordObj.tabs.forEach(function (tab) {
          document.body.innerHTML += tab.urlHistory[0];
        });
      });
    });
  },
  function (err) {
    console.log('oops', err);
  });
}


//...
fetchAndDumpTabs();
