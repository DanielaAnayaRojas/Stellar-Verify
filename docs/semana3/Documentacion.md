# Documentación grupal — Semana 3 (Functional Proof)

**Proyecto:** Stellar-Verify
**Repositorio:** [Stellar-Verify](https://github.com/DanielaAnayaRojas/Stellar-Verify)
**Front desplegado (Vercel):** [https://stellar-verify.vercel.app/](https://stellar-verify.vercel.app/)
**Cómo ejecutarlo en local:** ver el [README](../../README.md)

> **Cómo leer este documento.** Donde lo construido esta semana **no coincide** con lo que define el [Product Blueprint](../semana2/ProductBlueprint.md), lo marcamos con un bloque como este: **⚠️ Diferencia con el Blueprint**. Preferimos decirlo de forma explícita a dar la impresión de que el MVP ya está completo.

---

## 1. Front construido

El front está en la carpeta [`frontend/`](../../frontend/). Es una aplicación de una sola página hecha con React y Vite, con rutas (`react-router-dom`). Muestra el flujo principal del MVP: una institución registra una credencial, el titular la comparte con un enlace o un código QR, y un tercero la verifica sin crear una cuenta. Si hubo un error, la institución puede revocarla.

> **⚠️ Alcance real de esta entrega.** Todo el front funciona sobre datos ficticios y una capa de servicios simulada que vive en el navegador ([`frontend/src/services/`](../../frontend/src/services/)). **No hay conexión con ACTA, con Stellar ni con un backend.** Las emisiones y revocaciones nuevas se guardan en el `localStorage` del navegador que se use, así que no las ve nadie más ni otro dispositivo. Para que nadie lo confunda con un producto real, toda pantalla muestra arriba la franja «Datos de demostración: nada de esto es real».

### Pantallas implementadas

Son cuatro componentes de página y cinco rutas:

| Pantalla | Ruta | Quién la usa | Para qué sirve |
| --- | --- | --- | --- |
| Verificación pública (`Verificar.jsx`) | `/` | Verificador | Entrada del producto: verificar por archivo, huella o enlace |
| Resultado de verificación (`Verificar.jsx`) | `/verificar/:huella` | Verificador / titular | Muestra si la credencial es válida, revocada o no existe |
| Panel de la institución (`Panel.jsx`) | `/panel` | Institución | Lista de credenciales emitidas y acceso a «Nueva credencial» |
| Emisión en 5 pasos (`Emitir.jsx`) | `/panel/emitir` | Institución | Datos, evidencia, revisión, firma y resultado |
| Detalle y revocación (`Detalle.jsx`) | `/panel/credencial/:huella` | Institución | Ver una credencial, su enlace y QR, y revocarla |

La barra superior tiene dos entradas: «Verificar» y «Soy una institución» (el panel).

### Verificación pública

Es la pantalla pensada para quien necesita comprobar una credencial sin registrarse. Hay tres maneras de hacerlo:

- **Subir el documento.** El navegador calcula la huella SHA-256 del archivo en el propio dispositivo y la busca en el registro. El archivo no se envía a ningún lado.
- **Pegar la huella** de 64 caracteres.
- **Pegar el enlace** que dio la institución, que es el mismo que abre el código QR.

El resultado es uno de tres estados. Cada uno lleva un sello con ícono y texto, de modo que no depende solo del color:

- **Válida:** institución emisora, titular, logro, fecha de emisión y huella.
- **Revocada:** indica que la institución la anuló y en qué fecha.
- **No encontrada:** explica que no hay registro para ese documento, sin afirmar que sea falso.

Si el archivo no se puede leer, la huella está incompleta o el enlace no contiene una huella, se muestra un mensaje claro para corregirlo. Todos los textos están en [`frontend/src/content/textos.json`](../../frontend/src/content/textos.json).

### Panel de la institución

Lista cada credencial con titular, logro, fecha de emisión y estado (válida o revocada). Desde cada fila se abre el detalle o la página pública de verificación. El botón **Nueva credencial** inicia la emisión.

> **⚠️ Diferencia con el Blueprint.** El Blueprint habla de un «Panel institucional» de una organización concreta. Hoy el panel **no tiene inicio de sesión** (cualquiera que entre a `/panel` lo ve) y la lista de instituciones tiene una sola entrada ficticia («Instituto de Ejemplo»). Registrar o autenticar instituciones no está implementado.

### Emisión en cinco pasos

Es el flujo central. Cada paso muestra «Paso n de 5», y el foco se mueve al título para que sea usable con teclado y lector de pantalla.

1. **Datos:** institución, titular y logro, con validación de campos vacíos.
2. **Evidencia:** se elige el archivo que respalda la credencial. El front calcula su huella y avisa si ya existe una credencial para ese archivo.
3. **Revisión:** resumen de todo antes de emitir.
4. **Firma:** el emisor marca una casilla para autorizar la emisión.
5. **Resultado:** confirmación, huella y enlace copiables y código QR.

### Detalle y revocación

Muestra los datos completos, el enlace y el QR. **Revocar** pide una confirmación explícita («no se puede deshacer»). Después, la verificación de esa credencial pasa a mostrar «Revocada» (en el mismo navegador, por lo dicho arriba).

### Cómo se corresponde con el flujo del Blueprint

El flujo de usuario del Blueprint tiene 6 pasos. Esta tabla dice qué pasó con cada uno en el front:

| Paso del Blueprint | Qué se esperaba | Qué hay en el front | ¿Coincide? |
| :---: | --- | --- | :---: |
| 1 | La institución registra datos del emisor, del titular y del logro | Pantalla «Datos»: se elige una institución de una lista fija, y se escriben titular y logro | **Parcial** |
| 2 | Adjunta o referencia la evidencia; los documentos sensibles quedan fuera de la blockchain | Pantalla «Evidencia»: se elige un archivo, se calcula su huella y solo la huella se guarda | **Parcial** |
| 3 | Revisa el resumen antes de emitir | Pantalla «Revisión» | **Sí** |
| 4 | Autoriza con firma criptográfica (wallet o cuenta Stellar) | Pantalla «Firma» con una casilla; el propio texto aclara que la firma es simulada | **No** (simulado) |
| 5 | Verify envía la operación a ACTA (Soroban, Testnet) | No hay pantalla ni llamada real: es solo una espera simulada al «emitir» | **No** (simulado) |
| 6 | El titular comparte y un tercero consulta emisor, fecha, estado y prueba, sin cuenta | `/verificar/:huella`, enlace y QR: muestra emisor, fecha y estado | **Parcial** |
| Camino alterno | La institución cambia el estado o revoca la credencial | Pantalla de detalle con revocación | **Parcial** |

> **⚠️ Diferencia con el Blueprint — numeración de la emisión.** Los 5 pasos de la pantalla de emisión **no equivalen** a los pasos 1 a 5 del Blueprint. El paso 5 de la pantalla («Resultado», con enlace y QR) corresponde al paso 6 del Blueprint (compartir). El paso 5 del Blueprint (envío a ACTA) pertenece al backend y no tiene pantalla propia.

Los puntos concretos donde el front se aparta del Blueprint son estos:

> **⚠️ Paso 1 — emisor.** El Blueprint pide registrar los datos del emisor. El front solo permite elegir una institución ficticia ya cargada.

> **⚠️ Paso 2 — evidencia.** El Blueprint habla de adjuntar o *referenciar* evidencia. El front calcula la huella del archivo pero no lo almacena en ninguna parte. La referencia que se guarda (`ref-001`, `ref-002`…) es un código inventado por la simulación.

> **⚠️ Pasos 4 y 5 — firma y ACTA.** No hay wallet ni firma criptográfica, ni llamada a ACTA o a Stellar. Una credencial «emitida» existe solo en el `localStorage` del navegador.

> **⚠️ Paso 6 — «prueba» y alcance de la verificación.** El Blueprint dice que el verificador consulta emisor, fecha, estado **y prueba**. El front muestra la huella SHA-256 del documento, que sirve para buscar la credencial, pero **no** es una prueba anclada en Stellar. Además, una credencial emitida en la demo solo puede verificarse desde el mismo navegador; entre dispositivos solo funcionan las tres credenciales de ejemplo.

> **⚠️ Camino alterno.** El Blueprint contempla «cambiar el estado o revocar». El front solo permite revocar.

> **⚠️ Historia 5 del Blueprint («confirmar que la institución es quien dice ser», prioridad «Debería»).** No está implementada: el resultado muestra el nombre de la institución, pero no hay ningún mecanismo que la acredite.

Lo que sí coincide con el Blueprint: la creación manual desde el panel, la revisión previa, el principio de no subir documentos sensibles, la verificación pública sin cuenta, la revocación y el enlace con QR (historia 6, «Debería»).

### Datos de demostración y verificación

Hay tres archivos ficticios en [`frontend/public/ejemplos/`](../../frontend/public/ejemplos/) y tres credenciales en [`frontend/src/data/credenciales.json`](../../frontend/src/data/credenciales.json): dos válidas y una revocada. El script [`frontend/scripts/verificar-integridad.mjs`](../../frontend/scripts/verificar-integridad.mjs) comprueba que las huellas registradas coinciden con esos archivos y se ejecuta con `node scripts/verificar-integridad.mjs` desde `frontend/`.

### Cómo se pensó la interfaz

- **Capa de servicios separada.** Las pantallas llaman a funciones de `services/` (verificación, emisión, detalle, huella) y esas funciones leen la simulación. La idea es que al integrar ACTA el cambio se concentre ahí. **Es una intención, no una garantía:** algunas pantallas dependen de la forma actual de los datos (por ejemplo, la lista de instituciones se lee de forma síncrona en `Emitir.jsx`), así que la integración pedirá ajustes en la interfaz.
- **Lenguaje sin jerga blockchain.** La persona ve «huella», «emisión» y «revocación», no hashes, transacciones ni contratos.
- **Accesibilidad.** Etiquetas asociadas a cada campo, avisos con `aria-live` para cargas y errores, foco gestionado entre pasos y estados que no dependen solo del color. Gustavo hizo una revisión **estática** de usabilidad ([informe](./Informe_Gus_ACTA_Usabilidad.md)); la revisión visual en navegador y móvil sigue pendiente.

### Enlaces para recorrer el front desplegado

| Pantalla | Enlace |
| --- | --- |
| Verificación pública | [Inicio](https://stellar-verify.vercel.app/) |
| Credencial válida | [Ejemplo válido](https://stellar-verify.vercel.app/verificar/a068ed6242b38ebaeaaa9e539ec60a85ea9675691dbb844da55ab7064fd96dca) |
| Credencial revocada | [Ejemplo revocado](https://stellar-verify.vercel.app/verificar/05830aa4f35aa2a609eb771c558d7096b7e2ca7e1e7c551042a8f52f3b2b709e) |
| Credencial no encontrada | [Ejemplo no encontrado](https://stellar-verify.vercel.app/verificar/0000000000000000000000000000000000000000000000000000000000000000) |
| Panel de institución | [Panel](https://stellar-verify.vercel.app/panel) |
| Emisión (simulada) | [Emitir](https://stellar-verify.vercel.app/panel/emitir) |

---

## 2. Decisión técnica

**Opción elegida: B. Solución existente del ecosistema de Stellar.** Usaremos **ACTA**, una infraestructura de credenciales verificables sobre Stellar/Soroban, en **Testnet**, y **no** crearemos un contrato propio. Esta semana no se escribe ni se despliega ningún contrato; solo se deja decidida la ruta.

### Por qué

El Blueprint define que Stellar aporta una referencia pública y verificable del estado de una credencial: que existe, quién la emitió y si sigue vigente o fue revocada. Según la documentación de ACTA, la plataforma cubre emisión, verificación, revocación y control de emisores autorizados. Es justo lo que necesita el MVP, así que un contrato propio duplicaría trabajo ya resuelto.

Otras razones:

1. **Foco en lo que valida la hipótesis.** Lo que queremos comprobar es el ciclo emitir, autorizar, verificar y revocar con usuarios reales, no la ingeniería de un contrato.
2. **Riesgo y tiempo.** Un contrato propio exige diseño, pruebas y revisión de seguridad, y un error ahí golpea la promesa de confianza del producto.
3. **Coherencia con la arquitectura.** El Blueprint ya prevé un adaptador de ACTA en el backend y la firma del emisor con su cuenta Stellar.

### Lo que sabemos y lo que falta confirmar

Según el [informe de Gustavo](./Informe_Gus_ACTA_Usabilidad.md), la documentación de ACTA ([docs.acta.build](https://docs.acta.build/introduction)) describe emisión, verificación, revocación y autorizaciones por vault, y su sitio ([acta.build](https://acta.build/)) anuncia 1 USDC por credencial emitida. La revocación implica además tarifas de red en XLM. **Todavía no hemos verificado:**

- si ACTA cobra algo adicional por revocar y quién lo paga en el flujo de API elegido;
- si la organización podrá revocar exactamente como lo pide el producto;
- qué vía de integración usaremos (API o SDK) y cuál es su detalle técnico.

Estos puntos se validarán con la documentación técnica y, si hace falta, con el equipo de ACTA antes de implementar la integración.

### Qué descartamos

- **Contrato propio en Soroban (opción A).** Se descarta por ahora. Se reconsideraría solo si ACTA no cubre una regla indispensable, por ejemplo la revocación como la necesita el producto.
- **Una base de datos privada como único registro.** Obliga al verificador a confiar en quien la opera, lo que contradice el criterio de pertinencia del Problem Brief.
- **Publicar documentos o datos personales en la red.** Se descarta. Esos datos quedan fuera de la cadena; en la red solo se ancla lo necesario para verificar.

---

## 3. Participación del equipo

| Integrante | Usuario de GitHub | Aporte en este entregable |
| --- | --- | --- |
| Luis Sánchez | [@Lems91](https://github.com/Lems91) | Producto y desarrollo del front (verificación, panel, emisión, detalle y revocación), despliegue en Vercel y limpieza del repositorio (`.gitignore`, archivos sobrantes). |
| Daniela Anaya Rojas | [@DanielaAnayaRojas](https://github.com/DanielaAnayaRojas) | Datos de demostración (credenciales de ejemplo) y esta documentación grupal. |
| Gustavo González | [@gustavoski23](https://github.com/gustavoski23) | Investigación de ACTA, revisión de usabilidad, script de verificación de integridad de los datos de demo y README del repositorio. |

---

## 4. Bloqueos y siguiente paso

### Pendiente

- El front no está conectado a ACTA ni a Stellar: emisión, verificación y revocación son simuladas (ver las diferencias con el Blueprint en la sección 1).
- No hay backend, por lo que las credenciales nuevas no se comparten entre dispositivos.
- La firma del emisor es una casilla, no una firma de wallet Stellar.
- El panel no tiene autenticación.
- Faltan las capturas de pantalla en este documento; mientras tanto, el enlace al front desplegado permite recorrerlo.
- Sin ejecutar todavía: `npm run build` completo del repositorio y la revisión visual del despliegue (navegador y móvil).
- Pendiente de decidir en equipo: si «anular una credencial» sigue como historia imprescindible, tal como quedó «por confirmar» en el Blueprint.

### Bloqueos

- Los puntos de ACTA sin verificar (costos de revocación, quién paga y alcance de la autorización de revocar), que condicionan el diseño del backend.

### Siguiente paso hacia el MVP

1. Resolver con ACTA los puntos sin verificar y definir la vía de integración (API o SDK) en Testnet.
2. Crear un backend mínimo de Verify que guarde las claves de ACTA y encapsule las llamadas; el navegador nunca debe manejarlas.
3. Reemplazar la capa de servicios simulada por llamadas a ese backend y ajustar las pantallas que dependen de la forma actual de los datos.
4. Integrar la firma real del emisor con una wallet Stellar en el paso «Firma».
5. Probar el ciclo completo (emitir, verificar, revocar) en Testnet con el caso de Luis, el profesional que emigra, como escenario de aceptación.
