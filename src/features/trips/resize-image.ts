/** Longest side of uploaded covers: sharp on any screen, light to upload. */
const MAX_SIDE = 1920;

/**
 * Shrinks a photo in the browser before uploading it: a 12 MP phone photo
 * (4–8 MB) becomes a ~300 KB JPEG. If the browser can't decode the file
 * (for example HEIC outside Safari), the original is returned and the server
 * decides whether to accept it.
 */
export async function resizeImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}
