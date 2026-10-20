// Límite de errores del panel diferido. Si tras un despliegue el paquete viejo del panel ya no existe (el servidor
// responde index.html), React no puede importarlo: en vez de una página en blanco, se ofrece recargar. Cualquier
// otro error se registra en la consola y se muestra como lo que es, no como "el sitio se actualizó".
// Vive en el paquete principal, así que usa las clases del sitio público (los estilos del panel aún no cargaron).
import { Component } from "react";
import textos from "../content/textos-panel.json";

const FALLO_DE_CARGA = /dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i;

export default class CargaSegura extends Component {
  constructor(props) {
    super(props);
    this.state = { fallo: null };
  }

  static getDerivedStateFromError(error) {
    return { fallo: FALLO_DE_CARGA.test(String(error?.message ?? error)) ? "carga" : "otro" };
  }

  componentDidCatch(error, info) {
    console.error("Panel de instituciones:", error, info?.componentStack);
  }

  render() {
    if (!this.state.fallo) return this.props.children;
    const carga = this.state.fallo === "carga";
    return (
      <main className="contenido">
        <section aria-labelledby="titulo-carga">
          <h1 id="titulo-carga">{carga ? textos.carga.titulo : textos.carga.otroTitulo}</h1>
          <p>{carga ? textos.carga.texto : textos.carga.otroTexto}</p>
          <button type="button" className="boton" onClick={() => window.location.reload()}>
            {textos.carga.boton}
          </button>
        </section>
      </main>
    );
  }
}
