// js/utils/image-processor.js

export class ImageProcessor {
    static TARGET_FILE_SIZE = 50 * 1024; // Target 50KB maximum
    static MIN_QUALITY = 0.5; // Don't go below 50% quality
    static MAX_DIMENSION = 512; // Maximum dimension for any side

    // Check browser support for different formats
    static async checkFormatSupport() {
        const formats = {
            avif: false,
            webp: false
        };

        try {
            // Test WebP support
            const webpData = 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=';
            const webpImg = new Image();
            await new Promise((resolve) => {
                webpImg.onload = () => {
                    formats.webp = true;
                    resolve();
                };
                webpImg.onerror = () => {
                    formats.webp = false;
                    resolve();
                };
                webpImg.src = webpData;
            });

            // Test AVIF support
            const avifData = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=';
            const avifImg = new Image();
            await new Promise((resolve) => {
                avifImg.onload = () => {
                    formats.avif = true;
                    resolve();
                };
                avifImg.onerror = () => {
                    formats.avif = false;
                    resolve();
                };
                avifImg.src = avifData;
            });
        } catch (error) {
            console.warn('Error checking format support:', error);
        }

        return formats;
    }

    // Create square crop from center of image
    static createSquareCrop(image) {
        const canvas = document.createElement('canvas');
        const size = Math.min(image.width, image.height);
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext('2d');
        const offsetX = (image.width - size) / 2;
        const offsetY = (image.height - size) / 2;

        ctx.drawImage(image, offsetX, offsetY, size, size, 0, 0, size, size);
        return canvas;
    }

    // Main processing function
    static async processImage(file) {
        // Load and resize image
        const image = await this.loadImage(file);
        const resizedCanvas = this.resizeImage(image, this.MAX_DIMENSION);
        
        // Create square crop
        const squareCanvas = this.createSquareCrop(resizedCanvas);
        
        // Check format support
        const formats = await this.checkFormatSupport();
        
        // Try formats in order of preference
        let result = null;
        
        if (formats.avif) {
            result = await this.compressWithFormat(squareCanvas, 'avif');
        }
        
        if (!result && formats.webp) {
            result = await this.compressWithFormat(squareCanvas, 'webp');
        }
        
        if (!result) {
            result = await this.compressWithFormat(squareCanvas, 'jpeg');
        }
    
        if (!result) {
            throw new Error('Failed to compress image with any supported format');
        }
    
        return result;
    }

    static async compressWithFormat(canvas, format) {
        const mimeType = `image/${format}`;
        let quality = 0.85;
        let currentCanvas = canvas;
        let blob = null;
        const maxAttempts = 5;

        for (let i = 0; i < maxAttempts; i++) {
            let newBlob;
            switch (format) {
                case 'avif':
                    newBlob = await this.encodeAVIF(currentCanvas, quality);
                    break;
                case 'webp':
                    newBlob = await this.encodeWebP(currentCanvas, quality);
                    break;
                default:
                    newBlob = await this.encodeJPEG(currentCanvas, quality);
                    break;
            }

            if (!newBlob) return null;

            blob = newBlob;

            if (blob.size <= this.TARGET_FILE_SIZE) {
                break;
            }

            if (i < maxAttempts - 1) {
                const ratio = Math.sqrt(this.TARGET_FILE_SIZE / blob.size);
                quality = Math.max(this.MIN_QUALITY, quality * ratio);
            }
        }

        return {
            blob: blob,
            format: format.toUpperCase(),
            width: currentCanvas.width,
            height: currentCanvas.height,
            mimeType: mimeType
        };
    }

    static async encodeAVIF(canvas, quality) {
        return new Promise(resolve => canvas.toBlob(blob => resolve(blob), 'image/avif', quality));
    }

    static async encodeWebP(canvas, quality) {
        return new Promise(resolve => canvas.toBlob(blob => resolve(blob), 'image/webp', quality));
    }

    static async encodeJPEG(canvas, quality) {
        return new Promise(resolve => canvas.toBlob(blob => resolve(blob), 'image/jpeg', quality));
    }

    static resizeImage(image, maxDimension) {
        const canvas = document.createElement('canvas');
        let { width, height } = image;

        if (width > height && width > maxDimension) {
            height *= maxDimension / width;
            width = maxDimension;
        } else if (height > maxDimension) {
            width *= maxDimension / height;
            height = maxDimension;
        }

        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(image, 0, 0, width, height);
        return canvas;
    }

    static loadImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(img.src); // Clean up memory
                resolve(img);
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }
}