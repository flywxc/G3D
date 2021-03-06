import GL from "../core/gl";

import { isPowerOf2 } from "../utils/math";

interface ICubeImages {
    left: HTMLImageElement;
    right: HTMLImageElement;
    top: HTMLImageElement;
    bottom: HTMLImageElement;
    front: HTMLImageElement;
    back: HTMLImageElement;
}

interface ICubeTextureConfigImages extends ICubeImages {
    mip?: ICubeImages[];
}

interface ICubeTextureConfig {
    images: ICubeTextureConfigImages;
    flipY?: boolean;
    sRGB?: boolean;
}

class CubeTexture {

    public glTexture: WebGLTexture;

    public mipLevel: number = 0;

    private size: number;

    private sRGB: boolean;

    private targets: Map<string, number> = new Map([
        ["right", GL.gl.TEXTURE_CUBE_MAP_POSITIVE_X],
        ["left", GL.gl.TEXTURE_CUBE_MAP_NEGATIVE_X],
        ["top", GL.gl.TEXTURE_CUBE_MAP_POSITIVE_Y],
        ["bottom", GL.gl.TEXTURE_CUBE_MAP_NEGATIVE_Y],
        ["front", GL.gl.TEXTURE_CUBE_MAP_POSITIVE_Z],
        ["back", GL.gl.TEXTURE_CUBE_MAP_NEGATIVE_Z],
    ]);

    constructor({
        images,
        sRGB = false,
        flipY = false,
    }: ICubeTextureConfig) {

        const { gl, textures, extensions } = GL;

        this.checkImages(images);

        const texture = this.glTexture = gl.createTexture();

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

        const extensionSRGB = extensions.get("SRGB");

        this.sRGB = sRGB = sRGB && !!extensionSRGB;
        this.size = images.left.width;
        this.mipLevel = Math.log2(this.size);

        // wrap
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // filter
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        // fill
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY ? 1 : 0);
        const format = sRGB ? extensionSRGB.SRGB_ALPHA_EXT : gl.RGBA;

        for (const [key, value] of this.targets) {
            gl.texImage2D(value, 0, format, format, gl.UNSIGNED_BYTE, images[key]);
        }

        if (images.mip) {
            this.setMipmaps(images.mip);
        }

        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);

        textures.add(this);
    }

    public setMipmaps(mips: ICubeImages[]) {

        if (this.mipLevel !== mips.length) {
            throw new Error("Mipmap level length error.");
        }

        const { gl, extensions } = GL;
        const format = this.sRGB ? extensions.get("SRGB").SRGB_ALPHA_EXT : gl.RGBA;

        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

        // fill
        for (let i = 0; i < mips.length; i++) {
            const images = mips[i];

            this.checkImages(images, Math.pow(2, mips.length - 1 - i));

            for (const [key, value] of this.targets) {
                gl.texImage2D(value, i + 1, format, format, gl.UNSIGNED_BYTE, images[key]);
            }
        }
    }

    public destructor() {

        const { gl, textures } = GL;

        gl.deleteTexture(this.glTexture);

        textures.delete(this);
    }

    private checkImages(images: ICubeImages, size = images.left.width): void {

        const faces = ["left", "right", "top", "bottom", "front", "back"];

        for (const key of faces) {
            const image = images[key];
            if (
                image.width !== size ||
                image.height !== size ||
                isPowerOf2(image.width) !== true ||
                isPowerOf2(image.height) !== true
            ) {
                throw new Error("CubeTexture image size error.");
            }
        }
    }
}

export default CubeTexture;
