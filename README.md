# Stellar-Verify

**Stellar-Verify** es un prototipo web para que una institución emita credenciales digitales y cualquier persona pueda consultar su estado mediante un documento, una huella, un enlace o un código QR.

**Demo pública:** https://stellar-verify.vercel.app/

> **Importante:** este entregable utiliza datos ficticios y una capa de servicios simulada en el navegador. Todavía **no** registra credenciales en Stellar, ACTA ni un backend real. Las emisiones y revocaciones de la demo se guardan en `localStorage` del navegador utilizado; por eso las credenciales nuevas no se comparten automáticamente entre dispositivos.

## Requisitos

- Node.js 20 o superior (recomendado).
- npm, incluido con Node.js.
- Un navegador web moderno.

## Instalación y ejecución local

Clona el repositorio y entra a la carpeta del frontend:

```bash
git clone https://github.com/DanielaAnayaRojas/Stellar-Verify.git
cd Stellar-Verify/frontend
npm install
npm run dev
```

Abre la dirección indicada por Vite (normalmente **http://localhost:5173/**).

Para generar una compilación de producción y previsualizarla localmente:

```bash
npm run build
npm run preview
```

Para comprobar los tres archivos ficticios y las huellas registradas (sin dependencias adicionales ni cambios a los datos), desde la carpeta `frontend` ejecuta:

```bash
node scripts/verificar-integridad.mjs
```

## Recorrido de demostración

| Pantalla | Dirección |
| --- | --- |
| Verificación pública | [Inicio](https://stellar-verify.vercel.app/) |
| Ejemplo válido | [Credencial válida](https://stellar-verify.vercel.app/verificar/a068ed6242b38ebaeaaa9e539ec60a85ea9675691dbb844da55ab7064fd96dca) |
| Ejemplo revocado | [Credencial revocada](https://stellar-verify.vercel.app/verificar/05830aa4f35aa2a609eb771c558d7096b7e2ca7e1e7c551042a8f52f3b2b709e) |
| Ejemplo no encontrado | [Credencial no encontrada](https://stellar-verify.vercel.app/verificar/0000000000000000000000000000000000000000000000000000000000000000) |
| Panel de institución | [Panel](https://stellar-verify.vercel.app/panel) |
| Emitir (simulado) | [Emisión](https://stellar-verify.vercel.app/panel/emitir) |

Los tres archivos para probar la verificación por carga se encuentran en [`frontend/public/ejemplos/`](frontend/public/ejemplos/).

El diseño del producto y la arquitectura prevista están en [`docs/semana2/ProductBlueprint.md`](docs/semana2/ProductBlueprint.md). La documentación de la semana 3 será incorporada por Daniela.

## Equipo

- **Luis Sánchez** — [@Lems91](https://github.com/Lems91): producto, frontend y despliegue.
- **Daniela Anaya Rojas** — [@DanielaAnayaRojas](https://github.com/DanielaAnayaRojas): datos de demostración y colaboración documental.
- **Gustavo González** — [@gustavoski23](https://github.com/gustavoski23): investigación de ACTA, revisión de usabilidad y pruebas automatizadas.
