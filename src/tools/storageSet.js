import copyData from "./copyData";

const storageSet = (data, area = 'local') => {
  return new Promise((resolve, reject) => chrome.storage[area].set(copyData(data), (result) => {
    const err = chrome.runtime.lastError;
    err ? reject(err) : resolve(result);
  }));
};

export default storageSet;