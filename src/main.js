import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// --- CONFIGURACIÓN DE ARCHIVOS Y VISUALIZACIÓN ---
const CSV_FILE_PATH = "src/M4_Accesos.csv";
const IMAGE_FILE_PATH = "src/Madrid-Map-Spain.jpg";
// Ampliamos los índices para obtener más datos relevantes en el popup.
const HEADERS_BY_INDEX = {
  4: "CODIGOESTACION", // Índice 4 (Identificador principal)
  7: "DENOMINACION", // Índice 7 (Nombre del Acceso)
  16: "NOMBREVIA", // Índice 16 (Nombre de la Vía/Calle)
  33: "X", // Índice 33 (Coordenada X)
  34: "Y", // Índice 34 (Coordenada Y)
};
const TARGET_PLOT_SIZE = 20; // Tamaño del plano en unidades de Three.js

// ----------------------------------------------------------------------------------
// --- 1. FUNCIÓN DE CARGA Y PARSEO (Corrige coma decimal y extrae X/Y) ---
// ----------------------------------------------------------------------------------
async function loadAndParseCSV(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(
        `Error de carga: Asegúrate de que tu entorno permite acceder a ${url}.`
      );
      throw new Error(`Error al cargar el archivo CSV: ${response.statusText}`);
    }

    let csvText = await response.text();
    const lines = csvText.split(/\r\n|\n/).filter((line) => line.trim() !== "");
    if (lines.length < 2) return [];

    const data = []; // Start from line 1, ignoring headers

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",");
      const row = {};
      let hasValidCoords = true;

      for (const indexStr in HEADERS_BY_INDEX) {
        const index = parseInt(indexStr);
        const headerName = HEADERS_BY_INDEX[indexStr];
        const rawValue = values[index] ? values[index].trim() : null;

        if (rawValue !== null && rawValue !== "") {
          let processedValue = rawValue; // KEY CORRECTION: Replace comma with dot for X and Y coordinates

          if (headerName === "X" || headerName === "Y") {
            processedValue = rawValue.replace(",", ".");
          }

          const numValue = Number(processedValue);

          if (headerName === "X" || headerName === "Y") {
            if (isNaN(numValue)) {
              hasValidCoords = false;
              break;
            }
            row[headerName] = numValue;
          } else if (
            headerName === "DENOMINACION" ||
            headerName === "NOMBREVIA" ||
            headerName === "CODIGOESTACION"
          ) {
            // Keep text fields as strings
            row[headerName] = rawValue.replace(/"/g, ""); // Clean quotes
          } else {
            row[headerName] = numValue;
          }
        } else if (headerName === "X" || headerName === "Y") {
          hasValidCoords = false;
          break;
        }
      }

      if (hasValidCoords && row.X !== undefined && row.Y !== undefined) {
        data.push(row);
      }
    }

    console.log(
      `✅ ${data.length} registros con coordenadas X/Y válidas cargados.`
    );
    return data;
  } catch (error) {
    console.error("❌ Error en el proceso de carga del CSV:", error);
    return [];
  }
}

// ----------------------------------------------------------------------------------
// --- 2. FUNCIÓN DE NORMALIZACIÓN (Aplica regla de 3) ---
// ----------------------------------------------------------------------------------
let normalizationConfig = {};

function normalizeCoordinates(data) {
  if (data.length === 0) return [];

  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;

  data.forEach((item) => {
    minX = Math.min(minX, item.X);
    maxX = Math.max(maxX, item.X);
    minY = Math.min(minY, item.Y);
    maxY = Math.max(maxY, item.Y);
  });

  const rangeX = maxX - minX;
  const rangeY = maxY - minY;
  const maxRange = Math.max(rangeX, rangeY);

  const scaleFactor = maxRange > 0 ? TARGET_PLOT_SIZE / maxRange : 0;

  normalizationConfig = {
    minX,
    maxX,
    minY,
    maxY,
    rangeX,
    rangeY,
    maxRange,
    scaleFactor,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };

  const normalizedData = data.map((item) => ({
    ...item,
    normalizedX: (item.X - normalizationConfig.centerX) * scaleFactor,
    normalizedY: (item.Y - normalizationConfig.centerY) * scaleFactor,
  }));

  console.log(
    `📏 Coordenadas normalizadas al rango de visualización: [${
      -TARGET_PLOT_SIZE / 2
    }, ${TARGET_PLOT_SIZE / 2}].`
  );

  return normalizedData;
}

// ----------------------------------------------------------------------------------
// --- 3. FUNCIÓN PRINCIPAL DE THREE.JS ---
// ----------------------------------------------------------------------------------
async function initThreeJS() {
  const accessData = await loadAndParseCSV(CSV_FILE_PATH);
  const plotData = normalizeCoordinates(accessData); // --- SETUP BÁSICO ---

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  const renderer = new THREE.WebGLRenderer({ antialias: true });

  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  scene.background = new THREE.Color(0x1a1a2e); // Dark background // --- RAYCASTING SETUP ---

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let INTERSECTED = null; // To track the currently hovered or clicked object
  let isOrbiting = false; // Bandera para evitar conflicto con OrbitControls (SOLUCIÓN CLIC) // --- LUCES ---

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
  directionalLight.position.set(5, 10, 7.5).normalize();
  scene.add(directionalLight); // --- CÁMARA POSICIÓN INICIAL ---

  camera.position.set(0, 0, 30); // --- ORBIT CONTROLS ---

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = false;
  controls.minDistance = 5;
  controls.maxDistance = 100;
  controls.update(); // Detección de Orbiting para bloquear el Raycasting
  controls.addEventListener("start", () => {
    isOrbiting = true;
  });

  controls.addEventListener("end", () => {
    // Pequeño retraso para asegurar que un clic rápido no active la órbita
    setTimeout(() => {
      isOrbiting = false;
    }, 100);
  }); // --- ACTUALIZACIÓN DE MOUSE PARA RAYCASTING (Necesario para detección de clic) ---

  renderer.domElement.addEventListener("mousemove", (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }); // --- FUNCIÓN PARA MOSTRAR LA INFORMACIÓN DE LA ESTACIÓN ---

  const infoBox = document.createElement("div");
  infoBox.id = "info-box";
  
  // ESTILOS AJUSTADOS: Posición fija y z-index alto para asegurar visibilidad
  infoBox.style.cssText = `
    position: fixed; 
    top: 20px;
    right: 20px;
    transform: none;
    background: rgba(45, 45, 45, 0.95); 
    padding: 20px;
    border-radius: 10px;
    color: white;
    font-family: sans-serif;
    display: none; /* Hidden by default */
    max-width: 300px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
    z-index: 9999; 
  `;
  document.body.appendChild(infoBox);

  function showStationInfo(data) {
    infoBox.style.display = "block";
    infoBox.innerHTML = `
      <h3 style="margin: 0 0 10px 0; border-bottom: 1px solid #00ff00; padding-bottom: 5px; color: #00ff00;">Información de Estación</h3>
      <p><strong>Código Estación:</strong> ${
        data.CODIGOESTACION || "N/A"
      }</p>
      <p><strong>Acceso:</strong> ${data.DENOMINACION || "N/A"}</p>
      <p><strong>Vía/Calle:</strong> ${data.NOMBREVIA || "N/A"}</p>
      <p><strong>Coordenadas (X, Y):</strong></p>
      <ul style="list-style: none; padding-left: 10px; margin: 5px 0 0 0;">
        <li>X: ${data.X.toFixed(4)}</li>
        <li>Y: ${data.Y.toFixed(4)}</li>
      </ul>
    `;
  } // --- DETECCIÓN DE CLIC (RAYCASTING) ---

  renderer.domElement.addEventListener("click", () => {
    // Evita el raycasting si el usuario estaba orbitando/arrastrando
    if (isOrbiting) {
      return;
    }

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(pointsGroup.children, false);

    if (intersects.length > 0) {
      const pointMesh = intersects[0].object;
      const stationData = pointMesh.userData; // Highlight the point and show info

      highlightAndShowInfo(pointMesh, stationData);
    } else {
      // No point clicked, hide the popup and clear highlight
      if (INTERSECTED) {
        INTERSECTED.material.emissive.setHex(0x00aa00);
        INTERSECTED = null;
      }
      infoBox.style.display = "none";
    }
  }); // --- FUNCIÓN PARA RESALTAR Y MOSTRAR INFO ---

  function highlightAndShowInfo(pointMesh, stationData) {
    if (INTERSECTED) {
      INTERSECTED.material.emissive.setHex(0x00aa00); // Reset old point (Green)
    }
    INTERSECTED = pointMesh;
    INTERSECTED.material.emissive.setHex(0xff0000); // Highlight new point (Red)
    showStationInfo(stationData);
  } // --- PLANO DE IMAGEN DE FONDO (MAPA) ---

  const textureLoader = new THREE.TextureLoader();
  textureLoader.load(
    IMAGE_FILE_PATH,
    function (texture) {
      console.log(`✅ Textura ${IMAGE_FILE_PATH} cargada correctamente.`);
      const mapMaterial = new THREE.MeshLambertMaterial({
        map: texture,
        side: THREE.DoubleSide,
      });

      const planeGeometry = new THREE.PlaneGeometry(
        TARGET_PLOT_SIZE,
        TARGET_PLOT_SIZE
      );
      const mapPlane = new THREE.Mesh(planeGeometry, mapMaterial);
      mapPlane.position.set(0, 0, -0.1);
      scene.add(mapPlane);
    },
    undefined,
    function (err) {
      console.error(
        `❌ Error al cargar la textura ${IMAGE_FILE_PATH}. Asegúrate de que el archivo existe en la ruta especificada.`,
        err
      );
      const errorPlaneGeometry = new THREE.PlaneGeometry(
        TARGET_PLOT_SIZE,
        TARGET_PLOT_SIZE
      );
      const errorPlaneMaterial = new THREE.MeshBasicMaterial({
        color: 0x333333,
        side: THREE.DoubleSide,
      });
      const errorPlane = new THREE.Mesh(errorPlaneGeometry, errorPlaneMaterial);
      errorPlane.position.z = -0.1;
      scene.add(errorPlane);
    }
  ); // --- VISUALIZACIÓN DE ESTACIONES (Los puntos) ---

  const pointGeometry = new THREE.SphereGeometry(0.2, 8, 8);
  const material = new THREE.MeshPhongMaterial({
    color: 0x00ff00,
    emissive: 0x00aa00,
  });
  const pointsGroup = new THREE.Group();
  scene.add(pointsGroup); // Valores fijos solicitados

  const currentScale = 1.54;
  const currentOffsetX = 0.8;
  const currentOffsetY = -0.7;

  function updatePoints(scale, offsetX, offsetY) {
    // Limpia los puntos anteriores
    pointsGroup.clear(); // Define los límites del mapa. El plano va de -10 a 10 en X e Y.
    const HALF_SIZE = TARGET_PLOT_SIZE / 2; // 10

    if (plotData.length > 0) {
      plotData.forEach((item) => {
        // 1. Calcula la posición final del punto con escala y offset
        const finalX = item.normalizedX * scale + offsetX;
        const finalY = item.normalizedY * scale + offsetY; // 2. Comprueba si el punto está DENTRO de los límites [-10, 10]

        if (
          finalX >= -HALF_SIZE &&
          finalX <= HALF_SIZE &&
          finalY >= -HALF_SIZE &&
          finalY <= HALF_SIZE
        ) {
          // Si está dentro, crea y añade el mesh
          const mesh = new THREE.Mesh(pointGeometry, material); // 🚨 Almacena el dato original para el raycasting

          mesh.userData = item; // Aplica la posición final

          mesh.position.set(finalX, finalY, 0.05);

          pointsGroup.add(mesh);
        }
      });
    }
  } // Dibujo inicial con los valores fijos

  updatePoints(currentScale, currentOffsetX, currentOffsetY); // --- BUCLE DE ANIMACIÓN ---

  function animate() {
    requestAnimationFrame(animate);
    controls.update(); // Necesario para el efecto de inercia y la órbita
    renderer.render(scene, camera);
  }

  animate(); // Manejar redimensionamiento

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// Ejecuta la inicialización de Three.js y la carga de datos
initThreeJS();