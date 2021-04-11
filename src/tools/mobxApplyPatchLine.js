import {isObjectOrArray} from "./mobxPatchLine";
import {applyPatch, applySnapshot} from "mobx-state-tree";
import ErrorWithCode from "./errorWithCode";

const mobxApplyPatchLine = (target, session, delta) => {
  const {id, type, patchId, branches, result} = delta;
  switch (type) {
    case 'snapshot': {
      const snapshot = result;
      if (branches) {
        mobxApplySnapshotBranches(target, snapshot, branches);
      } else {
        applySnapshot(target, snapshot);
      }
      session.id = id;
      session.patchId = patchId;
      break;
    }
    case 'patch': {
      const patch = result;
      try {
        if (id !== session.id) {
          throw new Error('store id is changed');
        }
        if (patchId !== session.patchId) {
          applyPatch(target, patch);
          session.patchId = patchId;
        }
      } catch (_err) {
        session.id = null;
        session.patchId = null;
        const err = new ErrorWithCode('Apply path error', 'APPLY_PATH_ERROR');
        err.original = _err;
        throw err;
      }
      break;
    }
  }
};

function mobxApplySnapshotBranches(target, snapshot, branches) {
  for (let i = 0, len = branches.length; i < len; i++) {
    const key = branches[i];
    const snapshotBranch = snapshot[key];
    const targetBranch = target[key];
    if (!isObjectOrArray(targetBranch) || !isObjectOrArray(snapshotBranch)) {
      target[key] = snapshotBranch;
    } else {
      applySnapshot(targetBranch, snapshotBranch);
    }
  }
}

export default mobxApplyPatchLine;
