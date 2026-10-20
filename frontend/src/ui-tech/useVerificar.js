// Verificación de una credencial bajo demanda, una a la vez (cada una cuesta unas 2 consultas a ACTA).
// Compartido por las listas del panel. La sesión vencida (401) cierra la sesión; lo demás sale como "sin comprobar".
import { useCallback, useState } from "react";
import textos from "../content/textos-panel.json";
import { tipoDeFallo } from "../data/modelo.js";
import { leerCredencial } from "../data/real.js";

export function useVerificar({ avisar, expirar, onAnuncio }) {
  const [verificaciones, setVerificaciones] = useState({});
  const ocupado = Object.values(verificaciones).some((v) => v.estado === "verificando");

  const verificar = useCallback(
    async (huella, etiqueta) => {
      setVerificaciones((v) => ({ ...v, [huella]: { estado: "verificando" } }));
      let resultado = { huella, estado: "sinComprobar", motivo: null };
      try {
        resultado = await leerCredencial(huella);
      } catch (fallo) {
        const tipo = tipoDeFallo(fallo);
        if (tipo === "sesion") {
          expirar();
          return;
        }
        if (!Number.isInteger(fallo?.status)) console.error(fallo);
        if (tipo === "conexion") resultado = { ...resultado, motivo: "conexion" };
      } finally {
        setVerificaciones((v) => ({ ...v, [huella]: resultado }));
      }
      onAnuncio?.(textos.verificar.anuncio.replace("{curso}", etiqueta).replace("{estado}", textos.estados[resultado.estado]));
      if (resultado.estado === "sinComprobar") {
        const texto = resultado.motivo === "limite" ? textos.verificar.limite : resultado.motivo === "conexion" ? textos.verificar.conexion : textos.verificar.fallo;
        avisar({ clave: "verificar", tono: "error", texto });
      }
    },
    [avisar, expirar, onAnuncio],
  );

  const reiniciar = useCallback(() => setVerificaciones({}), []);
  return { verificaciones, ocupado, verificar, reiniciar };
}
