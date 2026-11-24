/**
 * Optimiza y redimensiona imágenes en el navegador antes de subirlas (máx 1400px),
 * reduciendo fotos móviles de 3-5 MB a ~150-250 KB para cargas casi instantáneas.
 */
export async function optimizeImageForUpload(file, { maxDimension = 1400, quality = 0.82 } = {}) {
  if (!file || !file.type?.startsWith("image/")) return file;
  // Si ya es liviana (< 250 KB) y es JPG/PNG/WEBP, evitar reprocesar
  const validDirect = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
  if (validDirect && file.size <= 250 * 1024) return file;

  try {
    const imgUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = imgUrl;
      });

      const scale = Math.min(1, maxDimension / Math.max(img.width, img.height, 1));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.drawImage(img, 0, 0, width, height);

      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality)
      );
      if (!blob) return file;

      const baseName = file.name.replace(/\.[^.]+$/, "") || "comprobante";
      return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
    } finally {
      URL.revokeObjectURL(imgUrl);
    }
  } catch {
    return file;
  }
}
