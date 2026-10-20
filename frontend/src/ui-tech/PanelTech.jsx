// Entrada del panel tech. Se carga de forma diferida (React.lazy en App.jsx): sus estilos, fuentes e imágenes
// no se descargan en las páginas públicas hasta que alguien abre el panel.
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import "./estilos.js";
import { ToastProvider } from "./componentes/Toast.jsx";
import { SesionTechProvider } from "./sesion.jsx";
import AppShell from "./componentes/AppShell.jsx";
import Resumen from "./pantallas/Resumen.jsx";
import Credenciales from "./pantallas/Credenciales.jsx";
import Detalle from "./pantallas/Detalle.jsx";
import { RUTAS_TECH } from "./rutas.js";

export default function PanelTech() {
  // /panel/, /PANEL o /panel// llevan a la ruta canónica, para que la navegación marque bien la página actual.
  const { pathname, search, hash } = useLocation();
  const canonica = pathname.toLowerCase().replace(/\/+$/, "") || "/";
  if (canonica !== pathname) return <Navigate replace to={`${canonica}${search}${hash}`} />;

  return (
    <div className="sv">
      <ToastProvider>
        <SesionTechProvider>
          <Routes>
            <Route element={<AppShell />}>
              <Route path={RUTAS_TECH.resumen} element={<Resumen />} />
              <Route path={RUTAS_TECH.credenciales} element={<Credenciales />} />
              <Route path={`${RUTAS_TECH.detalle}/:huella`} element={<Detalle />} />
            </Route>
          </Routes>
        </SesionTechProvider>
      </ToastProvider>
    </div>
  );
}
