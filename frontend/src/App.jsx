import { NavLink, Link, Route, Routes, useLocation } from "react-router-dom";
import textos from "./content/textos.json";
import Verificar from "./pages/Verificar.jsx";
import Panel from "./pages/Panel.jsx";
import Emitir from "./pages/Emitir.jsx";
import Detalle from "./pages/Detalle.jsx";
import PanelGate from "./components/PanelGate.jsx";
import { Roseta } from "./components/Sello.jsx";

export default function App() {
  const { pathname } = useLocation();
  const enVerificar = pathname === "/" || pathname.startsWith("/verificar");
  return (
    <>
      <div className="franja-demo" role="note">
        <p>{textos.testnet}</p>
      </div>
      <header className="cabecera">
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
      </header>
      <main className="contenido">
        <Routes>
          <Route path="/" element={<Verificar />} />
          <Route path="/verificar/:huella" element={<Verificar />} />
          <Route element={<PanelGate />}>
            <Route path="/panel" element={<Panel />} />
            <Route path="/panel/emitir" element={<Emitir />} />
            <Route path="/panel/credencial/:huella" element={<Detalle />} />
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
