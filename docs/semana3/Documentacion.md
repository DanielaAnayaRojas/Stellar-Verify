# Documentación grupal — Semana 3 (Functional Proof)

**Proyecto:** Stellar-Verify · **Repositorio:** [Stellar-Verify](https://github.com/DanielaAnayaRojas/Stellar-Verify) · **Front desplegado:** [stellar-verify.vercel.app](https://stellar-verify.vercel.app/) · **Ejecución local:** ver el [README](../../README.md)

---

## 1. Front construido

El front de Stellar-Verify permite que una institución registre una credencial (un diploma o certificado), que su titular la comparta con un enlace o un código QR y que cualquier persona la verifique sin crear cuenta. Si la institución se equivocó, puede revocarla. Está en [`frontend/`](../../frontend/), hecho con React y Vite. Cada pantalla tiene su propia dirección, así que el enlace o el QR de una credencial abre directamente su verificación.

Dos términos que se repiten:
- **Huella:** código único de 64 caracteres que el navegador calcula a partir de un archivo. Si el archivo cambia, la huella cambia. Sirve para identificar la credencial sin guardar el documento.
- **Credencial:** registro de un diploma o certificado con su institución, titular, logro, fecha y estado (válida o revocada).

> **⚠️ Alcance real.** Todo funciona con datos ficticios y una simulación que corre en el navegador ([`frontend/src/services/`](../../frontend/src/services/)). **Todavía no hay conexión con ACTA, con Stellar ni con un servidor propio.** Lo que se emite o se revoca queda solo en el navegador donde se hizo. Cada pantalla muestra el aviso «Datos de demostración: nada de esto es real».

### Pantallas

| Pantalla | Dirección | Usuario | Función |
| --- | --- | --- | --- |
| Verificación pública | `/` | Verificador | Verificar con archivo, huella o enlace |
| Resultado | `/verificar/:huella` | Verificador o titular | Muestra si es válida, revocada o no existe |
| Panel | `/panel` | Institución | Lista de credenciales y botón «Nueva credencial» |
| Emisión en 5 pasos | `/panel/emitir` | Institución | Datos, evidencia, revisión, firma y resultado |
| Detalle y revocación | `/panel/credencial/:huella` | Institución | Ver enlace y QR, y revocar |

Las dos primeras filas usan el mismo componente (`Verificar.jsx`). La barra superior ofrece «Verificar» y «Soy una institución».

**Verificación pública.** Se puede subir el documento (la huella se calcula en el dispositivo y el archivo no se envía), pegar la huella o pegar el enlace de la institución. El resultado lleva un sello con ícono y texto, para que no dependa solo del color:
- **Válida:** muestra institución, titular, logro, fecha y huella.
- **Revocada:** indica que fue anulada y en qué fecha.
- **No encontrada:** explica que no hay registro, sin decir que el documento sea falso.

Si el archivo no se puede leer, la huella está incompleta o el enlace no trae huella, aparece un mensaje que explica cómo corregirlo. Los textos están en [`textos.json`](../../frontend/src/content/textos.json).

**Panel.** Lista cada credencial con titular, logro, fecha y estado, y da acceso al detalle y a la página pública.

**Emisión.** Cada paso indica «Paso n de 5» y lleva el cursor al título (útil con teclado o lector de pantalla):
1. **Datos:** institución, titular y logro; no deja avanzar si falta alguno.
2. **Evidencia:** se elige el archivo, se calcula su huella y se avisa si ya existe una credencial para ese archivo.
3. **Revisión:** resumen antes de emitir.
4. **Firma:** el emisor marca una casilla para autorizar.
5. **Resultado:** confirmación, huella, enlace para copiar y QR.

**Detalle y revocación.** Muestra los datos, el enlace y el QR. Para revocar hay que confirmar de forma explícita, y desde ese momento la verificación muestra «Revocada».

### Cómo se conecta con el flujo del Blueprint

| Paso del Blueprint | Qué hay en el front | ¿Coincide? | ⚠️ Diferencia |
| :---: | --- | :---: | --- |
| 1. Registrar emisor, titular y logro | Pantalla «Datos» | Parcial | El emisor se elige de una lista con una sola institución ficticia («Instituto de Ejemplo»); no se pueden registrar instituciones |
| 2. Adjuntar o referenciar evidencia, sin subir documentos sensibles | Pantalla «Evidencia» | Parcial | Solo se calcula y guarda la huella; la referencia (`ref-001`…) la inventa la simulación |
| 3. Revisar resumen | Pantalla «Revisión» | **Sí** | — |
| 4. Firma criptográfica (wallet Stellar) | Pantalla «Firma» | No | Es una casilla, y el texto aclara que está simulada |
| 5. Envío a ACTA (Testnet) | Espera simulada | No | No hay conexión real; este paso no tiene pantalla propia |
| 6. El titular comparte y un tercero consulta emisor, fecha, estado y prueba | Enlace, QR y `/verificar/:huella` | Parcial | Se muestra la huella, que localiza la credencial pero **no** es una prueba registrada en Stellar |
| Camino alterno: cambiar estado o revocar | Detalle con revocación | Parcial | Solo se puede revocar |

**Otras diferencias:**
- Los 5 pasos de la pantalla de emisión **no equivalen** a los pasos 1–5 del Blueprint: su paso 5 («Resultado») corresponde al paso 6 del Blueprint.
- El panel **no pide iniciar sesión**.
- Una credencial emitida en la demo solo se puede verificar desde el mismo navegador; entre dispositivos funcionan únicamente las tres de ejemplo.
- La historia 5 del Blueprint (confirmar que la institución es quien dice ser, prioridad «Debería») no está implementada.

**Sí coincide** con el Blueprint: la creación manual desde el panel, la revisión previa, no subir documentos sensibles, la verificación pública sin cuenta, la revocación y el enlace con QR (historia 6).

### Datos de demostración

Hay tres archivos ficticios en [`frontend/public/ejemplos/`](../../frontend/public/ejemplos/) y tres credenciales en [`credenciales.json`](../../frontend/src/data/credenciales.json): dos válidas y una revocada. El script [`verificar-integridad.mjs`](../../frontend/scripts/verificar-integridad.mjs) comprueba que las huellas coincidan con los archivos (`node scripts/verificar-integridad.mjs`, desde `frontend/`).

### Decisiones de diseño

- **Simulación separada de las pantallas.** Las pantallas piden los datos a `services/`, así que cuando conectemos ACTA el cambio se concentra ahí. Aun así, algunas pantallas dependen de cómo están organizados hoy los datos (por ejemplo, la lista de instituciones en `Emitir.jsx`) y habrá que ajustarlas.
- **Lenguaje más claro para el usuario.** Usamos «huella», «emisión» y «revocación» en lugar de términos técnicos como hash o contrato.
- **Accesibilidad.** Campos con etiqueta, avisos que leen los lectores de pantalla, cursor guiado entre pasos y estados que no dependen del color. Revisamos el código con este criterio ([informe](./Informe_Gus_ACTA_Usabilidad.md)).

### Front desplegado

[Inicio](https://stellar-verify.vercel.app/) · [Credencial válida](https://stellar-verify.vercel.app/verificar/a068ed6242b38ebaeaaa9e539ec60a85ea9675691dbb844da55ab7064fd96dca) · [Revocada](https://stellar-verify.vercel.app/verificar/05830aa4f35aa2a609eb771c558d7096b7e2ca7e1e7c551042a8f52f3b2b709e) · [No encontrada](https://stellar-verify.vercel.app/verificar/0000000000000000000000000000000000000000000000000000000000000000) · [Panel](https://stellar-verify.vercel.app/panel) · [Emisión simulada](https://stellar-verify.vercel.app/panel/emitir)

---

## 2. Decisión técnica

**Opción elegida: B, usar una solución existente del ecosistema.** Vamos a usar **ACTA**, una plataforma de credenciales verificables que funciona sobre Stellar con contratos Soroban, en **Testnet**. **No vamos a crear un contrato propio**, y en esta entrega tampoco escribimos ni desplegamos ninguno.

### Para qué la necesitamos

En el Blueprint (sección 8, «Uso de Stellar») planteamos usar Stellar para tres cosas: autorizar con la firma del emisor, dejar el estado de la credencial en una referencia pública que cualquiera pueda comprobar, y probar todo en Testnet sin dinero real. También escribimos que Soroban se usaría **a través de ACTA**, y esta decisión mantiene ese planteamiento. Con ACTA queremos emitir, consultar y revocar credenciales, y registrar qué instituciones están autorizadas para emitir.

### Por qué no un contrato propio

Según su documentación, ACTA ya cubre esas cuatro funciones, que son todo lo que necesita nuestro MVP. Las razones para no escribir un contrato son estas:
1. **Nuestro producto no necesita reglas especiales en la red.** Solo registra, consulta y revoca credenciales, y eso es lo que ACTA ya hace. Un contrato propio sería rehacer algo que existe.
2. **Un error en un contrato afecta a personas reales.** Aquí se guarda la prueba de un título; si el contrato falla, alguien podría quedar sin poder demostrar su formación. Un contrato propio exigiría diseño, pruebas y revisión de seguridad que no podemos asumir como equipo de tres.
3. **Es lo que ya planteamos en la arquitectura del Blueprint:** un servidor propio que se comunica con ACTA y una firma del emisor con su cuenta Stellar.

### Qué descartamos

- **Contrato propio (opción A).** Solo lo reconsideraríamos si ACTA no cubre una regla indispensable, como la revocación que necesita el producto.
- **Una base de datos privada como único registro.** Obligaría al verificador a confiar en quien la administra, y el Blueprint plantea una referencia pública que cualquiera pueda comprobar.
- **Publicar documentos o datos personales en la red.** Se quedan fuera de la cadena; solo va lo necesario para verificar.

---

## 3. Participación del equipo

| Integrante | GitHub | Aporte en este entregable |
| --- | --- | --- |
| Luis Sánchez | [@Lems91](https://github.com/Lems91) | Producto y desarrollo del front (verificación, panel, emisión, detalle y revocación), despliegue en Vercel y limpieza del repositorio |
| Daniela Anaya Rojas | [@DanielaAnayaRojas](https://github.com/DanielaAnayaRojas) | Datos de demostración (credenciales de ejemplo) y documentación grupal |
| Gustavo González | [@gustavoski23](https://github.com/gustavoski23) | Investigación de ACTA, revisión de usabilidad, script de verificación de los datos de demo y README |

---

## 4. Bloqueos y siguiente paso

### Qué quedó pendiente
- **Conectar con ACTA y Stellar.** Hoy emitir, verificar y revocar son simulados.
- **Tener un servidor propio.** Sin él, las credenciales nuevas solo se ven en el navegador donde se crearon.
- **Firma real y acceso al panel.** La firma es una casilla (no una wallet Stellar) y el panel no pide iniciar sesión.

### Bloqueo
Todavía no sabemos cuánto cuesta revocar una credencial en ACTA, quién lo paga, ni si podremos revocar como lo necesita el producto. Hasta resolverlo no podemos definir cómo será el servidor.

### Siguiente paso hacia el MVP
1. Resolver esas dudas con ACTA y decidir cómo nos conectaremos a ella (API o SDK), en Testnet.
2. Crear un servidor sencillo que hable con ACTA y guarde sus claves, para que el navegador nunca las maneje.
3. Cambiar la simulación del front por llamadas a ese servidor.
4. Agregar la firma real del emisor con una wallet Stellar en el paso «Firma».
5. Probar el recorrido completo (emitir, verificar y revocar) con el caso del Problem Brief: el profesional que emigra y debe demostrar su título.
