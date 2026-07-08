import {
  WebGLRenderer, Scene, PerspectiveCamera,
  AmbientLight, DirectionalLight, Color,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { setupViewportNavigation } from "./viewportNavigation";

export type SceneHandle = {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  controls: OrbitControls;
  isSpacePanActive: () => boolean;
  invalidate(): void;
  dispose(): void;
};

export function createScene(canvas: HTMLCanvasElement): SceneHandle {
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth || 300, canvas.clientHeight || 300, false);

  const scene = new Scene();
  scene.background = new Color(0x171512);

  const camera = new PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 1, 100_000);
  camera.position.set(0, 800, 2000);
  camera.lookAt(0, 0, 0);

  scene.add(new AmbientLight(0xffffff, 0.6));
  const sun = new DirectionalLight(0xffffff, 0.8);
  sun.position.set(1000, 2000, 1000);
  scene.add(sun);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = false;

  const navigation = setupViewportNavigation(canvas, controls);

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
    navigation.dispose();
    controls.dispose();
    renderer.dispose();
  }

  return { renderer, scene, camera, controls, isSpacePanActive: navigation.isSpacePanActive, invalidate, dispose };
}
