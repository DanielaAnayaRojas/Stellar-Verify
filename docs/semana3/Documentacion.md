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

### Cómo se conecta con el MVP del Blueprint

El Blueprint planteó un MVP con cinco funciones y un flujo de seis pasos. A continuación se indica cómo quedó cada una en el front y qué parte funciona de verdad y cuál es una simulación.

**Las cinco funciones del MVP**

| Lo planteado en el Blueprint | Dónde está en el front | Estado actual |
| --- | --- | --- |
| Que la institución cree una credencial a mano desde su panel | `/panel` y `/panel/emitir` | Completa. El botón «Nueva credencial» abre el asistente de emisión. |
| Registrar emisor, titular, logro y referencia de evidencia | Pasos «Datos» y «Evidencia» | Presente, con dos limitaciones. Solo existe una institución de ejemplo («Instituto de Ejemplo») y la referencia de evidencia (`ref-001`…) la genera la simulación, no la institución. |
| Mantener los documentos sensibles fuera de la blockchain, usando huellas | Paso «Evidencia» | Completa. El navegador calcula la huella y el archivo no sale del dispositivo. |
| Conectar con ACTA y Stellar (Testnet) para emitir y comprobar | Paso «Firma» y la espera posterior | Pendiente. La firma es una casilla y no existe conexión con ACTA ni con Stellar. |
| Que cualquiera verifique sin cuenta y que la institución pueda revocar | `/`, `/verificar/:huella` y `/panel/credencial/:huella` | Operativa en pantalla. La huella permite localizar la credencial, pero aún no es una prueba registrada en Stellar. Del camino alterno («cambiar estado o revocar») solo se implementó la revocación. |

**Del flujo de seis pasos a las pantallas**

La emisión consta de cinco pantallas y el Blueprint de seis pasos, por lo que la numeración no coincide:

| Paso del Blueprint | Pantalla | Cómo quedó en el front |
| --- | --- | --- |
| 1. Registrar emisor, titular y logro | «Datos» | Según lo planteado. |
| 2. Adjuntar o referenciar evidencia | «Evidencia» | Según lo planteado. |
| 3. Revisar el resumen | «Revisión» | Según lo planteado. |
| 4. Firmar con una wallet Stellar | «Firma» | La pantalla existe, pero la firma es una casilla simulada. |
| 5. Enviar a ACTA | Ninguna | Se representa con una espera simulada, sin pantalla propia. |
| 6. El titular comparte y un tercero consulta | «Resultado» y `/verificar/:huella` | La pantalla «Resultado» (enlace y QR) corresponde a este paso, no al 5. |

**Otras diferencias**
- El panel no solicita inicio de sesión: cualquier persona que abra `/panel` accede a él.
- Una credencial creada en la demo solo puede verificarse desde el mismo navegador. Entre dispositivos funcionan únicamente las tres credenciales de ejemplo.
- La historia 5 (confirmar que la institución es quien dice ser), que en el Blueprint tenía prioridad «Debería», no se alcanzó a implementar.

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
