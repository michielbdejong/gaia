/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */


'use strict';

/* global
  expect,
  MocksHelper,
  MockIACPort,
  require,
  requireApp,
  setup,
  sinon,
  suite,
  teardown,
  test
*/


requireApp('system/test/unit/mock_iac_handler.js');
requireApp('sync/test/unit/improved_mock_lazy_loader.js');

requireApp('sync/js/bootstrap.js');

requireApp('sync/js/crypto/stringconversion.js');
requireApp('sync/js/crypto/keyderivation.js');
requireApp('sync/js/crypto/fxsyncwebcrypto.js');
requireApp('sync/js/ext/kinto.min.js');
requireApp('sync/js/sync-engine/syncengine.js');
requireApp('sync/js/adapters/history.js');
requireApp('sync/js/adapters/bookmarks.js');
require('/shared/js/sync/errors.js');

requireApp('sync/js/test/unit/fixtures/fetch.js');

var mocksForBootstrap = new MocksHelper([
  'IACHandler',
  'IACPort',
  'LazyLoader'
]).init();

suite('Sync app', function() {
  this.timeout(1000);

  mocksForBootstrap.attachTestHelpers();

  suite('Sync request', function() {
    const IAC_EVENT = 'iac-gaia::sync::request';

    var fetchSpy, realFetch, LazyLoader;
    var consoleErrorSpy;
    var postMessageSpy;

    setup(function() {
      consoleErrorSpy = sinon.spy(console, 'error');
      postMessageSpy = sinon.spy(MockIACPort, 'postMessage');

      LazyLoader = {
        load() {
          return Promise.resolve();
        }
      };

      console.log(sinon.spy, 'this.sinon');
      realFetch = window.fetch;
      // Spying directly on window.fetch is not allowed, so wrapping it in an
      // anonymous function first.
      fetchSpy = this.sinon.spy(function() {
        var response = fetchSpy.responses.shift();
        console.log('fetchSpy called', arguments, response);
        if (!fetchSpy.mockUnreachable) {
          return Promise.resolve(response);
        } else {
          return realFetch.apply(window, arguments);
        }
      });
      fetchSpy.responses = [];
      window.fetch = fetchSpy;
      console.log('fetchSpy', fetchSpy);
    });

    teardown(function() {
      consoleErrorSpy.restore();
      postMessageSpy.restore();
      window.fetch = realFetch;
    });

    test('invalid sync request', function() {
      window.dispatchEvent(new CustomEvent(IAC_EVENT));
      expect(fetchSpy.called).to.equal(false);
    });


    test('url without version', function(done) {
      var id = Date.now();
      window.dispatchEvent(new CustomEvent(IAC_EVENT, {
        detail: {
          id: id,
          URL: 'url',
          assertion: 'assertion',
          keys: { kB: 'kB' },
          collections: {
            history: { readOnly: true },
            bookmarks: { readOnly: true }
          }
        }
      }));
      setTimeout(function() {
        expect(postMessageSpy.called).to.equal(true);
        expect(postMessageSpy.args[0][0].id).to.equal(id);
        expect(postMessageSpy.args[0][0].error.message).to.equal(`The remote UR\
L must contain the version: url`);
        done();
      }, 50); // TODO: get rid of this timing issue
    });

  // test('server unreachable', function(done) {
  //   fetchSpy.mockUnreachable = true;
  //   var id = Date.now();
  //   window.dispatchEvent(new CustomEvent(IAC_EVENT, {
  //     detail: {
  //       id: id,
  //       URL: 'http://example.com/v1/',
  //       assertion: 'assertion',
  //       keys: { kB: 'kB' },
  //       collections: {
  //         history: { readOnly: true },
  //         bookmarks: { readOnly: true }
  //       }
  //     }
  //   }));
  //   setTimeout(function() {
  //     console.log('fetchSpy.args', fetchSpy.args);
  //     expect(postMessageSpy.called).to.equal(true);
  //     expect(postMessageSpy.args[0][0].id).to.equal(id);
  //     expect(postMessageSpy.args[0][0].error.message).to.equal(`try later`);
  //     done();
  //   }, 500); // TODO: get rid of this timing issue
  // });

    test('bogus server response', function(done) {
      fetchSpy.responses.push({
        status: 200,
        response: 'bogus'
      });
      var id = Date.now();
      window.dispatchEvent(new CustomEvent(IAC_EVENT, {
        detail: {
          id: id,
          URL: 'http://example.com/v1/',
          assertion: 'assertion',
          keys: { kB: 'kB' },
          collections: {
            history: { readOnly: true },
            bookmarks: { readOnly: true }
          }
        }
      }));
      setTimeout(function() {
        console.log('fetchSpy.args', fetchSpy.args);
        expect(postMessageSpy.called).to.equal(true);
        expect(postMessageSpy.args[0][0].id).to.equal(id);
        expect(postMessageSpy.args[0][0].error.message).to.equal(`try later`);
        done();
      }, 500); // TODO: get rid of this timing issue
    });

    test('success', function(done) {
      // TODO: capture both args and responses of fetch in a real run.
      fetchSpy.responses.push({
        status: 200,
        response: 'bogus'
      });
      var id = Date.now();
      window.dispatchEvent(new CustomEvent(IAC_EVENT, {
        detail: {
          id: id,
          URL: 'https://syncto.dev.mozaws.net/v1/',
          assertion: 'assertion',
          keys: { kB: 'kB' },
          collections: {
            history: { readOnly: true },
            bookmarks: { readOnly: true }
          }
        }
      }));
      setTimeout(function() {
        console.log('fetchSpy.args', fetchSpy.args);
        //expect(fetchSpy.args).to.deep.equal(FetchArgsExpected);
        expect(postMessageSpy.called).to.equal(true);
        expect(postMessageSpy.args[0][0].id).to.equal(id);
        expect(postMessageSpy.args[0][0].error.message).to.equal(`try later`);
        done();
      }, 500); // TODO: get rid of this timing issue
    });
  });
});
