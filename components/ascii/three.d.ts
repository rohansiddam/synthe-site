/* three is the one dependency this lane adds, and its npm package ships
   no bundled TypeScript declarations. Rather than adding @types/three
   as a second dependency, this lane declares just the three surface it
   uses (renderer, scene, ShaderMaterial, textures, vectors) with the
   shapes the code relies on. A shorthand `declare module "three";`
   is not enough: it types values as any but leaves type positions
   (THREE.Vector3 and friends) unresolved. */
declare module "three" {
  export class Vector2 {
    constructor(x?: number, y?: number);
    x: number;
    y: number;
  }
  export class Vector3 {
    constructor(x?: number, y?: number, z?: number);
    x: number;
    y: number;
    z: number;
    copy(v: Vector3): this;
  }
  export class Camera {}
  export class Scene {
    add(obj: unknown): void;
  }
  export class Texture {
    colorSpace: unknown;
    wrapS: unknown;
    wrapT: unknown;
    minFilter: unknown;
    magFilter: unknown;
    generateMipmaps: boolean;
    anisotropy: number;
    dispose(): void;
  }
  export class CanvasTexture extends Texture {
    constructor(canvas: HTMLCanvasElement);
  }
  export class TextureLoader {
    load(url: string): Texture;
  }
  export class WebGLRenderer {
    constructor(options: unknown);
    setPixelRatio(value: number): void;
    getPixelRatio(): number;
    setSize(width: number, height: number, updateStyle?: boolean): void;
    getDrawingBufferSize(target: Vector2): Vector2;
    render(scene: Scene, camera: Camera): void;
    dispose(): void;
  }
  export class ShaderMaterial {
    constructor(options: unknown);
    uniforms: Record<string, { value: unknown }>;
    dispose(): void;
  }
  export class PlaneGeometry {
    constructor(width: number, height: number);
  }
  export class Mesh {
    constructor(geometry: unknown, material: unknown);
    frustumCulled: boolean;
  }
  export const NoColorSpace: unknown;
  export const ClampToEdgeWrapping: unknown;
  export const LinearFilter: unknown;
  export const LinearMipmapLinearFilter: unknown;
}
