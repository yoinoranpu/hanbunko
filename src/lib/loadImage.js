function isHeicFile(file) {
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  return (
    type.includes("heic") ||
    type.includes("heif") ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

function loadViaImgElement(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/**
 * File(HEIC/JPEG/PNG等)を読み込み、EXIFの回転情報を反映した状態の
 * ImageBitmap(または<img>)を返す。iPhone写真(HEIC)はJPEGに変換してから読み込む。
 */
export async function loadImageBitmap(file) {
  let blob = file;

  if (isHeicFile(file)) {
    const { default: heic2any } = await import("heic2any");
    const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
    blob = Array.isArray(converted) ? converted[0] : converted;
  }

  try {
    return await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch (err) {
    // createImageBitmapのimageOrientationオプション未対応ブラウザ向けフォールバック
    return await loadViaImgElement(blob);
  }
}
