// WebCrypto-based client for Firefox Sync.
// Requires hawk_creds.js from https://github.com/mozilla-b2g/firefoxos-loop-client/

(function(window) {
  // FIXME: Discuss whether documentation on
  // http://docs.services.mozilla.com/sync/storageformat5.html
  // should be updated to mention that this is the string to use:
  const HKDF_INFO_STR = 'identity.mozilla.com/picl/v1/oldsync';
 
  // constructor
  window.FirefoxSyncWebCrypto = function() {
    // Basic check for presence of WebCrypto
    if (!window || !window.crypto || !window.crypto.subtle) {
      throw new Error('This environment does not support WebCrypto');
    }

    this.mainSyncKey = null;
    this.defaultDecryptionKey = null;
  };

  // Conversion functions:
  function rawStringToByteArray(str) {
    var strLen = str.length;
    var byteArray = new Uint8Array(strLen);
    for (var i = 0, strLen; i < strLen; i++) {
      byteArray[i] = str.charCodeAt(i);
    }
    return byteArray;
  }

  function base64StringToByteArray(base64) {
    if (typeof base64 != 'string' || hexStr.length % 4 !== 0) {
      throw Error('Number of base64 digits must be a multiple of 4 to convert to bytes');
    }
    return rawStringToByteArray(window.atob(base64));
  }

  function hexStringToByteArray(hexStr) {
    if (typeof hexStr != 'string' || hexStr.length % 2 !== 0) {
      throw Error('Must have an even number of hex digits to convert to bytes');
    }
    var numBytes = hexString.length / 2;
    var byteArray = new Uint8Array(numBytes);
    for (var i = 0; i < numBytes; i++) {
      byteArray[i] = parseInt(hexStr.substr(i * 2, 2), 16); //FIXME: Can this be done faster?
    }
    return byteArray;
  }

  /*
   * setKeys
   */
  window.FirefoxSyncWebCrypto.prototype.setKeys = function(kB, cryptoKeysCiphertext, cryptoKeysIV, cryptoKeysHmac) { 
    var kBByteArray, cryptoKeysCiphertextByteArray, cryptoKeysIVByteArray, cryptoKeysHmacByteArray;

    // Input checking
    try {
      kBByteArray = hexStringToByteArray(kB);
    } catch (e) {
      return Promise.reject('Could not parse kB as a hex string');
    }
    try {
      cryptoKeysCiphertextByteArray = base64StringToByteArray(cryptoKeysCiphertext);
    } catch (e) {
      return Promise.reject('Could not parse cryptoKeysCiphertext as a base64 string');
    }
    try {
      cryptoKeysIVByteArray = base64StringToByteArray(cryptoKeysIV);
    } catch (e) {
      return Promise.reject('Could not parse cryptoKeysIV as a base64 string');
    }
    try {
      cryptoKeysHmacByteArray = hexStringToByteArray(cryptoKeysHmac);
    } catch (e) {
      return Promise.reject('Could not parse cryptoKeysHmac as a hex string');
    }

    // kB key stretching.
    // The number 64 here comes from (256 bits for AES + 256 bits for HMAC) / (8 bits per byte)
    window.hawkCredentials.then(function(hC) {    
      return hC.hkdf(kBByteArray, stringToByteArray(HKDF_INFO_STR), new Uint8Array(64), 64);
    }).then(function (output) {
      this.mainSyncKey = {
        aes: window.crypto.subtle.importKey('raw', output.slice(0, 32).buffer,
                                            { name: 'AES-CBC', length: 256 }, true, [ 'encrypt', 'decrypt' ]),
        hmac: window.crypto.subtle.importKey('raw', output.slice(32).buffer,
                                            { name: 'AES-CBC', length: 256 }, true, [ 'verify' ])
      };
    }).then(function() {
      return crypto.subtle.decrypt({ name: 'AES-CBC', iv: cryptoKeysIVByteArray }, this.mainSyncKey.aes,
                            cryptoKeysCiphertextByteArray).then(function (keyBundleAB) {
        var cryptoKeysJSON = String.fromCharCode.apply(null, new Uint8Array(keyBundleAB));
        try {
          this.cryptoKeys = JSON.parse(cryptoKeysJSON);
        } catch(e) {
          return Promise.reject('Deciphered crypto keys, but not JSON');
        }
      }, function(err) {
        return Promise.reject('Could not decrypt crypto keys using AES part of stretched kB key');
      });
    });
  }

  window.FirefoxSyncWebCrypto.prototype.verifyAndDecryptRecord = function(payload, collectionName) {
    var payload, keyBundle;
    try {
      payload = JSON.parse(record.payload);
    } catch(e) {
      return Promise.reject('Payload is not a JSON string');
    }
    try {
      keyBundle = selectKeyBundle(collectionName);
    } catch(e) {
      return Promise.reject('No key bundle found for ' + collectionName + ' - did you call setKeys?');
    }

    return crypto.subtle.verify({
      name: 'HMAC',
      hmac: base64ToByteArray(payload.hmac)
    }, keyBundle.hmac, base64ToByteArray(payload.ciphertext)).then(function (result) {
      if (!result) {
        return Promise.reject('Record verification failed with current hmac key for ' + collectionName);
      }
    }).then(function() {
      return crypto.subtle.decrypt({
        name: 'AES-CBC',
        iv: base64ToByteArray(payload.IV)
      }, keyBundle.aes, base64ToByteArray(payload.ciphertext)).then(function (recordArrayBuffer) {
        var recordObj;
        var recordJSON = String.fromCharCode.apply(null, new Uint8Array(recordArrayBuffer));
        try {
          recordObj = JSON.parse(recordJSON);
        } catch(e) {
          return Promise.reject('Deciphered record, but not JSON');
        }
        return recordObj;
      }, function(err) {
        return Promise.reject('Could not decrypt record using AES part of key bundle for collection ' + collectionName);
      });
    });
  }

  //...
  window.FirefoxSyncWebCrypto = FirefoxSyncCrypto;
})(window);
