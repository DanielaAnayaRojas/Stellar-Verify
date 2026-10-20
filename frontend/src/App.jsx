import { lazy, Suspense } from "react";
import { NavLink, Link, Route, Routes, useLocation } from "react-router-dom";
import textos from "./content/textos.json";
import Verificar from "./pages/Verificar.jsx";
import Emitir from "./pages/Emitir.jsx";
import PanelGate from "./components/PanelGate.jsx";
import { Roseta } from "./components/Sello.jsx";
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

  const enVerificar = pathname === "/" || pathname.startsWith("/verificar");
  return (
    <>
      {/* El aviso de red de pruebas va dentro del encabezado para que los lectores de pantalla lo ubiquen en una zona. */}
      <header>
        <div className="franja-demo" role="note">
          <p>{textos.testnet}</p>
        </div>
        <div className="cabecera">
          <div className="cabecera__interior">
            <Link className="cabecera__marca" to="/" aria-label={textos.marca}>
              <Roseta tipo="marca" />
              <span>{textos.marca}</span>
            </Link>
            <nav className="cabecera__nav" aria-label="Principal">
              <Link className="cabecera__enlace" to="/" aria-current={enVerificar ? "page" : undefined}>
                {textos.nav.verificar}
              </Link>
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
            {/* Emitir sigue con la página anterior hasta que la fase 4 la migre a la UI tech. */}
            <Route path="/panel/emitir" element={<Emitir />} />
          </Route>
          <Route path="*" element={<Verificar />} />
        </Routes>
      </main>
      <footer className="pie">
        <p>{textos.pie}</p>
      </footer>
    </>
  );
}
