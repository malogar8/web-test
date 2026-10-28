const lista = document.querySelector("#peliculas");
const buscar = document.querySelector("#buscar");
const contador = document.querySelector("#contador");
const sinResultados = document.querySelector("#sin-resultados");
const btnPeliculas = document.querySelector("#btn-peliculas");
const btnLecturas = document.querySelector("#btn-lecturas");

// URLs de tus Google Sheets en formato CSV
const URL_PELICULAS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSLY91PpxNSdyt9YrCe3YubDHAUMnd9BQU5mXyRbEVBQoUSFlwhY_GTeuw9P3qlnGlullNnk9SHXz1x/pub?gid=944418103&single=true&output=csv";
const URL_LECTURAS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQl_c4q08BpWYHd9LEp17XYSSepdT1jyvXsKRCTVtWZY2jvU2addCD41lnz1NAvZoDBJ7aQqZAshKnL/pub?gid=944418103&single=true&output=csv";

let peliculas = [];
let lecturas = [];
let vistaActual = "peliculas"; // 'peliculas' o 'lecturas'

function analizarCSV(texto) {
  const filas = [];
  let fila = [];
  let campo = "";
  let dentroDeComillas = false;

  for (let i = 0; i < texto.length; i++) {
    const caracter = texto[i];
    const siguiente = texto[i + 1];

    if (caracter === '"' && dentroDeComillas && siguiente === '"') {
      campo += '"';
      i++;
    } else if (caracter === '"') {
      dentroDeComillas = !dentroDeComillas;
    } else if (caracter === "," && !dentroDeComillas) {
      fila.push(campo);
      campo = "";
    } else if ((caracter === "\n" || caracter === "\r") && !dentroDeComillas) {
      if (caracter === "\r" && siguiente === "\n") i++;
      fila.push(campo);
      if (fila.some(valor => valor.trim() !== "")) filas.push(fila);
      fila = [];
      campo = "";
    } else {
      campo += caracter;
    }
  }

  if (campo !== "" || fila.length > 0) {
    fila.push(campo);
    if (fila.some(valor => valor.trim() !== "")) filas.push(fila);
  }

  if (filas.length < 2) return [];

  const cabeceras = filas[0].map(c => c.replace(/^\uFEFF/, "").trim().toLowerCase());

  return filas.slice(1).map(valores => {
    const objeto = {};
    cabeceras.forEach((cabecera, indice) => {
      objeto[cabecera] = (valores[indice] || "").trim();
    });
    return objeto;
  });
}

function formatearFecha(fecha) {
  if (!fecha) {
    return "";
  }

  const fechaLimpia = fecha.split("T")[0];
  const partes = fechaLimpia.split("-");

  if (partes.length !== 3) {
    return fecha;
  }

  const [año, mes, dia] = partes;
  return `${dia}-${mes}-${año.slice(-2)}`;
}

function escaparHTML(texto) {
  const elemento = document.createElement("div");
  elemento.textContent = texto ?? "";
  return elemento.innerHTML;
}

function mostrarDatos() {
  const termino = buscar.value.trim().toLocaleLowerCase();
  const datos = vistaActual === "peliculas" ? peliculas : lecturas;

  const filtradas = datos
    .filter(item => {
      const titulo = (item.titulo || "").toLocaleLowerCase();
      const valoracion = (item.valoracion || "").toLocaleLowerCase();
      const autor = (item.autor_lectura || "").toLocaleLowerCase();
      const año = (item.año || "").toLocaleLowerCase();

      // Comprueba si el término de búsqueda está en cualquiera de los campos
      return (
        titulo.includes(termino) ||
        valoracion.includes(termino) ||
        autor.includes(termino) ||
        año.includes(termino)
      );
    })
    .sort((a, b) => {
      const fechaA = vistaActual === "peliculas" ? (a.fecha_vista || "") : (a.fecha_lectura || "");
      const fechaB = vistaActual === "peliculas" ? (b.fecha_vista || "") : (b.fecha_lectura || "");
      return fechaB.localeCompare(fechaA);
    });

  lista.innerHTML = "";

  filtradas.forEach(item => {
    if (vistaActual === "lecturas") {
      console.log("Objeto libro completo:", item);
      console.log("Valor de autor_lectura:", item.autor_lectura);
    }
    const titulo = escaparHTML(item.titulo || "");
    const año = escaparHTML(item.año || "");
    const valoracion = escaparHTML(item.valoracion || "");
    
    const tarjeta = document.createElement("article");
    tarjeta.className = "tarjeta";

    if (vistaActual === "peliculas") {
      const fechaVista = escaparHTML(formatearFecha(item.fecha_vista));
      tarjeta.innerHTML = `
        <h2>${titulo}${año ? ` (${año})` : ""}</h2>
        ${fechaVista ? `<div class="fecha">fecha reseña: ${fechaVista}</div>` : ""}
        <p class="valoracion">${valoracion}</p>
      `;
    } else {
      const autor = escaparHTML(item.autor_lectura || "");
      const fechaLectura = escaparHTML(formatearFecha(item.fecha_lectura));
      tarjeta.innerHTML = `
        <h2>${titulo}${año ? ` (${año})` : ""}</h2>
        ${autor ? `<p class="autor">${autor}</p>` : ""}
        ${fechaLectura ? `<div class="fecha">fecha reseña: ${fechaLectura}</div>` : ""}
        <p class="valoracion">${valoracion}</p>
      `;
    }

    lista.appendChild(tarjeta);
  });

  const nombreEntidad = vistaActual === "peliculas" ? "película" : "libro";
  contador.textContent = `${filtradas.length} ${nombreEntidad}${filtradas.length === 1 ? "" : "s"}`;
  sinResultados.classList.toggle("oculto", filtradas.length !== 0);
}

async function cargarDatos() {
  try {
    const [resPelis, resLecturas] = await Promise.all([
      fetch(URL_PELICULAS),
      fetch(URL_LECTURAS)
    ]);

    if (!resPelis.ok || !resLecturas.ok) throw new Error("Error al cargar los datos");

    const textoPelis = await resPelis.text();
    const textoLecturas = await resLecturas.text();

    peliculas = analizarCSV(textoPelis);
    lecturas = analizarCSV(textoLecturas);

    mostrarDatos();
  } catch (error) {
    contador.textContent = "Error al cargar el contenido";
    sinResultados.classList.remove("oculto");
    console.error(error);
  }
}

// Eventos de cambio de pestaña
btnPeliculas.addEventListener("click", () => {
  vistaActual = "peliculas";
  btnPeliculas.classList.add("activa");
  btnLecturas.classList.remove("activa");
  buscar.placeholder = "Buscar película...";
  mostrarDatos();
});

btnLecturas.addEventListener("click", () => {
  vistaActual = "lecturas";
  btnLecturas.classList.add("activa");
  btnPeliculas.classList.remove("activa");
  buscar.placeholder = "Buscar libro...";
  mostrarDatos();
});

buscar.addEventListener("input", mostrarDatos);

cargarDatos();
