const utStateToText = (torrent) => {
  const {state, progress, progressStr, status} = torrent;
  if (state & 32) { // paused
    if (state & 2) {
      //OV_FL_CHECKED //Progress
      return chrome.i18n.getMessage('OV_FL_CHECKED') + ' ' + progressStr;
    } else {
      //OV_FL_PAUSED
      return chrome.i18n.getMessage('OV_FL_PAUSED');
    }
  } else
  if (state & 1) { // started, seeding or leeching
    let statusText = '';
    if (progress === 1000) {
      //OV_FL_SEEDING
      statusText = chrome.i18n.getMessage('OV_FL_SEEDING');
    } else {
      //OV_FL_DOWNLOADING
      statusText = chrome.i18n.getMessage('OV_FL_DOWNLOADING');
    }
    if (!(state & 64)) {
      return "[F] " + statusText;
    } else {
      return statusText;
    }
  } else
  if (state & 2) { // checking
    //OV_FL_CHECKED //Progress
    return chrome.i18n.getMessage('OV_FL_CHECKED') + ' ' + progressStr;
  } else
  if (state & 16) { // error
    //OV_FL_ERROR //Progress
    let error = status;
    if (error && chrome.i18n.getMessage('lang') !== 'en' && error.substr(0, 6) === 'Error:') {
      const errMsg = chrome.i18n.getMessage('OV_FL_ERROR');
      error = errMsg + error.substr(5);
    }
    return error || chrome.i18n.getMessage('OV_FL_ERROR');
  } else
  if (state & 64) { // queued
    if (progress === 1000) {
      //OV_FL_QUEUED_SEED
      return chrome.i18n.getMessage('OV_FL_QUEUED_SEED');
    } else {
      //OV_FL_QUEUED
      return chrome.i18n.getMessage('OV_FL_QUEUED');
    }
  } else
  if (progress === 1000) { // finished
    //OV_FL_FINISHED
    return chrome.i18n.getMessage('OV_FL_FINISHED');
  } else { // stopped
    //OV_FL_STOPPED
    return chrome.i18n.getMessage('OV_FL_STOPPED');
  }
};

export default utStateToText;