const storageRemove = (keys, area = 'local') => {
  return new Promise((resolve, reject) => chrome.storage[area].remove(keys, (result) => {
    const err = chrome.runtime.lastError;
    err ? reject(err) : resolve(result);
  }));
};

export default storageRemove;