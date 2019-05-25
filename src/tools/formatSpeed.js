const filesize = require('filesize');

const sizePsList = JSON.parse(chrome.i18n.getMessage('sizePsList'));

const formatSpeed = (bytes) => {
  return filesize(bytes, {
    fullform: true,
    fullforms: sizePsList
  });
};

export default formatSpeed;