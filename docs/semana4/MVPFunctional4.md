# MVP Funcional — Semana 4

**Proyecto:** Stellar-Verify · **Repositorio:** [Stellar-Verify](https://github.com/DanielaAnayaRojas/Stellar-Verify) · **Producto en línea:** [stellar-verify.vercel.app](https://stellar-verify.vercel.app/)

Stellar-Verify parte de un caso real. Luis se graduó en Venezuela, emigró a Colombia y no llegó a ejercer porque el trámite de convalidación de su título resultó largo y costoso. El producto permite que una institución registre una credencial al emitirla y que cualquier persona la consulte después, sin crear una cuenta.

En la semana 3 entregamos el front con datos ficticios y una simulación en el navegador. En esta semana conectamos el producto a **Testnet**, la red de pruebas de Stellar, que no usa dinero real. Las credenciales que se emiten y se revocan quedan registradas en esa red. No tienen valor legal.

Términos que usa este documento:
- **Huella:** código de 64 caracteres que el navegador calcula a partir de un archivo. Si el archivo cambia, la huella cambia.
- **ACTA:** plataforma de credenciales sobre Stellar que usamos en lugar de un contrato propio, según la decisión de la semana 3.
- **Wallet (Freighter):** aplicación donde la institución guarda su clave de Stellar y firma las operaciones.

---

## Evidencia verificable

| Elemento | Enlace |
| --- | --- |
| Producto en línea | [stellar-verify.vercel.app](https://stellar-verify.vercel.app/) |
| Video público | [PENDIENTE: pegar aquí el enlace del video] |
| Contratos propios | No hay. Usamos el contrato de ACTA, desplegado en Testnet. Las transacciones de la tabla registran su uso. |

El 18 de octubre de 2026 emitimos tres credenciales de demostración, con la firma de la institución activada. Cada una corresponde a un archivo de [`frontend/public/ejemplos/`](../../frontend/public/ejemplos/). En el producto, la institución aparece como «Institucion de prueba». Los enlaces de ejemplo de la semana 3 pertenecen a la versión simulada.

| # | Curso | Estado | Huella | Verificación | Transacciones (Stellar Expert) |
| :---: | --- | :---: | --- | --- | --- |
| 1 | Técnico en análisis de datos | Válida | `ba0f8b38…40a5f` | [Abrir](https://stellar-verify.vercel.app/verificar/ba0f8b380ea55ce5a8b53c1a66b38ec5d0fe468dc7a91a890c26d2fafaf40a5f) | [Emisión](https://stellar.expert/explorer/testnet/tx/ded02463e9e3bc96bcfc7ebddd8fbb8da927fe38cf8131d1d35106aabd25c193) |
| 2 | Introducción a la ciberseguridad | Válida | `9e8a0165…bab03` | [Abrir](https://stellar-verify.vercel.app/verificar/9e8a0165c6f069807e87d678b66ded6d8754677fa25b3a974b8da3933eebab03) | [Emisión](https://stellar.expert/explorer/testnet/tx/3dce878e9393e6d9eba02c752c347435567fc1b5a31ff7c0482f467f2536e2e1) |
| 3 | Atención al cliente digital | Revocada | `0e2edd67…f17a` | [Abrir](https://stellar-verify.vercel.app/verificar/0e2edd6751fb77d33784b198fc953fbe592fdeff3dbb1c0bcf152c5d9f39f17a) | [Emisión](https://stellar.expert/explorer/testnet/tx/2ab4cb1516b9a59f3206ef54e2ce7d78b494a284cfcf9f4d1b1a2a4467b427e4) · [Revocación](https://stellar.expert/explorer/testnet/tx/fc945660eb88435ff440e302e2e2f2c92dd2d423db6cbea035cfd814098aad96) |

Pasos para comprobarlo: abrir un enlace de «Verificación» y leer el estado; subir en la página de inicio el archivo de ejemplo de esa credencial y comparar la huella con la de la tabla; abrir la transacción en Stellar Expert, un explorador público de la red.

---

## Aprendizajes y ajustes priorizados

**Del proceso.** En la semana 3 construimos las pantallas sobre datos simulados y las conectamos a una sola capa de servicios. En esta semana se añadió a esa capa un proveedor que habla con ACTA. En la semana 3 también decidimos usar ACTA en lugar de un contrato propio. Al revisar su contrato el 6 de octubre, encontramos dos diferencias con el Blueprint: el contrato no guarda la dirección de quien emitió cada credencial, y la revocación la hace el dueño de la bóveda (el espacio donde ACTA guarda las credenciales de una institución), no el emisor.

**De Stellar.** La institución firma cada operación con su wallet Freighter. Nuestro servidor recibe la transacción ya firmada y la envía; no guarda ninguna clave de Stellar. Las transacciones son públicas y pueden consultarse en Stellar Expert. En una medición del 18 de octubre, una petición a ACTA tardó cerca de 8 segundos en responder.

**Ajustes realizados**
1. Emisión, verificación y revocación reales en Testnet, en lugar de la simulación. El panel exige entrar con Freighter.
2. Firma del emisor en cada credencial, que la verificación exige.
3. Espera de 5 segundos a ACTA, con un reintento; si la API no responde, la transacción firmada se envía directamente a la red.

**Pendiente:** una bóveda por institución, la comprobación de que la institución emisora es quien dice ser (historia 5 del Blueprint) y el ajuste de los textos de resultados con los comentarios de los usuarios.

---

## Riesgos y pendientes

**Riesgos identificados**
- **Servicio externo.** La emisión y la revocación pasan por la API de ACTA. Si no responde, se usa el envío directo a la red.
- **Red de pruebas.** Todo está en Testnet y las credenciales no tienen valor legal. No hemos determinado cuánto cuesta revocar en la red real ni quién lo pagaría; esa pregunta quedó abierta en la semana 3.
- **Contrato.** Nuestra revisión interna del 6 de octubre lo calificó como apto para Testnet. No tiene auditoría externa. Su función de verificación informa si una credencial está vigente o revocada; no comprueba que la institución exista.
- **Control de la bóveda.** Quien administra la bóveda puede revocar todas las credenciales que contiene. Una bóveda tiene un solo dueño, y la emisión está abierta a cualquier dirección que no esté en la lista de bloqueo.
- **Contenido guardado.** El contrato no permite borrar el contenido de una credencial revocada; solo la retira del índice.
- **Institución piloto.** El Problem Brief plantea como primer emisor a BAF/Ruta N, con constancias de BB101. Todavía no está confirmado.

**Pendientes antes del cierre**
- Publicar el video y completar su enlace.
- Integrar en la rama principal el código que conecta con ACTA, que hoy está en la rama `claude/stage3-code`.
- Actualizar el README, que todavía describe datos simulados.
- Iniciar la validación con usuarios.

---

## Plan de validación con usuarios

La validación se hará con el usuario del Problem Brief: el profesional migrante que necesita demostrar su título en otro país. También se hará con quienes le piden esa prueba (áreas de talento humano y entidades evaluadoras) y con una institución piloto. Los resultados responden a los tres supuestos del Problem Brief: que exista un emisor, que el verificador acepte este registro y que el titular no necesite una wallet.

El plan tiene tres actividades. Primero, entrevistas con cinco a ocho migrantes que hayan iniciado o abandonado una convalidación. Segundo, pruebas con el producto: cinco verificadores recibirán un enlace y un archivo y deberán indicar el estado de la credencial, mientras se registra qué hacen, cuánto tardan y qué interpretan mal; la institución piloto emitirá y revocará una credencial con Freighter. Tercero, métricas del piloto: credenciales emitidas, consultas públicas y tiempo hasta verificar.

| Hipótesis | Se cumple si… |
| --- | --- |
| Un verificador confirma una credencial sin ayuda ni cuenta. | Al menos 4 de 5 lo logran en menos de 2 minutos. |
| Entiende los tres resultados, incluido que «No encontrada» no significa «falsa». | Al menos 4 de 5 los interpretan bien. |
| Quien recibe la credencial no necesita wallet. | Ningún titular ni verificador la necesita. |
| El registro sirve como evidencia complementaria. | Al menos 3 de 5 verificadores lo consultarían antes de escribir a la institución. |
| Una institución puede emitir por sí sola. | Emite y revoca en menos de 10 minutos, incluida la instalación de la wallet. |

El Problem Brief fija un criterio de invalidación: si las entrevistas muestran que el problema es la lentitud de la evaluación académica y no la falta de un registro verificable, la hipótesis central no se sostiene.

---

## Criterios del track

El track Blockchain Builders 101 evalúa tres criterios, cada uno con 33,33 % del puntaje y una escala de 0 a 8.

**Validación del problema.** La evidencia es la experiencia de Luis y el dato de Migración Colombia: 2.841.389 migrantes venezolanos registrados en Colombia con corte a febrero de 2026. Está documentada en el [Problem Brief](../semana1/ProblemBrief.md). Aún no se han hecho entrevistas ni pruebas con personas ajenas al equipo; el plan está en la sección anterior.

**Foco de negocio.** El Blueprint identifica tres actores: el titular, que comparte su credencial; la institución, que la emite; y el verificador, que la consulta sin cuenta. El modelo del producto está en el [Lean Canvas](https://canva.link/d4avt08hmkknsqk). El costo de revocar en la red real no está determinado.

**Ejecución técnica.** El Blueprint define tres usos de Stellar: firma del emisor, estado en un registro público y pruebas en Testnet. Las tres credenciales de la tabla de evidencia tienen sus transacciones en la red. No hay contrato propio, según la opción B de la semana 3. La rama `claude/stage3-code` incluye pruebas automatizadas en `frontend/tests`. El contrato de ACTA no tiene auditoría externa y el código aún no está en la rama principal.
