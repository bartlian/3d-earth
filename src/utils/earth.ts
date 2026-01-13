import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import earthImg from '../assets/earth.png'

export const createEarth = (ele: HTMLDivElement) => {
  const width = ele.clientWidth
  const height = ele.clientHeight

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf3f5f8)

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
  camera.position.z = 5

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  ele.appendChild(renderer.domElement)

  const group = new THREE.Group()
  scene.add(group)

  const textureLoader = new THREE.TextureLoader()
  const texture = textureLoader.load(earthImg)
  const R = 1
  const geometry = new THREE.SphereGeometry(R, 64, 64)
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
  })
  const earth = new THREE.Mesh(geometry, material)
  group.add(earth)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.autoRotate = true
  controls.autoRotateSpeed = 0.6
  controls.enableZoom = true

  const animate = () => {
    controls.update()
    renderer.render(scene, camera)
  }

  renderer.setAnimationLoop(animate)

  return () => {
    renderer.dispose()
    controls.dispose()
    ele.removeChild(renderer.domElement)
  }
}
