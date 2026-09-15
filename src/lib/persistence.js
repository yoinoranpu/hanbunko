import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";

const keyFor = (index) => `hanbunko-cell-${index}`;

export async function saveCellRecord(index, record) {
  await idbSet(keyFor(index), record);
}

export async function loadCellRecord(index) {
  return idbGet(keyFor(index));
}

export async function clearCellRecord(index) {
  await idbDel(keyFor(index));
}
