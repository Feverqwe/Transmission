import copyData from "./copyData";

const callApi = (message) => {
  return new Promise((resolve, reject) => {
    // copyData for Firefox, it had problems with it...
    chrome.runtime.sendMessage(copyData(message), (response) => {
      const err = chrome.runtime.lastError;
      err ? reject(err) : resolve(response);
    });
  }).then((response) => {
    if (!response) {
      throw new Error('Response is empty');
    }
    if (response.error) {
      throw Object.assign(new Error(), response.error);
    }
    return response.result;
  });
};

export default callApi;