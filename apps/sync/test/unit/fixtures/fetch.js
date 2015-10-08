/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

'use strict';

/* exported
  FetchArgsExpected
*/

var FetchArgsExpected = [
  [
    'https://syncto.dev.mozaws.net/v1/',
    {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    }
  ],
  [
    'https://syncto.dev.mozaws.net/v1/buckets/syncto/collections/meta/records',
    {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: 'BrowserID assertion',
        'X-Client-State': '518fef27c6bbc0220aab0f00b1a37308'
      }
    }
  ],
  [
    'https://syncto.dev.mozaws.net/v1/',
    {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    }
  ],
  [
    'https://syncto.dev.mozaws.net/v1/buckets/syncto/collections/crypto/' +
        'records',
    {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: 'BrowserID assertion',
        'X-Client-State': '518fef27c6bbc0220aab0f00b1a37308'
      }
    }
  ],
  [
    'https://syncto.dev.mozaws.net/v1/',
    {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    }
  ],
  [
    'https://syncto.dev.mozaws.net/v1/',
    {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    }
  ],
  [
    'https://syncto.dev.mozaws.net/v1/buckets/syncto/collections/history/' +
        'records',
    {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: 'BrowserID assertion',
        'X-Client-State': '518fef27c6bbc0220aab0f00b1a37308'
      }
    }
  ],
  [
    'https://syncto.dev.mozaws.net/v1/buckets/syncto/collections/bookmarks/' +
        'records',
    {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: 'BrowserID assertion',
        'X-Client-State': '518fef27c6bbc0220aab0f00b1a37308'
      }
    }
  ]
];
