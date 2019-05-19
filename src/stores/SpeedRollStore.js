import {types} from "mobx-state-tree";

/**
 * @typedef {Object} SpeedRollStore
 * @property {{download:number,upload:number,time:number}[]} data
 * @property {function} add
 * @property {function} clean
 * @property {function} setData
 * @property {*} minSpeed
 * @property {*} maxSpeed
 * @property {*} minTime
 * @property {*} maxTime
 * @property {function} getDataFromTime
 */
const SpeedRollStore = types.model('SpeedRollStore', {
  data: types.array(types.model({
    download: types.number,
    upload: types.number,
    time: types.identifierNumber
  })),
}).actions((self) => {
  return {
    add(download, upload) {
      self.data.push({
        download, upload,
        time: Date.now()
      });

      self.clean();
    },

    clean() {
      const oldestTime = Date.now() - 5 * 60 * 1000;
      while (self.data.length && self.data[0].time < oldestTime) {
        self.data.shift();
      }
    },

    setData(data) {
      self.data = data;
    }
  };
}).views((self) => {
  return {
    get minSpeed() {
      return 0;
    },
    get maxSpeed() {
      let maxSpeed = 0;
      let minTime = self.minTime;
      for (let i = self.data.length - 1; i > 0; i--) {
        const item = self.data[i];
        if (item.time < minTime) {
          break;
        }
        const max = Math.max(item.download, item.upload);
        if (maxSpeed < max) {
          maxSpeed = max;
        }
      }
      return maxSpeed;
    },
    get minTime() {
      return self.maxTime - 60 * 1000;
    },
    get maxTime() {
      let result = 0;
      if (self.data.length) {
        result = self.data[self.data.length - 1].time;
      }
      return result;
    },
    getDataFromTime(minTime) {
      const result = [];
      for (let i = self.data.length - 1; i > 0; i--) {
        const item = self.data[i];
        if (item.time < minTime) {
          break;
        }
        result.unshift(item.toJSON());
      }
      return result;
    },
  };
});

export default SpeedRollStore;