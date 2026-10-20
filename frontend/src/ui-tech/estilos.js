// Fuentes y estilos de la UI tech del panel. Todo queda acotado a .sv.
// Fraunces solo se usa dentro de los certificados (.cert y .pv redefinen --serif).
// Inter no se importa aquí: el sitio ya carga "@fontsource-variable/inter" (main.jsx) y el panel usa esa misma
// definición. Importar inter/opsz.css redefinía la familia «Inter Variable» con el eje de tamaño óptico y, una vez
// visitado el panel, cambiaba los títulos del sitio público.
import "@fontsource-variable/sora";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource-variable/fraunces/opsz.css";
import "@fontsource-variable/fraunces/opsz-italic.css";

import "./estilos/aislamiento.css";
import "./estilos/base.css";
import "./estilos/piezas.css";
