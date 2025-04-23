type SpriteLayerInput = {
    url: string;
    hueShift?: number; // In degrees, e.g. 180 for color inversion
    layer?: number;    // Lower renders first
};

export class SpriteSheetFactory {
    private static canvas: HTMLCanvasElement = document.createElement('canvas');
    private static ctx: CanvasRenderingContext2D = this.canvas.getContext('2d')!;
    private static imageCache: Map<string, HTMLImageElement> = new Map();

    constructor() {
    }

    public generateCacheKey(layers: SpriteLayerInput[]): string {
        return layers
            .map(layer =>
                `${layer.layer ?? '0'}|${layer.url}|${layer.hueShift ?? 0}`
            )
            .join(';');
    }


    async createComposite(layers: SpriteLayerInput[]): Promise<{ canvas: HTMLCanvasElement, cacheKey: string }> {
        const ctx = SpriteSheetFactory.ctx;
        const canvas = SpriteSheetFactory.canvas;

        // Load all images
        let imageEntries = await Promise.all(
            layers.map(async (layer, index) => {
                if(!layer.url || layer.url.length < 1) return undefined;
                console.log(layer.url)
                try{
                    const img = await this.loadImage(layer.url);
                    return {
                        image: img,
                        hueShift: layer.hueShift ?? 0,
                        layerIndex: layer.layer ?? index, // Default to array order
                    };
                } catch (err: any) {
                    return undefined;
                }
            })
        );
        
        imageEntries = imageEntries.filter((layer) => layer != undefined)


        // Determine canvas size from the first image, or use defaults
        const baseImage = imageEntries[0]?.image;
        canvas.width = baseImage?.width ?? 64;
        canvas.height = baseImage?.height ?? 64;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Sort by layer index
        imageEntries.sort((a, b) => (a?.layerIndex || 0) - (b?.layerIndex || 0));

        // Draw each image with optional hue shift
        for (const entry of imageEntries) {
            if(!entry) continue;
            if (entry.hueShift !== 0) {
                this.drawWithHueShift(entry.image, entry.hueShift);
            } else {
                ctx.drawImage(entry.image, 0, 0, canvas.width, canvas.height);
            }
        }



        return { canvas: canvas, cacheKey: this.generateCacheKey(layers) };
    }

    private async loadImage(url: string): Promise<HTMLImageElement> {
        if (SpriteSheetFactory.imageCache.has(url)) {
            return SpriteSheetFactory.imageCache.get(url)!;
        }

        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.crossOrigin = 'anonymous';
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = url;
        });

        SpriteSheetFactory.imageCache.set(url, img);
        return img;
    }

    private drawWithHueShift(img: HTMLImageElement, hueShift: number) {
        const ctx = SpriteSheetFactory.ctx;
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d')!;
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;

        tempCtx.drawImage(img, 0, 0);
        const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
        const data = imageData.data;

        // Apply hue shift
        for (let i = 0; i < data.length; i += 4) {
            const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
            const [h, s, l] = this.rgbToHsl(r, g, b);
            const newHue = (h + hueShift) % 360;
            const [r2, g2, b2] = this.hslToRgb(newHue, s, l);
            [data[i], data[i + 1], data[i + 2]] = [r2, g2, b2];
        }

        tempCtx.putImageData(imageData, 0, 0);
        ctx.drawImage(tempCanvas, 0, 0, SpriteSheetFactory.canvas.width, SpriteSheetFactory.canvas.height);
    }

    // Utility: RGB → HSL
    private rgbToHsl(r: number, g: number, b: number): [number, number, number] {
        r /= 255;
        g /= 255;
        b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s, l = (max + min) / 2;

        if (max === min) h = s = 0;
        else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h *= 60;
        }
        return [h, s, l];
    }

    // Utility: HSL → RGB
    private hslToRgb(h: number, s: number, l: number): [number, number, number] {
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const hp = h / 60;
        const x = c * (1 - Math.abs((hp % 2) - 1));
        let [r1, g1, b1] = [0, 0, 0];

        if (hp >= 0 && hp < 1) [r1, g1, b1] = [c, x, 0];
        else if (hp < 2) [r1, g1, b1] = [x, c, 0];
        else if (hp < 3) [r1, g1, b1] = [0, c, x];
        else if (hp < 4) [r1, g1, b1] = [0, x, c];
        else if (hp < 5) [r1, g1, b1] = [x, 0, c];
        else if (hp <= 6) [r1, g1, b1] = [c, 0, x];

        const m = l - c / 2;
        return [
            Math.round((r1 + m) * 255),
            Math.round((g1 + m) * 255),
            Math.round((b1 + m) * 255),
        ];
    }
}
