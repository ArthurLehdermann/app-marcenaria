import {
  WebGLRenderer, Scene, PerspectiveCamera,
  AmbientLight, DirectionalLight, Color,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export type SceneHandle = {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  controls: OrbitControls;
  invalidate(): void;
  dispose(): void;
};

export function createScene(canvas: HTMLCanvasElement): SceneHandle {
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(devicePixelRatio);
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);

  const scene = new Scene();
  scene.background = new Color(0x1a1a1a);

  const camera = new PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 1, 100_000);
  camera.position.set(0, 800, 2000);
  camera.lookAt(0, 0, 0);

  scene.add(new AmbientLight(0xffffff, 0.6));
  const sun = new DirectionalLight(0xffffff, 0.8);
  sun.position.set(1000, 2000, 1000);
  scene.add(sun);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;

  let dirty = false;

  function render() {
    dirty = false;
    controls.update();
    renderer.render(scene, camera);
  }

  function invalidate() {
    if (dirty) return;
    dirty = true;
    requestAnimationFrame(render);
  }

  // Orbitar muda a camera mas nao o Project — invalida sem tocar no estado
  controls.addEventListener("change", invalidate);

  function dispose() {
    controls.dispose();
    renderer.dispose();
  }

  return { renderer, scene, camera, controls, invalidate, dispose };
}
