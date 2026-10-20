# Stellar-Verify

**Stellar-Verify** es un prototipo web para que una institución emita credenciales digitales y cualquier persona pueda consultar su estado mediante un documento, una huella, un enlace o un código QR.

**Demo pública:** https://stellar-verify.vercel.app/

> **Importante:** funciona sobre la **red de pruebas (testnet) de Stellar**. Las credenciales **no tienen valor legal** y todos los documentos de ejemplo son ficticios.

## Qué hace

- **Verificación pública (sin cuenta).** Se sube el documento o se pega su huella. El archivo **no sale del dispositivo**: la huella (SHA-256) se calcula en el navegador. El resultado es uno de cinco estados:

| Estado | Qué significa |
| --- | --- |
| **Válida** | La institución emitió la credencial y sigue vigente. |
| **Revocada** | La institución la anuló. |
| **No encontrada** | No hay registro de ese documento. |
| **Emisor no reconocido** | Existe un registro con esa huella, pero no lo emitió la institución. Nunca se muestran sus datos. |
| **Sin comprobar** | El servicio externo no respondió a tiempo. Se puede intentar de nuevo. |

- **Panel de la institución.** Se entra con la billetera [Freighter](https://www.freighter.app/) (en Testnet). Permite emitir credenciales, ver la lista de las registradas y revocarlas. La sesión dura 30 minutos.
  - **Emitir** pide dos firmas en Freighter: un mensaje que prueba que la emite la institución (no cuesta nada) y la transacción en la red de pruebas.
  - **Revocar** pide una firma. Solo puede revocar quien es dueño de la bóveda de la institución.
- **Qué se registra.** Solo la huella del documento, el nombre del curso y la fecha de emisión. No se guardan datos personales ni el archivo.

## Cómo está construido

- **Frontend:** React y Vite (`frontend/`).
- **API:** funciones serverless en Vercel (`frontend/api/`). Las claves viven solo en el servidor; ninguna variable lleva el prefijo `VITE_`, así que nunca llegan al navegador.
- **Registro de credenciales:** API de ACTA en su entorno de pruebas (sandbox) y red de pruebas de Stellar. La verificación pública también comprueba que el emisor sea la institución configurada.

## Requisitos

- Node.js 20 o superior (recomendado).
- npm, incluido con Node.js.
- Un navegador web moderno.
- Para usar el panel: la extensión Freighter configurada en **Testnet**.

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


Los archivos están en [`frontend/public/ejemplos/`](frontend/public/ejemplos/). Se pueden cargar en la pantalla de verificación o abrir con estos enlaces:

| Ejemplo | Estado | Enlace |
| --- | --- | --- |
| `diploma-demo-1.txt` | Válida | [Ver](https://stellar-verify.vercel.app/verificar/ba0f8b380ea55ce5a8b53c1a66b38ec5d0fe468dc7a91a890c26d2fafaf40a5f) |
| `certificado-demo-4.txt` | Válida | [Ver](https://stellar-verify.vercel.app/verificar/b07e89fc32382013cc093a448105d00b8e9afce14759b10fd192cd1275e6d55d) |
| `constancia-demo-3.txt` | Revocada | [Ver](https://stellar-verify.vercel.app/verificar/0e2edd6751fb77d33784b198fc953fbe592fdeff3dbb1c0bcf152c5d9f39f17a) |
| Huella inexistente | No encontrada | [Ver](https://stellar-verify.vercel.app/verificar/0000000000000000000000000000000000000000000000000000000000000000) |

`certificado-demo-2.txt` quedó revocada y fue reemplazada por `certificado-demo-4.txt` (se había emitido con un error en el curso). Las transacciones de cada credencial en el explorador están en [`docs/semana4/Evidencia_credenciales.md`](docs/semana4/Evidencia_credenciales.md).

## Limitaciones conocidas

- Funciona solo en testnet y con una institución de prueba configurada.
- El entorno de pruebas de ACTA a veces tarda en responder. Si pasa, la verificación muestra **Sin comprobar** y se puede reintentar; al emitir o revocar, el servidor comprueba si la operación ya se aplicó antes de reportar un fallo.
- Las credenciales de prueba no tienen valor legal.


## Equipo

- **Luis Sánchez** — [@Lems91](https://github.com/Lems91): producto, frontend y despliegue.
- **Daniela Anaya Rojas** — [@DanielaAnayaRojas](https://github.com/DanielaAnayaRojas): datos de demostración y colaboración documental.
- **Gustavo González** — [@gustavoski23](https://github.com/gustavoski23): investigación de ACTA, revisión de usabilidad y pruebas automatizadas.
