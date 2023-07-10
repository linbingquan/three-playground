const basicCode = `import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"

const { innerWidth, innerHeight } = window;

const scene = new THREE.Scene();
const aspect = innerWidth / innerHeight;
const camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 2000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(innerWidth, innerHeight);
renderer.setAnimationLoop(animate);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);

const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial();
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

function animate() {

    mesh.rotation.x += 0.01;
    mesh.rotation.y += 0.01;

    render();

}

const render = () => renderer.render(scene, camera);

window.addEventListener("resize", () => {
    const { innerWidth, innerHeight } = window;
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
});`;

const createHtml = ({ importMap, javascript }) =>
  `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>playground preview</title>
    <style>body { overflow: hidden; margin: 0; background: #000; }</style>
    <script>
    const errors = [];
    window.addEventListener("error", (error) => {
        errors.push(error.message);
        top.window.postMessage({ type: "error", data: errors }, "*");
    });
    <\/script>
</head>

<body>
    <!-- Import maps polyfill -->
    <!-- Remove this when import maps will be widely supported -->
    <script async src="https://unpkg.com/es-module-shims@latest/dist/es-module-shims.js"><\/script>
    <script type="importmap">
${JSON.stringify(importMap, null, 4)}
    <\/script>
    <script type="module">
${javascript}
    <\/script>
</body>

</html>`;

const iframe = document.querySelector("iframe");
const container = document.querySelector(".error-container");

const versions = await getVersions();
const latest = versions[0];
createRevision(versions);
const latestImportMap = createImportMap(latest);
let selectImportMap = latestImportMap;

const editor = monaco.editor.create(document.getElementById("monaco-editor"), {
  value: [`${basicCode}`].join("\n"),
  language: "javascript",
  theme: "vs-dark",
});

preview({ javascript: editor.getValue(), importMap: latestImportMap });

function createImportMap(number) {
  const version = `0.${number}.0`;
  return {
    "imports": {
      "three": `https://unpkg.com/three@${version}/build/three.module.js`,
      "three/addons/": `https://unpkg.com/three@${version}/examples/jsm/`,
      "three/": `https://unpkg.com/three@${version}/`,
    },
  };
}

async function getVersions() {
  return await fetch("https://api.github.com/repos/mrdoob/three.js/releases")
    .then((res) => res.json())
    .then((item) => item.map(({ tag_name }) => tag_name.split("r")[1]));
}

let timer;

editor.onDidChangeModelContent(function (e) {
  if (timer) clearTimeout(timer);

  timer = setTimeout(() => {
    container.classList.add("hidden");

    preview({ javascript: editor.getValue(), importMap: selectImportMap });
  }, 500);
});

async function createRevision(versions) {
  const select = document.createElement("select");
  select.onchange = (e) => {
    const number = e.target.value;
    selectImportMap = createImportMap(number);
    preview({ javascript: editor.getValue(), importMap: selectImportMap });
  };
  versions.forEach((item) => {
    const number = item.replace("r", "");
    const option = document.createElement("option");
    option.value = number;
    option.innerText = `r${number}`;
    select.appendChild(option);
  });

  const revision = document.createElement("div");
  revision.innerText = "REVISION: ";
  revision.classList.add("revision");
  revision.appendChild(select);

  document.body.appendChild(revision);
}

function preview({ javascript, importMap }) {
  const html = createHtml({ javascript, importMap });
  const blob = new Blob([html], { "type": "text/html" });
  iframe.src = URL.createObjectURL(blob);
}

window.addEventListener("resize", () => editor.layout());

function createError(data) {
  const fragment = document.createDocumentFragment();

  if (Array.isArray(data)) {
    data.forEach((error) => appendChild(error));
  } else {
    appendChild(data);
  }

  function appendChild(data) {
    const div = document.createElement("div");
    div.innerText = data;
    fragment.appendChild(div);
  }

  container.innerHTML = "";
  container.classList.remove("hidden");
  container.appendChild(fragment);
}

window.addEventListener("message", (target) => {
  const { data, type } = target.data;

  if (type === "error") createError(data);
});
