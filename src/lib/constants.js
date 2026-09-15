export const DPI = 300;
const MM_PER_IN = 25.4;

// セル(1枚あたり)の物理サイズ: 63.5×89mm(縦長)
export const CELL_W_MM = 63.5;
export const CELL_H_MM = 89;

export const CELL_W = Math.round((CELL_W_MM / MM_PER_IN) * DPI); // 750px
export const CELL_H = Math.round((CELL_H_MM / MM_PER_IN) * DPI); // 1051px

// 全体キャンバス(L判・横向き): セル2枚を左右に並べたもの
export const CANVAS_W = CELL_W * 2; // 1500px
export const CANVAS_H = CELL_H; // 1051px
