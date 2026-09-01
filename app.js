const lista = document.querySelector("#peliculas");
const buscar = document.querySelector("#buscar");
const contador = document.querySelector("#contador");
const sinResultados = document.querySelector("#sin-resultados");

let peliculas = [];

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
      if (caracter === "\r" && siguiente === "\n") {
        i++;
      }

      fila.push(campo);
      if (fila.some(valor => valor.trim() !== "")) {
        filas.push(fila);
      }

      fila = [];
      campo = "";
    } else {
      campo += caracter;
    }
  }

  if (campo !== "" || fila.length > 0) {
    fila.push(campo);
    filas.push(fila);
  }

  if (filas.length === 0) {
    return [];
  }

  const cabeceras = filas[0].map(cabecera =>
    cabecera.trim().toLowerCase()
  );

  return filas.slice(1).map(fila => {
    const pelicula = {};

    cabeceras.forEach((cabecera, indice) => {
      pelicula[cabecera] = (fila[indice] || "").trim();
    });

    return pelicula;
  });
}

function formatearFecha(fecha) {
  const partes = fecha.split("-");

  if (partes.length !== 3) {
    return fecha;
  }

  const [año, mes, dia] = partes;
  return `${dia}/${mes}/${año}`;
}

function escaparHTML(texto) {
  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function mostrarPeliculas() {
  const termino = buscar.value.trim().toLocaleLowerCase();

  const filtradas = peliculas
    .filter(pelicula =>
      pelicula.titulo.toLocaleLowerCase().includes(termino)
    )
    .sort((a, b) =>
      b.fecha_vista.localeCompare(a.fecha_vista)
    );

  lista.innerHTML = "";

  filtradas.forEach(pelicula => {
    const tarjeta = document.createElement("article");
    tarjeta.className = "tarjeta";

    tarjeta.innerHTML = `
      <h2>${escaparHTML(pelicula.titulo)}</h2>
      <div class="fecha">${escaparHTML(
        formatearFecha(pelicula.fecha_vista)
      )}</div>
      <p class="valoracion">${escaparHTML(
        pelicula.valoracion
      )}</p>
    `;

    lista.appendChild(tarjeta);
  });

  contador.textContent =
    `${filtradas.length} película${filtradas.length === 1 ? "" : "s"}`;

  sinResultados.classList.toggle("oculto", filtradas.length !== 0);
}

async function cargarPeliculas() {
  try {
    const respuesta = await fetch("peliculas.csv");

    if (!respuesta.ok) {
      throw new Error("No se pudo cargar el CSV");
    }

    const texto = await respuesta.text();
    peliculas = analizarCSV(texto);
    mostrarPeliculas();
  } catch (error) {
    contador.textContent = "Error al cargar las películas";
    console.error(error);
  }
}

buscar.addEventListener("input", mostrarPeliculas);
cargarPeliculas();
