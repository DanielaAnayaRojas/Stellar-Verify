import textos from "../content/textos.json";

export default function Pasos({ actual }) {
  const nombres = textos.emision.pasos;
  return (
    <ol className="pasos" aria-label={textos.emision.listaPasos}>
      {nombres.map((nombre, indice) => {
        const numero = indice + 1;
        const estado = numero < actual ? "hecho" : numero === actual ? "actual" : "pendiente";
        return (
          <li
            key={nombre}
            className={`paso paso--${estado}`}
            aria-current={estado === "actual" ? "step" : undefined}
          >
            <span className="paso__numero" aria-hidden="true">
              {numero}
            </span>
            <span className="paso__nombre">{nombre}</span>
          </li>
        );
      })}
    </ol>
  );
}
