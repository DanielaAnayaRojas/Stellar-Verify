import { useState } from "react";
import textos from "../content/textos.json";
import { calcularHuella } from "../services/huella.js";
import { obtenerCredencial } from "../services/credencialesService.js";

export default function Verificar() {
  const [fase, setFase] = useState("espera");
  const [credencial, setCredencial] = useState(null);
  const [error, setError] = useState("");

  async function alElegirArchivo(evento) {
    const archivo = evento.target.files && evento.target.files[0];
    if (!archivo) return;
    setError("");
    setFase("calculando");
    try {
      const huella = await calcularHuella(archivo);
      setFase("consultando");
      setCredencial(await obtenerCredencial(huella));
      setFase("listo");
    } catch (fallo) {
      setError(fallo.message);
      setFase("espera");
    }
  }

  let mensaje = "";
  if (fase === "calculando") mensaje = textos.verificar.calculando;
  if (fase === "consultando") mensaje = textos.verificar.consultando;
  if (fase === "listo") {
    if (!credencial) mensaje = textos.resultados.noEncontrada.explicacion;
    else if (credencial.estado === "valida") mensaje = textos.resultados.valida.explicacion;
    else {
      mensaje = textos.resultados.revocada.explicacion.replace("{fecha}", credencial.fechaRevocacion);
    }
  }

  return (
    <section aria-labelledby="titulo-home">
      <h1 id="titulo-home">{textos.home.titulo}</h1>
      <p>{textos.home.subtitulo}</p>
      <label className="boton" htmlFor="archivo">
        {textos.verificar.botonVerificar}
      </label>
      <input id="archivo" className="solo-lectores" type="file" onChange={alElegirArchivo} />
      <p role="status" aria-live="polite">
        {error || mensaje}
      </p>
    </section>
  );
}
