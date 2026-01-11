import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import earthImg from '../assets/earth.png'

/**
 * 修正思路：
 * 1. 移除 Vertex Shader 的变形逻辑，防止飞线变粗变胖。
 * 2. TubeGeometry 半径设为极小 (0.002)，保证是细线。
 * 3. 使用 Fragment Shader 做纯粹的透明度拖尾 (头部实，尾部虚)。
 */

// 顶点着色器：只负责坐标投影，不改形状
const flyVertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

// 片元着色器：核心在于透明度渐变
const flyFragmentShader = `
varying vec2 vUv;
uniform float uTime;
uniform float uLen; // 拖尾长度
uniform vec3 uColor;

void main() {
  // vUv.x 是从 0.0 (起点) 到 1.0 (终点)
  float progress = vUv.x;
  
  // 计算当前像素是否在“流星”范围内
  // 范围区间: [uTime - uLen, uTime]
  
  // 归一化位置：1.0 是头部，0.0 是尾部
  float alpha = smoothstep(uTime - uLen, uTime, progress);
  
  // 裁切掉头部之前的部分 (还没飞到的地方)
  if (progress > uTime) {
    alpha = 0.0;
  }
  
  // 裁切掉尾部之后的部分 (已经飞过的地方)
  if (progress < uTime - uLen) {
    alpha = 0.0;
  }

  // 增加一点头部高亮
  if (alpha > 0.0) {
     // 让靠近头部的地方更亮更实
     gl_FragColor = vec4(uColor, alpha);
  } else {
     discard; // 不渲染透明部分
  }
}
`

// 经纬度转坐标
const getPosition = (R: number, lat: number, lon: number) => {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -R * Math.sin(phi) * Math.cos(theta),
    R * Math.cos(phi),
    R * Math.sin(phi) * Math.sin(theta),
  )
}

// 曲线生成：再次优化高度，让弧度更贴近目标视频
const createCurve = (v0: THREE.Vector3, v3: THREE.Vector3) => {
  const dist = v0.distanceTo(v3)
  // 稍微降低飞行高度，让线条更紧凑
  const height = dist * 0.4

  // 计算贝塞尔控制点
  // 取两点中点，沿原点向外延伸
  const mid = v0
    .clone()
    .add(v3)
    .multiplyScalar(0.5)
    .normalize()
    .multiplyScalar(1.5 + height)

  // 使用二次贝塞尔曲线 (起-中-终)
  return new THREE.QuadraticBezierCurve3(v0, mid, v3)
}

export const createEarth = (ele: HTMLDivElement) => {
  const width = ele.clientWidth
  const height = ele.clientHeight

  // --- 场景 ---
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0xffffff) // 纯白背景

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
  camera.position.z = 5.5

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  ele.appendChild(renderer.domElement)

  const group = new THREE.Group()
  scene.add(group)

  const R = 1.5

  // --- 1. 地球本体 (还原极简风) ---
  const textureLoader = new THREE.TextureLoader()
  textureLoader.load(earthImg, tex => {
    const geometry = new THREE.SphereGeometry(R, 64, 64)
    const material = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.9, // 稍微透明一点，更有质感
      color: 0xdddddd, // 微调底色
    })
    const earth = new THREE.Mesh(geometry, material)
    group.add(earth)
  })

  // --- 2. 飞线系统 ---
  const startPos = { lat: 39.9, lon: 116.4 } // 北京
  const targets = [
    { lat: 51.5, lon: -0.1 }, // 伦敦
    { lat: 40.7, lon: -74.0 }, // 纽约
    { lat: 35.6, lon: 139.7 }, // 东京
    { lat: -33.8, lon: 151.2 }, // 悉尼
    { lat: 1.3, lon: 103.8 }, // 新加坡
    { lat: 37.7, lon: -122.4 }, // 旧金山
    { lat: 48.8, lon: 2.3 }, // 巴黎
    { lat: 55.7, lon: 37.6 }, // 莫斯科
    { lat: -22.9, lon: -43.1 }, // 里约
    { lat: 30.0, lon: 31.2 }, // 开罗
  ]

  const v0 = getPosition(R, startPos.lat, startPos.lon)
  const flyLines: any[] = []

  targets.forEach(t => {
    const v3 = getPosition(R, t.lat, t.lon)
    const curve = createCurve(v0, v3)

    // 关键修正：半径设为 0.003 (极细)，段数设为 64 (平滑)
    const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.003, 8, false)

    const uniforms = {
      uTime: { value: -1.0 },
      uLen: { value: 0.3 }, // 拖尾长度占比 30%，更长更柔和
      uColor: { value: new THREE.Color(0x3b82f6) }, // 亮蓝色
    }

    const tubeMat = new THREE.ShaderMaterial({
      vertexShader: flyVertexShader,
      fragmentShader: flyFragmentShader,
      uniforms: uniforms,
      transparent: true,
      depthTest: false, // 不遮挡，类似 UI 层
      blending: THREE.AdditiveBlending, // 叠加发光
    })

    const mesh = new THREE.Mesh(tubeGeo, tubeMat)
    group.add(mesh)

    flyLines.push({
      mesh,
      uniforms,
      speed: 0.008 + Math.random() * 0.004, // 飞行速度
      delay: Math.random() * 2.0, // 随机延迟
      state: 'waiting',
    })
  })

  // --- 3. 交互 ---
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.autoRotate = true
  controls.autoRotateSpeed = 0.6
  controls.enableZoom = false // 禁用缩放，保持构图稳定

  // --- 4. 动画循环 ---
  const animate = () => {
    controls.update()

    flyLines.forEach(item => {
      if (item.state === 'waiting') {
        item.delay -= 0.016
        if (item.delay <= 0) {
          item.state = 'flying'
          item.uniforms.uTime.value = 0.0
        }
      } else if (item.state === 'flying') {
        item.uniforms.uTime.value += item.speed

        // 当流星完全飞过 (1.0 + length)
        if (item.uniforms.uTime.value > 1.0 + item.uniforms.uLen.value) {
          item.state = 'waiting'
          item.delay = 0.5 + Math.random() * 1.5
          item.uniforms.uTime.value = -1.0
        }
      }
    })

    renderer.render(scene, camera)
  }

  renderer.setAnimationLoop(animate)

  return () => {
    renderer.dispose()
    controls.dispose()
    ele.removeChild(renderer.domElement)
  }
}
