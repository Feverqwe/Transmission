import ErrorWithCode from "./errorWithCode";

async function downloadFileFromUrl(url) {
  if (!/^(blob|https?):/.test(url)) {
    throw new ErrorWithCode('Link is not supported', 'LINK_IS_NOT_SUPPORTED');
  }

  return fetch(url).then(response => {
    if (!response.ok) {
      throw new ErrorWithCode(`${response.status}: ${response.statusText}`, `RESPONSE_IS_NOT_OK`);
    }

    if (response.headers.get('Content-Length') > 1024 * 1024 * 10) {
      throw new ErrorWithCode(`Size is more then 10mb`, 'FILE_SIZE_EXCEEDED');
    }

    return response.blob();
  }).then((blob) => {
    if (/^blob:/.test(url)) {
      URL.revokeObjectURL(url);
    }
    return {blob};
  });
}

export default downloadFileFromUrl;