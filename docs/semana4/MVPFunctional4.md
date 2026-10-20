# MVP Funcional — Semana 4

**Proyecto:** Stellar-Verify · **Repositorio:** [Stellar-Verify](https://github.com/DanielaAnayaRojas/Stellar-Verify) · **Producto en línea:** [stellar-verify.vercel.app](https://stellar-verify.vercel.app/)

## Qué es y qué logramos esta semana

Stellar-Verify parte de un caso real. Luis, integrante de este proyecto, se graduó en Venezuela, emigró a Colombia y no llegó a ejercer porque el trámite de convalidación de su título resultó largo y costoso. Por eso construimos una solución en la que una institución registra una credencial educativa al emitirla y cualquier persona (un empleador, una entidad evaluadora) puede consultarla después, sin crear una cuenta, para saber si existe, sigue vigente o fue revocada.

En la semana 3 entregamos las pantallas con datos ficticios y una simulación en el navegador, y decidimos apoyarnos en **ACTA**, una plataforma de credenciales sobre Stellar, en lugar de escribir un contrato propio. Esta semana conectamos el producto a **Testnet**, la red de pruebas de Stellar, que no usa dinero real. Emitir, verificar y revocar ahora quedan registrados en esa red. Las credenciales no tienen valor legal.

Así funciona hoy. La institución entra al panel con **Freighter**, la wallet donde guarda su clave de Stellar y firma las operaciones. Al emitir, el navegador calcula la **huella** del documento: un código de 64 caracteres que cambia si el archivo cambia. El archivo no sale del dispositivo y solo se registran la huella, el curso y la fecha. Quien verifica sube el documento o pega la huella, y recibe uno de cinco estados: Válida, Revocada, No encontrada, Emisor no reconocido o Sin comprobar.

---

## Evidencia verificable

| Elemento | Enlace |
| --- | --- |
| Producto en línea | [stellar-verify.vercel.app](https://stellar-verify.vercel.app/) |
| Video público | [PENDIENTE: pegar aquí el enlace del video] |
| Contratos propios | No hay. Usamos el contrato de ACTA en Testnet; las transacciones de la tabla registran su uso. |

Emitimos cuatro credenciales de demostración el 18 y el 19 de octubre de 2026, con la firma de la institución activada. Cada una corresponde a un archivo de [`frontend/public/ejemplos/`](../../frontend/public/ejemplos/). La institución, «Institucion de prueba», es de demostración, no una externa. La credencial 2 se emitió con un error de captura: en el campo «Curso» se escribió la dirección del sitio. Como una credencial emitida no se edita, la revocamos y emitimos la 4 con el mismo documento y el curso correcto. La 2 queda en el registro como ejemplo de una revocación real. Los enlaces de ejemplo de la semana 3 pertenecen a la versión simulada.

| # | Curso | Estado | Huella | Verificación | Transacciones (Stellar Expert) |
| :---: | --- | :---: | --- | --- | --- |
| 1 | Técnico en análisis de datos | Válida | `ba0f8b38…40a5f` | [Abrir](https://stellar-verify.vercel.app/verificar/ba0f8b380ea55ce5a8b53c1a66b38ec5d0fe468dc7a91a890c26d2fafaf40a5f) | [Emisión](https://stellar.expert/explorer/testnet/tx/ded02463e9e3bc96bcfc7ebddd8fbb8da927fe38cf8131d1d35106aabd25c193) |
| 2 | Registrado con error de captura (dirección web en lugar del curso) | Revocada | `9e8a0165…bab03` | [Abrir](https://stellar-verify.vercel.app/verificar/9e8a0165c6f069807e87d678b66ded6d8754677fa25b3a974b8da3933eebab03) | [Emisión](https://stellar.expert/explorer/testnet/tx/3dce878e9393e6d9eba02c752c347435567fc1b5a31ff7c0482f467f2536e2e1) · [Revocación](https://stellar.expert/explorer/testnet/tx/ad6c6b2548f0e4f7a0adfcccb2f0092c45cfae3dbe7d3cebcffe9f0a2b5eb194) |
| 3 | Atención al cliente digital | Revocada | `0e2edd67…f17a` | [Abrir](https://stellar-verify.vercel.app/verificar/0e2edd6751fb77d33784b198fc953fbe592fdeff3dbb1c0bcf152c5d9f39f17a) | [Emisión](https://stellar.expert/explorer/testnet/tx/2ab4cb1516b9a59f3206ef54e2ce7d78b494a284cfcf9f4d1b1a2a4467b427e4) · [Revocación](https://stellar.expert/explorer/testnet/tx/fc945660eb88435ff440e302e2e2f2c92dd2d423db6cbea035cfd814098aad96) |
| 4 | Introducción a la ciberseguridad | Válida | `b07e89fc…d55d` | [Abrir](https://stellar-verify.vercel.app/verificar/b07e89fc32382013cc093a448105d00b8e9afce14759b10fd192cd1275e6d55d) | [Emisión](https://stellar.expert/explorer/testnet/tx/61b6e8873616b8836811f5fc28c144e5ea3898b2a75b4b6b9ea8a4e42b823c88) |

Todas las operaciones de la bóveda de la institución se ven juntas en el [contrato de la bóveda](https://stellar.expert/explorer/testnet/contract/CABXSPQQ32TS74EM52DGAQLXCWZWYPRECUJ5C2BN3G6GWTH4PU3TPI7W). El detalle de fechas y huellas completas está en [Evidencia_credenciales.md](Evidencia_credenciales.md).

Todas las operaciones de la bóveda de la institución se ven juntas en el [contrato de la bóveda](https://stellar.expert/explorer/testnet/contract/CABXSPQQ32TS74EM52DGAQLXCWZWYPRECUJ5C2BN3G6GWTH4PU3TPI7W). Las fechas y las huellas completas están en [Evidencia_credenciales.md](Evidencia_credenciales.md).

Para comprobarlo: abrir un enlace de «Verificación» y leer el estado; subir en la página de inicio el archivo de ejemplo y comparar su huella con la de la tabla; abrir la transacción en Stellar Expert, un explorador público de la red.

---

## Aprendizajes y ajustes priorizados

Lo que más nos enseñó esta semana fue cómo cambia el diseño cuando el registro es público y no se puede editar. En la credencial 2 escribimos la dirección del sitio en el campo «Curso» y no hubo forma de corregirla: la revocamos y emitimos la 4. Por eso el formulario ahora avisa si el curso parece una dirección web.

También vimos qué aporta Stellar y qué no. Aporta que la institución firme con su wallet Freighter, que nuestro servidor reenvíe la transacción sin guardar ninguna clave y que cualquiera verifique cada operación en Stellar Expert. No aporta identidad: el contrato de ACTA no guarda quién emitió cada credencial, y revoca el dueño de la bóveda (el espacio donde ACTA guarda las credenciales de una institución), no el emisor. Para cubrirlo, la institución firma al emitir un mensaje sin costo que prueba que la credencial es suya, y la verificación pública rechaza otros emisores con «Emisor no reconocido». Que la institución exista de verdad sigue sin comprobarse.

Además, el servicio intermedio pesó más que la red. Una petición a ACTA tardó cerca de 8 segundos y ACTA limita las consultas por llave. Esperamos 5 segundos con un reintento, enviamos la transacción firmada directo a la red si la API no responde, y tras un límite dejamos de consultar a ACTA 20 segundos.

**Hecho, por impacto:** operaciones reales en Testnet con Freighter; firma del emisor; manejo de las esperas; aviso del curso (poco esfuerzo, evita errores sin remedio); lista de credenciales en el panel.

**Pendiente:** la bóveda por institución, que condiciona la prueba con un piloto; comprobar quién es la institución emisora (historia 5 del Blueprint); y ajustar los textos con comentarios de usuarios, que aún no recogemos.

---

## Riesgos y pendientes

**Riesgos que dependen de terceros**
- **ACTA.** La emisión y la revocación pasan por su API. Si no responde, enviamos la transacción firmada directo a la red. La verificación pública usa una sola llave de ACTA, sujeta a su límite de consultas.
- **Contrato de ACTA.** Nuestra revisión interna del 6 de octubre lo calificó como apto para Testnet. No tiene auditoría externa. Su función de verificación informa si una credencial está vigente o revocada; no comprueba que la institución exista.

**Riesgos de diseño**
- **Control de la bóveda.** Quien la administra puede revocar todas sus credenciales, y la bóveda tiene un solo dueño. La emisión está abierta a cualquier dirección que no esté en la lista de bloqueo; nuestra verificación lo compensa al rechazar emisores distintos de la institución.
- **Contenido guardado.** El contrato no permite borrar el contenido de una credencial revocada; solo la retira del índice.

**Riesgos del alcance**
- **Red de pruebas.** Todo está en Testnet y no tiene valor legal. No hemos determinado cuánto cuesta revocar en la red real ni quién lo pagaría; la pregunta quedó abierta en la semana 3.
- **Institución piloto.** El Problem Brief plantea como primer emisor a BAF/Ruta N, con constancias de BB101. Todavía no está confirmado.

**Pendientes antes del cierre:** publicar el video y completar su enlace; iniciar la validación con usuarios.

---

## Plan de validación con usuarios

La validación se hará con el usuario del Problem Brief: el profesional migrante que necesita demostrar su título en otro país. También se hará con quienes le piden esa prueba (áreas de talento humano y entidades evaluadoras) y con una institución piloto. Los resultados responden a los tres supuestos del Problem Brief: que exista un emisor, que el verificador acepte este registro y que el titular no necesite una wallet.

El plan tiene tres actividades. Primero, entrevistas con cinco a ocho migrantes que hayan iniciado o abandonado una convalidación. Segundo, pruebas con el producto: cinco verificadores recibirán un enlace y un archivo y deberán indicar el estado de la credencial, mientras se registra qué hacen, cuánto tardan y qué interpretan mal; la institución piloto emitirá y revocará una credencial con Freighter. Tercero, métricas del piloto: credenciales emitidas, consultas públicas y tiempo hasta verificar.

| Hipótesis | Se cumple si… |
| --- | --- |
| Un verificador confirma una credencial sin ayuda ni cuenta. | Al menos 4 de 5 lo logran en menos de 2 minutos. |
| Entiende el resultado que ve, incluido que «No encontrada» no significa «falsa». | Al menos 4 de 5 los interpretan bien. |
| Quien recibe la credencial no necesita wallet. | Ningún titular ni verificador la necesita. |
| El registro sirve como evidencia complementaria. | Al menos 3 de 5 verificadores lo consultarían antes de escribir a la institución. |
| Una institución puede emitir por sí sola. | Emite y revoca en menos de 10 minutos, incluida la instalación de la wallet. Requiere resolver antes la bóveda por institución. |

Con cinco verificadores, estos umbrales son señales de aprendizaje, no una prueba estadística. El Problem Brief fija un criterio de invalidación: si las entrevistas muestran que el problema es la lentitud de la evaluación académica y no la falta de un registro verificable, la hipótesis central no se sostiene.

---

## Criterios del track

El track Blockchain Builders 101 evalúa tres criterios, cada uno con 33,33 % del puntaje y una escala de 0 a 8.

**Validación del problema.** La evidencia es la experiencia de Luis y el dato de Migración Colombia: 2.841.389 migrantes venezolanos registrados en Colombia con corte a febrero de 2026, documentado en el [Problem Brief](../semana1/ProblemBrief.md). Aún no hay entrevistas ni pruebas con personas ajenas al equipo.

**Foco de negocio.** El Blueprint identifica tres actores: el titular, que comparte su credencial; la institución, que la emite; y el verificador, que la consulta sin cuenta. El modelo está en el [Lean Canvas](https://canva.link/d4avt08hmkknsqk).

**Ejecución técnica.** El Blueprint define tres usos de Stellar: firma del emisor, estado en un registro público y pruebas en Testnet. Las cuatro credenciales de la tabla tienen sus transacciones en la red. No hay contrato propio, según la opción B de la semana 3, y el código que conecta con ACTA está en la rama principal, con pruebas automatizadas en `frontend/tests`.
