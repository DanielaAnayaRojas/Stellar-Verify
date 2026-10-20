// Piezas pequeñas de la UI tech: sello de estado y tarjeta de cifra.
import textos from "../../content/textos-panel.json";
import Icono from "../Iconos.jsx";
import { useCountUp } from "../hooks.js";
import { cifra } from "../movimiento.js";

const CLASE_ESTADO = {
  valida: "p-ok",
  revocada: "p-rev",
  noConfirmada: "p-draft",
  noEncontrada: "p-neutral",
  sinComprobar: "p-neutral",
};

// Sello de estado con el vocabulario único del panel (Válida, Revocada, No confirmada, No encontrada, Sin comprobar).
export function Pill({ estado, className = "", children, ...resto }) {
  return (
    <span className={`pill ${CLASE_ESTADO[estado] ?? "p-neutral"} ${className}`.trim()} {...resto}>
      {children ?? textos.estados[estado] ?? textos.estados.sinComprobar}
    </span>
  );
}

const ICONO_CIFRA = {
  boveda: ["documento", "ic-green"],
  validas: ["escudo", "ic-green"],
  revocadas: ["revocada", "ic-red"],
  revisar: ["alerta", "ic-amber"],
};

// Tarjeta de cifra con conteo animado. "valor" null = cargando (se muestra una raya, nunca un número inventado).
export function StatCard({ tipo, valor, label, sub, retraso = 0 }) {
  const visible = useCountUp(valor ?? 0);
  const [icono, tono] = ICONO_CIFRA[tipo] ?? ICONO_CIFRA.boveda;
  return (
    <div className="card stat rise" style={{ animationDelay: `${retraso}ms` }}>
      <span className={`stat-ic ${tono}`} aria-hidden="true">
        <Icono nombre={icono} />
      </span>
      <span className="stat-n num" aria-hidden="true">
        {valor == null ? "—" : cifra(visible)}
      </span>
      {/* El conteo animado no se lee cifra por cifra: los lectores de pantalla reciben el valor final. */}
      <span className="stat-l">
        {label}
        {valor != null && <span className="sr">: {cifra(valor)}</span>}
      </span>
      <span className="stat-s">{sub}</span>
    </div>
  );
}
