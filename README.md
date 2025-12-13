# Práctica S8 IG: Visualización Geográfica de Datos en Three.js

## 1. Propuesta de Visualización y Objetivo

Esta práctica consiste en una visualización interactiva 3D desarrollada en **Three.js** utilizando datos geográficos de acceso abierto (accesos de estaciones).

El objetivo es representar la **ubicación espacial de los puntos de acceso/estaciones** sobre un plano georreferenciado (mapa de fondo), permitiendo al usuario la **exploración inmersiva** y la **consulta de datos detallados** de cada punto.

### Características Implementadas:

* **Georreferenciación y Normalización:** Las coordenadas geográficas (X/Y) del archivo `M4_Accesos.csv` se han **normalizado y escalado** para ajustarse a un plano de **20x20 unidades** de Three.js.
* **Interactividad (Raycasting):** Se utiliza el Raycasting para detectar el clic del ratón sobre las esferas (estaciones).
* **Visualización de Datos:** Un panel HTML (`#info-box`) superpuesto muestra información detallada del punto (Código, Acceso, Vía/Calle y Coordenadas originales).
<img width="270" height="272" alt="image" src="https://github.com/user-attachments/assets/2ab96d6e-592f-437d-96e9-592452d3828f" />

* **Navegación:** Implementación de `OrbitControls` para rotar, hacer zoom y panear la escena 3D.

***

## 2. Tecnologías y Dependencias

Este proyecto está configurado como un módulo moderno de JavaScript que utiliza `npm` y **Vite** como servidor de desarrollo y *bundler*.

* **Framework 3D:** [Three.js](https://threejs.org/)
* **Controladores:** `OrbitControls`
* **Entorno de Desarrollo:** Node.js, `npm`, y **Vite**.

***

## 3. Instalación y Ejecución

Para iniciar el proyecto en tu entorno local, sigue estos pasos:

### Requisitos Previos:

Asegúrate de tener [Node.js](https://nodejs.js.org/) y `npm` instalados.

### Pasos:

1.  **Clonar el Repositorio:**
    ```bash
    git clone [ENLACE DE TU REPOSITORIO AQUÍ]
    cd [nombre-de-tu-carpeta]
    ```

2.  **Instalar Dependencias:**
    ```bash
    npm install
    ```
    *Esto instalará `three` y `vite` (el servidor de desarrollo) basándose en `package.json`.*

3.  **Ejecutar el Proyecto:**
    ```bash
    npm run start
    ```

    El servidor se iniciará automáticamente y se abrirá en tu navegador (normalmente en `http://localhost:5173/`).

***

## 4. Estructura de Archivos

| Archivo/Carpeta | Descripción |
| :--- | :--- |
| `index.html` | Punto de entrada HTML. |
| `package.json` | Lista de dependencias del proyecto (`three`, `vite`) y el script `npm run start`. |
| `.gitignore` | Configuración para ignorar `node_modules/` y `/dist`. |
| `src/main.js` | **CÓDIGO PRINCIPAL** de la escena Three.js y lógica de raycasting. |
| `src/M4_Accesos.csv` | Fuente de datos de accesos de estaciones (datos geográficos). |
| `src/Madrid-Map-Spain.jpg` | Textura de mapa utilizada como plano de fondo. |

***

##  Ver en CodeSandbox

Puedes probar este proyecto en vivo usando el siguiente enlace:

[Abrir Proyecto en CodeSandbox](https://codesandbox.io/p/sandbox/amazing-microservice-w7rj52)
