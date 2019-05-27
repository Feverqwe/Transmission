import "whatwg-fetch";
import arrayBufferToBase64 from "./tools/arrayBufferToBase64";
import getLogger from "./tools/getLogger";
import ErrorWithCode from "./tools/errorWithCode";
import promiseFinally from "./tools/promiseFinally";

const serializeError = require('serialize-error');

const logger = getLogger('tabUrlFetch');

!window.tabUrlFetch && (() => {
  window.tabUrlFetch = true;

  chrome.runtime.onMessage.addListener((message, sender, response) => {
    let promise = null;

    switch (message && message.action) {
      case 'fetchUrl': {
        promise = closeLockWrap(fetchUrl(message.url));
        break;
      }
      default: {
        promise = Promise.reject(new Error('Unknown request'));
      }
    }

    if (promise) {
      promise.then((result) => {
        response({result});
      }, (err) => {
        response({error: serializeError(err)});
      }).catch((err) => {
        logger.error('Send response error', err);
      });
      return true;
    }
  });

  function fetchUrl(url) {
    return fetch(url).then((response) => {
      if (!response.ok) {
        throw new ErrorWithCode(`${response.status}: ${response.statusText}`, `RESPONSE_IS_NOT_OK`);
      }

      if (response.headers.get('Content-Length') > 1024 * 1024 * 10) {
        throw new ErrorWithCode(`Size is more then 10mb`, 'FILE_SIZE_EXCEEDED');
      }

      const {headers, ...safeResponse} = response;
      safeResponse.headers = Array.from(headers.entries());

      return response.arrayBuffer().then((arrayBuffer) => {
        return {response: safeResponse, base64: arrayBufferToBase64(arrayBuffer)};
      });
    });
  }

  let lockCount = 0;
  function closeLockWrap(promise) {
    if (++lockCount === 1) {
      window.onbeforeunload = () => true;
    }
    return promise.then(...promiseFinally(() => {
      if (--lockCount === 0) {
        window.onbeforeunload = null;
      }
    }));
  }
})();