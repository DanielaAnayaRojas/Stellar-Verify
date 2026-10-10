import { NavLink, Link, Route, Routes } from "react-router-dom";
import textos from "./content/textos.json";
import Verificar from "./pages/Verificar.jsx";
import Panel from "./pages/Panel.jsx";

export default function App() {
  return (
    <>
      <div className="franja-demo" role="note">
        <p>{textos.demo}</p>
      </div>
      <header className="cabecera">
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
      </header>
      <main className="contenido">
        <Routes>
          <Route path="/" element={<Verificar />} />
          <Route path="/panel" element={<Panel />} />
          <Route path="*" element={<Verificar />} />
        </Routes>
      </main>
    </>
  );
}
