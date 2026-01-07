import * as THREE from 'three'

export const createEarth = (ele: HTMLDivElement) => {
  const width = ele.clientWidth
  const height = ele.clientHeight

  const scene = new THREE.Scene()

  const camera = new THREE.PerspectiveCamera(70, width / height, 0.01, 10)
  camera.position.z = 1

  const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2)
  const material = new THREE.MeshNormalMaterial()

  const mesh = new THREE.Mesh(geometry, material)
  scene.add(mesh)

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(width, height)
  renderer.setAnimationLoop(animate)
  ele.appendChild(renderer.domElement)

  function animate(time = 1) {
    mesh.rotation.x = time / 2000
    mesh.rotation.y = time / 1000

    renderer.render(scene, camera)
  }
}
