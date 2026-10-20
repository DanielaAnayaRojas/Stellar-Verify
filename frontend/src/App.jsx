import { lazy, Suspense } from "react";
import { NavLink, Link, Route, Routes, useLocation } from "react-router-dom";
import textos from "./content/textos.json";
import Verificar from "./pages/Verificar.jsx";
import Panel from "./pages/Panel.jsx";
import Emitir from "./pages/Emitir.jsx";
import Detalle from "./pages/Detalle.jsx";
import PanelGate from "./components/PanelGate.jsx";
import { esRutaTech } from "./ui-tech/rutas.js";
import { conceptoActivo } from "./data/concepto.js";
import CargaSegura from "./ui-tech/CargaSegura.jsx";

// Panel de instituciones con la UI tech: pantalla completa y carga diferida (sus estilos y fuentes no
// se descargan en las páginas públicas). Las rutas de /panel aún no migradas siguen abajo, como antes.
const PanelTech = lazy(() => import("./ui-tech/PanelTech.jsx"));

export default function App() {
  const { pathname } = useLocation();
  if (esRutaTech(pathname, { concepto: conceptoActivo() })) {
    return (
      <CargaSegura>
        <Suspense fallback={null}>
          <PanelTech />
        </Suspense>
      </CargaSegura>
    );
  }

  return (
    <>
      {/* El aviso de red de pruebas va dentro del encabezado para que los lectores de pantalla lo ubiquen en una zona. */}
      <header>
        <div className="franja-demo" role="note">
          <p>{textos.testnet}</p>
        </div>
        <div className="cabecera">
          <div className="cabecera__interior">
            <Link className="cabecera__marca" to="/">
              {textos.marca}
            </Link>
            <nav className="cabecera__nav" aria-label="Principal">
              <NavLink className="cabecera__enlace" to="/" end>
                {textos.nav.verificar}
              </NavLink>
              <NavLink className="cabecera__enlace" to="/panel">
                {textos.nav.panel}
              </NavLink>
            </nav>
          </div>
        </div>
      </header>
      <main className="contenido">
        <Routes>
          <Route path="/" element={<Verificar />} />
          <Route path="/verificar/:huella" element={<Verificar />} />
          <Route element={<PanelGate />}>
            {/* Lista completa de la bóveda (con sospechosas) hasta que la fase 3 la migre a la UI tech. */}
            <Route path="/panel/credenciales" element={<Panel />} />
            <Route path="/panel/emitir" element={<Emitir />} />
            <Route path="/panel/credencial/:huella" element={<Detalle />} />
          </Route>
          <Route path="*" element={<Verificar />} />
        </Routes>
      </main>
    </>
  );
}
