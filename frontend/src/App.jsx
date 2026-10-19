import { NavLink, Link, Route, Routes } from "react-router-dom";
import textos from "./content/textos.json";
import Verificar from "./pages/Verificar.jsx";
import Panel from "./pages/Panel.jsx";
import Emitir from "./pages/Emitir.jsx";
import Detalle from "./pages/Detalle.jsx";
import PanelGate from "./components/PanelGate.jsx";

export default function App() {
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
            <Route path="/panel" element={<Panel />} />
            <Route path="/panel/emitir" element={<Emitir />} />
            <Route path="/panel/credencial/:huella" element={<Detalle />} />
          </Route>
          <Route path="*" element={<Verificar />} />
        </Routes>
      </main>
    </>
  );
}
