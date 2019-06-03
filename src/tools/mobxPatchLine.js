import {onPatch} from "mobx-state-tree";
import ErrorWithCode from "./errorWithCode";

const INDEX_LIMIT = 1E9;

class MobxPatchLine {
  constructor(store) {
    this.id = 'id-' + Math.trunc(Math.random() * 1000);

    this.patchLine = [];
    this.timeLine = [];
    this.idLine = [];

    this.index = 0;

    this.store = store;
    this.patchDisposer = null;

    this.init();
  }

  get patchId() {
    if (this.index > INDEX_LIMIT) {
      this.index = 0;
    }

    let id = -1;
    while (id === -1 || this.idLine.indexOf(id) !== -1) {
      id = ++this.index;
    }

    return id;
  }

  get lastPatchId() {
    return this.idLine[this.idLine.length - 1];
  }

  getDelta(id, fromPatchId) {
    const patchId = this.lastPatchId;
    try {
      if (id !== this.id) {
        throw new ErrorWithCode('ID_IS_NOT_EQUAL', 'ID_IS_NOT_EQUAL');
      }
      return {id: this.id, patchId, type: 'patch', result: this.getPatchAfterId(fromPatchId)};
    } catch (err) {
      if (['ID_IS_NOT_EQUAL', 'PATCH_ID_IS_NOT_FOUND'].indexOf(err.code) !== -1) {
        return {id: this.id, patchId, type: 'snapshot', result: this.getSnapshot()};
      }
      throw err;
    }
  }

  getSnapshot() {
    return this.store.toJSON();
  }

  getPatchAfterId(id) {
    const pos = this.idLine.indexOf(id);
    if (pos === -1) {
      throw new ErrorWithCode('PATCH_ID_IS_NOT_FOUND', 'PATCH_ID_IS_NOT_FOUND');
    }
    return this.patchLine.slice(pos + 1);
  }

  init() {
    if (this.patchDisposer) {
      this.patchDisposer();
    }

    this.patchDisposer = onPatch(this.store, this.handlePath);
  }

  handlePath = (patch) => {
    this.patchLine.push(patch);
    this.idLine.push(this.patchId);
    this.timeLine.push(Date.now());

    this.callClean();
  };

  cleanTimeoutId = null;
  callClean() {
    if (this.cleanTimeoutId !== null) return;
    this.cleanTimeoutId = setTimeout(() => {
      this.cleanTimeoutId = null;
      this.clean();
    }, 1000);
  }

  clean() {
    const oldestTime = Date.now() - 60 * 1000;
    let cornerIndex = -1;
    for (let i = 0; i < this.timeLine.length; i++) {
      if (this.timeLine[i] < oldestTime) {
        cornerIndex = i;
      } else {
        break;
      }
    }
    if (cornerIndex !== -1) {
      this.patchLine.splice(0, cornerIndex + 1);
      this.idLine.splice(0, cornerIndex + 1);
      this.timeLine.splice(0, cornerIndex + 1);
    }
  }

  destroy() {
    this.store = null;
    if (this.patchDisposer) {
      this.patchDisposer();
    }
    this.patchLine.splice(0);
    this.idLine.splice(0);
    this.timeLine.splice(0);
  }
}

export default MobxPatchLine;