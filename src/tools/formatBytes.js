const filesize = require('filesize');

const sizeList = JSON.parse(chrome.i18n.getMessage('sizeList'));

const formatBytes = (bytes) => {
  return filesize(bytes, {
    fullform: true,
    fullforms: sizeList
  });
};

export default formatBytes;