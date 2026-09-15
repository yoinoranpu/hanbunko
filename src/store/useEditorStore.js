import { create } from "zustand";
import { loadImageBitmap } from "../lib/loadImage";
import { getEffectiveSize, getInnerRect, coverFitScale } from "../lib/scene";

const defaultCell = () => ({
  image: null,
  fileName: "",
  transform: { scale: 1, offsetX: 0, offsetY: 0, rotation: 0 },
  frame: { type: "none", thickness: 0.5 },
});

export const useEditorStore = create((set) => ({
  cells: [defaultCell(), defaultCell()],
  activeCell: 0,

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
        fileName: file.name || "",
        transform: { scale, offsetX: 0, offsetY: 0, rotation },
      };
      return { cells, activeCell: index };
    });
  },

  setTransform: (index, partial) =>
    set((state) => {
      const cells = state.cells.slice();
      cells[index] = { ...cells[index], transform: { ...cells[index].transform, ...partial } };
      return { cells };
    }),

  rotateCell: (index) =>
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
    }),

  setFrame: (index, partial) =>
    set((state) => {
      const cells = state.cells.slice();
      cells[index] = { ...cells[index], frame: { ...cells[index].frame, ...partial } };
      return { cells };
    }),

  applyFrameToBoth: (index) =>
    set((state) => {
      const frame = state.cells[index].frame;
      const cells = state.cells.map((c) => ({ ...c, frame: { ...frame } }));
      return { cells };
    }),
}));
