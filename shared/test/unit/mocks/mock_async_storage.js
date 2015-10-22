/*exported MockasyncStorage */

'use strict';

var MockasyncStorage = {
  _mRawContent: {},
  getItem: function(key, callback) {
    callback(this._mRawContent[key]);
  },
  setItem: function(key, value, callback) {
    this._mRawContent[key] = value;
    callback();
  },
  removeItem: function(key, callback) {
    delete this._mRawContent[key];
  },
  clear: function(callback) {
    this._mRawContent = {};
    callback();
  }
};
