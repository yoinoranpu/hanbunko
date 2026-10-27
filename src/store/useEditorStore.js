import { create } from "zustand";
import { loadImageBitmap } from "../lib/loadImage";
import { getEffectiveSize, getInnerRect, coverFitScale } from "../lib/scene";
import { saveCellRecord, loadCellRecord, clearCellRecord } from "../lib/persistence";

const defaultCell = () => ({
  image: null,
  sourceBlob: null,
  fileName: "",
  transform: { scale: 1, offsetX: 0, offsetY: 0, rotation: 0 },
  frame: { type: "none", thickness: 0.5 },
  text: { content: "", position: "overlay-bottom", fontScale: 1 },
});

const PERSIST_DELAY = 250;
const persistTimers = [null, null];
// Serialize writes and deletions so an older write cannot resurrect a removed photo.
const persistQueues = [Promise.resolve(), Promise.resolve()];
const revisions = [0, 0];
const imageRequests = [0, 0];
let hydration;

function enqueue(index, operation) {
  const result = persistQueues[index].then(operation);
  persistQueues[index] = result.catch(() => {});
  return result;
}

function schedulePersist(get, index) {
  if (!get().cells[index].sourceBlob) return;
  const revision = ++revisions[index];
  get().setSaveState(index, "pending");
  clearTimeout(persistTimers[index]);
  persistTimers[index] = setTimeout(() => {
    const cell = get().cells[index];
    if (!cell.image || !cell.sourceBlob) return;
    enqueue(index, () => saveCellRecord(index, {
      blob: cell.sourceBlob,
      fileName: cell.fileName,
      transform: cell.transform,
      frame: cell.frame,
      text: cell.text,
    })).then(() => {
      get().markStored(index, true);
      if (revision === revisions[index]) get().setSaveState(index, "saved");
    }).catch(() => {
      if (revision === revisions[index]) get().setSaveState(index, "error");
    });
  }, PERSIST_DELAY);
}

export const useEditorStore = create((set, get) => ({
  cells: [defaultCell(), defaultCell()],
  activeCell: 0,
  hydrated: false,
  saveStates: ["idle", "idle"],
  storedCells: [false, false],
  markStored: (index, value) => set((state) => ({
    storedCells: state.storedCells.map((current, i) => i === index ? value : current),
  })),
  deleting: [false, false],
  error: "",
  setError: (error) => set({ error }),
  setSaveState: (index, value) => set((state) => ({
    saveStates: state.saveStates.map((current, i) => i === index ? value : current),
  })),
  retrySave: () => {
    get().cells.forEach((cell, index) => {
      if (cell.image && !get().deleting[index]) schedulePersist(get, index);
    });
  },
  clearCell: async (index) => {
    if (get().deleting[index]) return;
    const previousSaveState = get().saveStates[index];
    ++imageRequests[index];
    ++revisions[index];
    clearTimeout(persistTimers[index]);
    set((state) => ({ deleting: state.deleting.map((v, i) => i === index ? true : v), error: "" }));
    try {
      await enqueue(index, () => clearCellRecord(index));
      get().cells[index].image?.close?.();
      set((state) => ({
        cells: state.cells.map((cell, i) => i === index ? defaultCell() : cell),
      }));
      get().markStored(index, false);
      get().setSaveState(index, "idle");
    } catch {
      if (previousSaveState === "pending") get().setSaveState(index, "error");
      set({ error: "写真を端末の保存領域から削除できませんでした。もう一度「削除」を押してください。" });
    } finally {
      set((state) => ({ deleting: state.deleting.map((v, i) => i === index ? false : v) }));
    }
  },

  hydrate: async () => {
    if (get().hydrated) return;
    if (hydration) return hydration;
    hydration = (async () => {
    const records = await Promise.all([0, 1].map(async (index) => {
      try { return await loadCellRecord(index); }
      catch {
        set({ error: "前回の写真を読み込めませんでした。ブラウザの保存設定を確認してください。" });
        return null;
      }
    }));
    const cells = await Promise.all(
      records.map(async (record) => {
        if (!record || !record.blob) return defaultCell();
        try {
          const image = await loadImageBitmap(record.blob);
          return {
            image,
            sourceBlob: record.blob,
            fileName: record.fileName || "",
            transform: record.transform,
            frame: record.frame,
            text: {
              content: record.text?.content || "",
              position: record.text?.position || "overlay-bottom",
              fontScale: record.text?.fontScale ?? 1,
            },
          };
        } catch {
          set({ error: "前回の写真を復元できませんでした。写真を選び直してください。" });
          return defaultCell();
        }
      })
    );
    set({ cells, storedCells: records.map(Boolean), hydrated: true });
    })();
    return hydration;
  },

  setActiveCell: (index) => set({ activeCell: index }),

  loadImageForCell: async (index, file) => {
    if (!get().hydrated || get().deleting[index]) return;
    const request = ++imageRequests[index];
    let image;
    try { image = await loadImageBitmap(file); }
    catch {
      if (request === imageRequests[index]) set({ error: "写真を読み込めませんでした。JPEG・PNGなど別の画像で試してください。" });
      return;
    }
    if (request !== imageRequests[index]) { image.close?.(); return; }
    get().cells[index].image?.close?.();
    set((state) => {
      const cells = state.cells.slice();
      const rotation = 0;
      const eff = getEffectiveSize(image, rotation);
      const inner = getInnerRect(cells[index].frame);
      const scale = coverFitScale(eff, inner);
      cells[index] = {
        ...cells[index],
        image,
        sourceBlob: file,
        fileName: file.name || "",
        transform: { scale, offsetX: 0, offsetY: 0, rotation },
      };
      return { cells, activeCell: index, error: "" };
    });
    schedulePersist(get, index);
  },

  setTransform: (index, partial) => {
    if (get().deleting[index]) return;
    set((state) => {
      const cells = state.cells.slice();
      cells[index] = { ...cells[index], transform: { ...cells[index].transform, ...partial } };
      return { cells };
    });
    schedulePersist(get, index);
  },

  rotateCell: (index) => {
    if (get().deleting[index]) return;
    set((state) => {
      const cell = state.cells[index];
      if (!cell.image) return {};
      const rotation = (cell.transform.rotation + 90) % 360;
      const eff = getEffectiveSize(cell.image, rotation);
      const inner = getInnerRect(cell.frame);
      const scale = coverFitScale(eff, inner);
      const cells = state.cells.slice();
      cells[index] = { ...cell, transform: { scale, offsetX: 0, offsetY: 0, rotation } };
      return { cells };
    });
    schedulePersist(get, index);
  },

  setFrame: (index, partial) => {
    if (get().deleting[index]) return;
    set((state) => {
      const cells = state.cells.slice();
      cells[index] = { ...cells[index], frame: { ...cells[index].frame, ...partial } };
      return { cells };
    });
    schedulePersist(get, index);
  },

  setText: (index, partial) => {
    if (get().deleting[index]) return;
    set((state) => {
      const cells = state.cells.slice();
      cells[index] = { ...cells[index], text: { ...cells[index].text, ...partial } };
      return { cells };
    });
    schedulePersist(get, index);
  },

  applyFrameToBoth: (index) => {
    if (get().deleting.some(Boolean)) return;
    set((state) => {
      const frame = state.cells[index].frame;
      const cells = state.cells.map((c) => ({ ...c, frame: { ...frame } }));
      return { cells };
    });
    schedulePersist(get, 0);
    schedulePersist(get, 1);
  },
}));
