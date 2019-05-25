const readBlobAsArrayBuffer = (blob) => {
  const reader = new FileReader();
  const promise = fileReaderReady(reader);
  reader.readAsArrayBuffer(blob);
  return promise
};

function fileReaderReady(reader) {
  return new Promise((resolve, reject) => {
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.onerror = () => {
      reject(reader.error);
    };
  })
}

export default readBlobAsArrayBuffer;