// Variables globales
const tablaJuego = document.getElementById("tabla-juego");
const numeroActual = document.getElementById("numero-actual");
const mano = document.getElementById("mano-emoji");
const pelota = document.querySelector(".bolita-futbol");

const contenedorGanadores = document.getElementById("contenedor-ganadores");
const listaGanadores = document.getElementById("lista-ganadores");
const mensajePrevio = document.getElementById("mensaje-previo");
const inputTextoPrevio = document.getElementById("texto-previo");

const btnAgregar = document.getElementById("btn-agregar");
const btnEmpezar = document.getElementById("btn-empezar");
const btnTerminar = document.getElementById("btn-terminar");
const btnLimpiar = document.getElementById("btn-limpiar");
const btnGenerarTablero = document.getElementById("btn-generar-tablero");

const inputNombre = document.getElementById("input-nombre");
const inputPosicion = document.getElementById("input-posicion");
const inputCantidadCards = document.getElementById("cantidad-cards");
const selectGanadores = document.getElementById("select-ganadores");
const inputProbabilidades = document.getElementById("probabilidades");
const inputFilas = document.getElementById("input-filas");
const inputColumnas = document.getElementById("input-columnas");

const selectForma = document.getElementById("select-forma"); // Control para elegir forma

let cardsTotales = 20;
let totalGanadores = 3;
let ganadores = [];
let yaSalieron = new Set();
let intervaloActivo = false;
let mapaProbabilidades = {};
let minimoChecksGlobal = 1; // <- NUEVA VARIABLE DE CONTROL
let tipoFormaChecks = "cuadrado"; // Por defecto cuadrados

// Detectar cambio en forma y regenerar tablero
selectForma.addEventListener("change", () => {
  tipoFormaChecks = selectForma.value; // "cuadrado" o "circulo"
  crearTablero();
});

[inputNombre, inputPosicion].forEach(input => {
  input.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      btnAgregar.click();
    }
  });
});

window.speechSynthesis.onvoiceschanged = () => {
  window.vozFemenina = window.speechSynthesis
    .getVoices()
    .find(v => v.name.includes("Google") && v.lang.startsWith("es"));
};

function decirFrase(texto) {
  return new Promise((resolve) => {
    const mensaje = new SpeechSynthesisUtterance(texto);
    mensaje.lang = "es-ES";
    if (window.vozFemenina) mensaje.voice = window.vozFemenina;
    mensaje.onend = resolve;
    window.speechSynthesis.speak(mensaje);
  });
}

function mostrarManoSobreElemento(elemento) {
  if (!elemento) return;
  const rect = elemento.getBoundingClientRect();
  const pantalla = document.querySelector(".pantalla").getBoundingClientRect();
  mano.style.left = rect.left - pantalla.left + rect.width / 2 - 40 + "px";
  mano.style.top = rect.top - pantalla.top + rect.height / 2 - 65 + "px";
  mano.style.display = "block";
  mano.classList.add("animar-mano");

  setTimeout(() => {
    mano.classList.remove("animar-mano");
    mano.style.display = "none";
  }, 800);
}

function parsearProbabilidades() {
  mapaProbabilidades = {};
  const texto = inputProbabilidades.value.trim();
  if (!texto) return;
  const pares = texto.split(",");
  for (let par of pares) {
    const [num, prob] = par.split("=").map(x => parseInt(x.trim()));
    if (!isNaN(num) && !isNaN(prob) && prob > 0) {
      mapaProbabilidades[num - 1] = prob;
    }
  }
}

function crearTablero() {
  const categoria = document.getElementById("select-categoria").value;
  tablaJuego.innerHTML = "";
  ganadores = [];
  yaSalieron = new Set();
  numeroActual.textContent = "0";

  mensajePrevio.textContent = inputTextoPrevio.value.trim() || mensajePrevio.textContent;
  mensajePrevio.style.display = "block";
  listaGanadores.innerHTML = "";
  listaGanadores.style.display = "none";

  cardsTotales = parseInt(inputCantidadCards.value) || 20;
  totalGanadores = parseInt(selectGanadores.value) || 3;
  parsearProbabilidades();

  const filas = parseInt(inputFilas.value) || 5;
  const columnas = parseInt(inputColumnas.value) || 4;
  tablaJuego.style.gridTemplateColumns = `repeat(${columnas}, 1fr)`;

  // Clase para mini-cuadros según forma
  const formaClass = tipoFormaChecks === "circulo" ? "circulo" : "cuadrado";

  for (let i = 1; i <= cardsTotales; i++) {
    const celda = document.createElement("div");
    celda.classList.add("celda");
    celda.setAttribute("data-index", i - 1);

    let contenidoImagen = "";

    if (categoria.toUpperCase() === "CORAZONES") {
      const corazonesEmoji = ['❤️', '🧡', '💛', '💚', '💙', '💜', '🤍', '🖤', '🤎'];
      const emojiAleatorio = corazonesEmoji[Math.floor(Math.random() * corazonesEmoji.length)];
      contenidoImagen = `<div class="emoji-corazon">${emojiAleatorio}</div>`;
    } else {
      const rutaImagen = `${categoria}/${i}.jpg`;
      contenidoImagen = `<img src="${rutaImagen}" class="imagen-card" alt="Imagen ${i}" />`;
    }

    celda.innerHTML = `
      ${contenidoImagen}
      <div class="numero">${i}</div>
      <div class="nombre"></div>
      <div class="mini-cuadros">
        ${`<div class='mini-cuadro ${formaClass}'></div>`.repeat(5)}
      </div>
    `;
    tablaJuego.appendChild(celda);
  }
}

function sorteoPonderado() {
  const lista = [];
  for (let i = 0; i < cardsTotales; i++) {
    const prob = mapaProbabilidades[i] || 1;
    for (let j = 0; j < prob; j++) lista.push(i);
  }
  return lista[Math.floor(Math.random() * lista.length)];
}

btnAgregar.addEventListener("click", () => {
  const nombre = inputNombre.value.trim();
  const posicion = parseInt(inputPosicion.value) - 1;
  if (!nombre || isNaN(posicion) || posicion < 0 || posicion >= cardsTotales) return;

  const celda = tablaJuego.children[posicion];
  celda.querySelector(".nombre").textContent = nombre;
  mostrarManoSobreElemento(celda);

  reproducirAudio(posicion + 1); // +1 porque los audios van de 1 a 20
});

btnGenerarTablero.addEventListener("click", crearTablero);
btnLimpiar.addEventListener("click", crearTablero);
btnTerminar.addEventListener("click", () => (intervaloActivo = false));

btnEmpezar.addEventListener("click", async () => {
  if (intervaloActivo) return;
  intervaloActivo = true;
  parsearProbabilidades();

  function todasTienenMinimoChecks(minimo) {
    return Array.from(tablaJuego.children).every(celda => {
      const n = celda.querySelectorAll(".mini-cuadro.check").length;
      return n >= minimo;
    });
  }

  async function sortear() {
    if (!intervaloActivo || ganadores.length >= totalGanadores) return;

    let index;
    let intentos = 0;

    do {
      index = sorteoPonderado();
      const celda = tablaJuego.children[index];
      const nChecks = celda.querySelectorAll(".mini-cuadro.check").length;

      if (nChecks === 4 && !todasTienenMinimoChecks(minimoChecksGlobal)) {
        intentos++;
        if (intentos > 100) return;
        continue;
      }

      if (yaSalieron.has(index)) {
        intentos++;
        if (intentos > 100) return;
        continue;
      }

      break;
    } while (true);

    pelota.classList.add("girando");
    await new Promise(r => setTimeout(r, 800));
    pelota.classList.remove("girando");
    numeroActual.textContent = index + 1;

    const celda = tablaJuego.children[index];
    const cuadros = celda.querySelectorAll(".mini-cuadro");
    const cuadro = Array.from(cuadros).find(c => !c.classList.contains("check"));
    if (!cuadro || ganadores.includes(index)) {
      yaSalieron.add(index);
      return sortear();
    }

    cuadro.classList.add("check");
    mostrarManoSobreElemento(cuadro);
    const checks = celda.querySelectorAll(".mini-cuadro.check").length;

    if (checks === 3) {
      await decirFrase(`${index + 1}, avanza`);
    } else if (checks === 4) {
      await decirFrase(`${index + 1}, espera`);
    } else if (checks === 5) {
      if (ganadores.length < totalGanadores) {
        if (ganadores.length === 0) {
          mensajePrevio.style.display = "none";
          listaGanadores.style.display = "block";
        }

        const puesto = ["primer", "segundo", "tercer", "cuarto", "quinto"][ganadores.length];
        await decirFrase(`${index + 1}, ${puesto} lugar`);
        ganadores.push(index);
        yaSalieron.add(index);

        const divNumero = celda.querySelector(".numero");
        divNumero.innerHTML += ` 🏆<span style="font-size:0.6rem;">(${puesto})</span>`;

        const nombre = celda.querySelector(".nombre").textContent || `Card ${index + 1}`;
        const nuevoGanador = document.createElement("div");
        nuevoGanador.className = `ganador puesto-${ganadores.length}`;
        nuevoGanador.textContent = `🥇 ${nombre} (${puesto} lugar)`;
        listaGanadores.appendChild(nuevoGanador);
      }
    } else {
      await decirFrase((index + 1).toString());
    }

    setTimeout(sortear, 400);
  }

  sortear();
});

function reproducirAudio(posicion) {
  const audio = new Audio(`audios/${posicion}.mp3`);
  audio.currentTime = 0.5; // empieza a reproducir desde el segundo 0.5
  audio.play();
}

document.addEventListener("DOMContentLoaded", crearTablero);
