import { create } from "zustand";
import { loadImageBitmap } from "../lib/loadImage";
import { getEffectiveSize, getInnerRect, coverFitScale } from "../lib/scene";
import { saveCellRecord, loadCellRecord } from "../lib/persistence";

const defaultCell = () => ({
  image: null,
  sourceBlob: null,
  fileName: "",
  transform: { scale: 1, offsetX: 0, offsetY: 0, rotation: 0 },
  frame: { type: "none", thickness: 0.5 },
});

const PERSIST_DELAY = 250;
const persistTimers = [null, null];

function schedulePersist(get, index) {
  clearTimeout(persistTimers[index]);
  persistTimers[index] = setTimeout(() => {
    const cell = get().cells[index];
    if (!cell.image || !cell.sourceBlob) return;
    saveCellRecord(index, {
      blob: cell.sourceBlob,
      fileName: cell.fileName,
      transform: cell.transform,
      frame: cell.frame,
    });
  }, PERSIST_DELAY);
}

export const useEditorStore = create((set, get) => ({
  cells: [defaultCell(), defaultCell()],
  activeCell: 0,
  hydrated: false,

  hydrate: async () => {
    const records = await Promise.all([loadCellRecord(0), loadCellRecord(1)]);
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
          };
        } catch {
          return defaultCell();
        }
      })
    );
    set({ cells, hydrated: true });
  },

  setActiveCell: (index) => set({ activeCell: index }),

  loadImageForCell: async (index, file) => {
    const image = await loadImageBitmap(file);
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
      return { cells, activeCell: index };
    });
    schedulePersist(get, index);
  },

  setTransform: (index, partial) => {
    set((state) => {
      const cells = state.cells.slice();
      cells[index] = { ...cells[index], transform: { ...cells[index].transform, ...partial } };
      return { cells };
    });
    schedulePersist(get, index);
  },

  rotateCell: (index) => {
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
    set((state) => {
      const cells = state.cells.slice();
      cells[index] = { ...cells[index], frame: { ...cells[index].frame, ...partial } };
      return { cells };
    });
    schedulePersist(get, index);
  },

  applyFrameToBoth: (index) => {
    set((state) => {
      const frame = state.cells[index].frame;
      const cells = state.cells.map((c) => ({ ...c, frame: { ...frame } }));
      return { cells };
    });
    schedulePersist(get, 0);
    schedulePersist(get, 1);
  },
}));
