/**
 * High-performance, highly robust client-side Laplace Image Inpainting algorithm.
 * Excellent for removing text, captions, and watermarks transparently inside the browser without remote servers.
 * Uses bounding-box sub-processing and Jacobi diffusion iteratively to run in milliseconds.
 */
export function inpaintImage(
  ctx: CanvasRenderingContext2D,
  maskCanvas: HTMLCanvasElement,
  w: number,
  h: number
): void {
  const imgData = ctx.getImageData(0, 0, w, h);
  const maskCtx = maskCanvas.getContext('2d');
  if (!maskCtx) return;

  const maskData = maskCtx.getImageData(0, 0, w, h);
  const pixels = imgData.data;
  const mask = maskData.data;

  // Step 1: Find the bounding box around all masked pixels to narrow the computational target
  let minX = w;
  let maxX = 0;
  let minY = h;
  let maxY = 0;
  let hasMask = false;

  for (let y = 0; y < h; y++) {
    const rowOffset = y * w;
    for (let x = 0; x < w; x++) {
      const idx = (rowOffset + x) * 4;
      // Mask is loaded if alpha > 10 (painted pixel on overlay)
      if (mask[idx + 3] > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        hasMask = true;
      }
    }
  }

  if (!hasMask) return;

  // Add 15px border padding for surrounding texture capture
  const margin = 15;
  minX = Math.max(0, minX - margin);
  maxX = Math.min(w - 1, maxX + margin);
  minY = Math.max(0, minY - margin);
  maxY = Math.min(h - 1, maxY + margin);

  const boxW = maxX - minX + 1;
  const boxH = maxY - minY + 1;

  // Step 2: Extract mask indicators inside the bounding box
  const isMasked = new Uint8Array(boxW * boxH);
  for (let y = minY; y <= maxY; y++) {
    const localY = y - minY;
    const globalRowOffset = y * w;
    const localRowOffset = localY * boxW;
    for (let x = minX; x <= maxX; x++) {
      const localX = x - minX;
      const globalIdx = (globalRowOffset + x) * 4;
      if (mask[globalIdx + 3] > 10) {
        isMasked[localRowOffset + localX] = 1;
      }
    }
  }

  // Step 3: Initialize masked colors with their nearest radial unmasked boundary neighbor.
  // This step makes the diffusion converge instantly and prevents text color or raw black from bleeding inward.
  for (let y = 0; y < boxH; y++) {
    const localRowOffset = y * boxW;
    for (let x = 0; x < boxW; x++) {
      const localIdx = localRowOffset + x;
      if (isMasked[localIdx] === 1) {
        let found = false;
        let r = 1;
        const maxR = Math.max(boxW, boxH);
        while (r < maxR && !found) {
          // Check square shell of radius r around (x, y)
          for (let dy = -r; dy <= r; dy++) {
            const ny = y + dy;
            if (ny < 0 || ny >= boxH) continue;
            // Left & Right sides of shell
            const dxArr = [r - Math.abs(dy), -(r - Math.abs(dy))];
            for (const dx of dxArr) {
              const nx = x + dx;
              if (nx < 0 || nx >= boxW) continue;
              if (isMasked[ny * boxW + nx] === 0) {
                const globalSrcIdx = ((minY + ny) * w + (minX + nx)) * 4;
                const globalTarIdx = ((minY + y) * w + (minX + x)) * 4;
                pixels[globalTarIdx] = pixels[globalSrcIdx];
                pixels[globalTarIdx + 1] = pixels[globalSrcIdx + 1];
                pixels[globalTarIdx + 2] = pixels[globalSrcIdx + 2];
                found = true;
                break;
              }
            }
            if (found) break;
          }
          r++;
        }
      }
    }
  }

  // Step 4: Run Jacobi-style Laplace diffusion iteration on masked pixels to blend seamlessly
  const tempPixels = new Uint8ClampedArray(pixels);

  for (let iter = 0; iter < 40; iter++) {
    for (let y = 1; y < boxH - 1; y++) {
      const globalY = minY + y;
      const localRowOffset = y * boxW;
      for (let x = 1; x < boxW - 1; x++) {
        const globalX = minX + x;
        if (isMasked[localRowOffset + x] === 1) {
          const tarIdx = (globalY * w + globalX) * 4;

          const upIdx = ((globalY - 1) * w + globalX) * 4;
          const downIdx = ((globalY + 1) * w + globalX) * 4;
          const leftIdx = (globalY * w + (globalX - 1)) * 4;
          const rightIdx = (globalY * w + (globalX + 1)) * 4;

          // Standard 4-neighbor Laplace smoothing
          pixels[tarIdx] = (tempPixels[upIdx] + tempPixels[downIdx] + tempPixels[leftIdx] + tempPixels[rightIdx]) >> 2;
          pixels[tarIdx + 1] = (tempPixels[upIdx + 1] + tempPixels[downIdx + 1] + tempPixels[leftIdx + 1] + tempPixels[rightIdx + 1]) >> 2;
          pixels[tarIdx + 2] = (tempPixels[upIdx + 2] + tempPixels[downIdx + 2] + tempPixels[leftIdx + 2] + tempPixels[rightIdx + 2]) >> 2;
        }
      }
    }
    tempPixels.set(pixels);
  }

  // Step 5: Put computed imageData back onto target canvas context
  ctx.putImageData(imgData, 0, 0);
}
