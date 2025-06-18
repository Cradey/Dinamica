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
const cursor = document.getElementById('custom-cursor');

document.addEventListener('DOMContentLoaded', () => {
  const pantalla = document.querySelector('.pantalla'); // Ojo: aquí usamos `querySelector`

  document.addEventListener('mousemove', e => {
    const rect = pantalla.getBoundingClientRect(); // ⚠️ pantalla debe ser un elemento real

    let x = e.clientX;
    let y = e.clientY;


    // Limitar horizontalmente dentro de .pantalla
    // if (x < rect.left) x = rect.left;
    // if (x > rect.right) x = rect.right;

    // Limitar verticalmente SOLO A LA MITAD INFERIOR
    const mitad = rect.top + rect.height / 2;
    if (y < mitad) y = mitad;
    if (y > rect.bottom) y = rect.bottom;

    const offsetX = cursor.offsetWidth / 2;
    const offsetY = cursor.offsetHeight / 2;

    cursor.style.transform = `translate(${x - offsetX - 330}px, ${y - offsetY }px)`;
  });
});


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

  mano.style.left = rect.left - pantalla.left + rect.width / 2 + 15 + "px";
  mano.style.top = rect.top - pantalla.top + rect.height / 2 - 100 + "px";
  mano.style.display = "block";
  mano.classList.remove("animar-mano-retorno"); // por si quedó una clase anterior
  mano.classList.add("animar-mano-subida");
  
  // Cuando termina la animación de subida, hacer que vuelva abajo
  mano.addEventListener("animationend", function retorno() {
    mano.classList.remove("animar-mano-subida");
    mano.classList.add("animar-mano-retorno");

    mano.addEventListener("animationend", function ocultar() {
      mano.classList.remove("animar-mano-retorno");
      mano.style.display = "none";
      mano.removeEventListener("animationend", ocultar);
    });
    mano.removeEventListener("animationend", retorno);
  });
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
  cursor.classList.add('ocultar');
  const nombre = inputNombre.value.trim();
  const posicion = parseInt(inputPosicion.value) - 1;
  if (!nombre || isNaN(posicion) || posicion < 0 || posicion >= cardsTotales) return;

  const celda = tablaJuego.children[posicion];
  celda.querySelector(".nombre").textContent = nombre;
  mostrarManoSobreElemento(celda);

  reproducirAudio(posicion + 1); // +1 porque los audios van de 1 a 20
  setTimeout(() => {
    cursor.classList.remove('ocultar');
  }, 2000); // se vuelve a mostrar luego de 1 segundo (ajústalo si es necesario)
});

btnGenerarTablero.addEventListener("click", crearTablero);
btnLimpiar.addEventListener("click", crearTablero);
btnTerminar.addEventListener("click", () => {
  intervaloActivo = false;
  cursor.classList.remove('ocultar');
  });

btnEmpezar.addEventListener("click", async () => {
  cursor.classList.add('ocultar');
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


const canvas = document.getElementById('fondo-particulas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let particles = [];

for (let i = 0; i < 80; i++) {
  particles.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 2 + 1,
    speedX: (Math.random() - 0.5) * 0.8,
    speedY: (Math.random() - 0.5) * 0.8,
    color: `rgba(${Math.floor(Math.random()*255)}, ${Math.floor(Math.random()*255)}, 255, 0.6)`
  });
}

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let p of particles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    
    p.x += p.speedX;
    p.y += p.speedY;

    // Rebotar en bordes
    if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
    if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;
  }
  requestAnimationFrame(animateParticles);
}

animateParticles();

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

function configurarFondoCamara() {
  const video = document.getElementById('camara-fondo');
  const fondoCamara = document.querySelector('.fondo-camara');
  const imagenEstatica = document.querySelector('.imagen-estatica');
  const chkCamara = document.getElementById('activar-camara');

  if (chkCamara && chkCamara.checked) {
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(stream => {
        video.srcObject = stream;
        fondoCamara.classList.remove('falla');
        fondoCamara.style.display = 'block';
        imagenEstatica.style.top = '30vh';
        imagenEstatica.style.height = '70vh';
      })
      .catch(err => {
        console.warn("No se pudo acceder a la cámara, se mostrará solo la imagen.");
        fondoCamara.classList.add('falla');
        fondoCamara.style.display = 'none';
        imagenEstatica.style.top = '0';
        imagenEstatica.style.height = '100vh';
        chkCamara.checked = false; // desmarca si falla
      });
  } else {
    // Si no está activado el checkbox, mostrar solo imagen
    if (video.srcObject) {
      video.srcObject.getTracks().forEach(track => track.stop());
    }
    video.srcObject = null;
    fondoCamara.style.display = 'none';
    imagenEstatica.style.top = '0';
    imagenEstatica.style.height = '100vh';
  }
}

// Ejecutar al cargar y al cambiar el checkbox
document.addEventListener("DOMContentLoaded", () => {
  crearTablero();
  configurarFondoCamara();

  const chkCamara = document.getElementById('activar-camara');
  if (chkCamara) {
    chkCamara.addEventListener('change', configurarFondoCamara);
  }
});

