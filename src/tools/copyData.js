function copyData(obj) {
  // Firefox incorrect stringify mobx model when save in storage
  return JSON.parse(JSON.stringify({w: obj})).w;
}

export default copyData;