# Documentación grupal — Semana 3 (Functional Proof)

**Proyecto:** Stellar-Verify · **Repositorio:** [Stellar-Verify](https://github.com/DanielaAnayaRojas/Stellar-Verify) · **Front desplegado:** [stellar-verify.vercel.app](https://stellar-verify.vercel.app/) · **Ejecución local:** ver el [README](../../README.md)

> **Cómo leer este documento.** Donde lo construido difiere del [Product Blueprint](../semana2/ProductBlueprint.md), lo marcamos con **⚠️**. Preferimos decirlo a dar la impresión de que el MVP está completo.

---

## 1. Front construido

El front de Stellar-Verify permite que una institución registre una credencial (diploma o certificado), que su titular la comparta con un enlace o un código QR, y que cualquiera la verifique sin crear cuenta. Si hubo un error, la institución puede revocarla. Está en [`frontend/`](../../frontend/), hecho con React y Vite; cada pantalla tiene su propia dirección, por lo que el enlace o el QR de una credencial abre directamente su verificación.

Dos términos que se repiten:
- **Huella:** código único de 64 caracteres que el navegador calcula a partir de un archivo. Si el archivo cambia, la huella cambia. Identifica la credencial sin guardar el documento.
- **Credencial:** registro de un diploma o certificado con su institución, titular, logro, fecha y estado (válida o revocada).

> **⚠️ Alcance real.** Todo funciona con datos ficticios y una simulación que corre en el navegador ([`frontend/src/services/`](../../frontend/src/services/)). **No hay conexión con ACTA, Stellar ni servidor propio.** Lo que se emite o revoca queda solo en el navegador donde se hizo. Cada pantalla muestra el aviso «Datos de demostración: nada de esto es real».

### Pantallas

| Pantalla | Dirección | Usuario | Función |
| --- | --- | --- | --- |
| Verificación pública | `/` | Verificador | Verificar con archivo, huella o enlace |
| Resultado | `/verificar/:huella` | Verificador o titular | Muestra si es válida, revocada o no existe |
| Panel | `/panel` | Institución | Lista de credenciales y botón «Nueva credencial» |
| Emisión en 5 pasos | `/panel/emitir` | Institución | Datos, evidencia, revisión, firma y resultado |
| Detalle y revocación | `/panel/credencial/:huella` | Institución | Ver enlace y QR, y revocar |

Las dos primeras filas usan el mismo componente (`Verificar.jsx`). La barra superior ofrece «Verificar» y «Soy una institución».

**Verificación pública.** Se puede subir el documento (la huella se calcula en el dispositivo y el archivo no se envía), pegar la huella o pegar el enlace de la institución. El resultado lleva un sello con ícono y texto, sin depender solo del color:
- **Válida:** institución, titular, logro, fecha y huella.
- **Revocada:** indica que fue anulada y en qué fecha.
- **No encontrada:** explica que no hay registro, sin afirmar que sea falso.

Un archivo ilegible, una huella incompleta o un enlace sin huella muestran un mensaje para corregirlo. Los textos están en [`textos.json`](../../frontend/src/content/textos.json).

**Panel.** Lista cada credencial con titular, logro, fecha y estado, con acceso al detalle y a la página pública.

**Emisión.** Cada paso indica «Paso n de 5» y mueve el cursor al título (útil con teclado o lector de pantalla):
1. **Datos:** institución, titular y logro; no avanza si falta alguno.
2. **Evidencia:** se elige el archivo, se calcula su huella y se avisa si ya existe una credencial para él.
3. **Revisión:** resumen antes de emitir.
4. **Firma:** el emisor marca una casilla para autorizar.
5. **Resultado:** confirmación, huella, enlace copiable y QR.

**Detalle y revocación.** Muestra los datos, el enlace y el QR. Revocar exige confirmación explícita y, desde entonces, la verificación muestra «Revocada».

### Correspondencia con el flujo del Blueprint

| Paso del Blueprint | Qué hay en el front | ¿Coincide? | ⚠️ Diferencia |
| :---: | --- | :---: | --- |
| 1. Registrar emisor, titular y logro | Pantalla «Datos» | Parcial | El emisor se elige de una lista con una única institución ficticia («Instituto de Ejemplo»); no se registran instituciones |
| 2. Adjuntar o referenciar evidencia, sin subir documentos sensibles | Pantalla «Evidencia» | Parcial | Solo se calcula y guarda la huella; la referencia (`ref-001`…) es inventada por la simulación |
| 3. Revisar resumen | Pantalla «Revisión» | **Sí** | — |
| 4. Firma criptográfica (wallet Stellar) | Pantalla «Firma» | No | Es una casilla; el texto aclara que está simulada |
| 5. Envío a ACTA (Testnet) | Espera simulada | No | No hay conexión real; este paso no tiene pantalla propia |
| 6. Titular comparte; tercero consulta emisor, fecha, estado y prueba | Enlace, QR y `/verificar/:huella` | Parcial | Se muestra la huella, que localiza la credencial pero **no** es una prueba registrada en Stellar |
| Camino alterno: cambiar estado o revocar | Detalle con revocación | Parcial | Solo se puede revocar |

**Diferencias adicionales:**
- Los 5 pasos de la pantalla de emisión **no equivalen** a los pasos 1–5 del Blueprint: su paso 5 («Resultado») corresponde al paso 6 del Blueprint.
- El panel **no pide iniciar sesión**.
- Una credencial emitida en la demo solo se verifica desde el mismo navegador; entre dispositivos funcionan únicamente las tres de ejemplo.
- La historia 5 del Blueprint (confirmar que la institución es quien dice ser, prioridad «Debería») no está implementada.

**Sí coincide** con el Blueprint: creación manual desde el panel, revisión previa, no subir documentos sensibles, verificación pública sin cuenta, revocación y enlace con QR (historia 6).

### Datos de demostración

Hay tres archivos ficticios en [`frontend/public/ejemplos/`](../../frontend/public/ejemplos/) y tres credenciales en [`credenciales.json`](../../frontend/src/data/credenciales.json): dos válidas y una revocada. El script [`verificar-integridad.mjs`](../../frontend/scripts/verificar-integridad.mjs) comprueba que las huellas coinciden con los archivos (`node scripts/verificar-integridad.mjs` desde `frontend/`).

### Decisiones de diseño

- **Simulación separada de las pantallas.** Las pantallas piden los datos a `services/`, así que integrar ACTA debería concentrarse allí. Es una intención, no una garantía: algunas pantallas dependen de la organización actual de los datos (por ejemplo, la lista de instituciones en `Emitir.jsx`) y necesitarán ajustes.
- **Lenguaje sin jerga blockchain:** «huella», «emisión» y «revocación», no hashes ni contratos.
- **Accesibilidad.** Campos con etiqueta, avisos anunciados a lectores de pantalla, cursor guiado entre pasos y estados que no dependen del color. Gustavo hizo una revisión leyendo el código ([informe](./Informe_Gus_ACTA_Usabilidad.md)); falta una prueba en móvil.

### Front desplegado

[Inicio](https://stellar-verify.vercel.app/) · [Credencial válida](https://stellar-verify.vercel.app/verificar/a068ed6242b38ebaeaaa9e539ec60a85ea9675691dbb844da55ab7064fd96dca) · [Revocada](https://stellar-verify.vercel.app/verificar/05830aa4f35aa2a609eb771c558d7096b7e2ca7e1e7c551042a8f52f3b2b709e) · [No encontrada](https://stellar-verify.vercel.app/verificar/0000000000000000000000000000000000000000000000000000000000000000) · [Panel](https://stellar-verify.vercel.app/panel) · [Emisión simulada](https://stellar-verify.vercel.app/panel/emitir)

---

## 2. Decisión técnica

**Opción elegida: B, usar una solución existente del ecosistema.** Usaremos **ACTA**, plataforma de credenciales verificables sobre Stellar (con contratos Soroban), en **Testnet**. **No crearemos un contrato propio.** Esta semana no se escribe ni se despliega ningún contrato; solo queda decidida la ruta.

### Para qué y por qué

En el Blueprint (sección 8, «Uso de Stellar») definimos que Stellar sirve para autorizar con una firma, guardar el estado de una credencial de forma pública y verificable, y probar en Testnet sin dinero real. Allí ya quedó escrito que Soroban se usaría **a través de ACTA** para evitar contratos propios. Esta decisión lo confirma.

Según su documentación, ACTA cubre emisión, verificación, revocación y control de emisores autorizados, que es lo que necesita el MVP. Un contrato propio repetiría trabajo resuelto, y además:
1. **Nos enfocamos en lo que queremos validar:** que el ciclo emitir, autorizar, verificar y revocar sirve a usuarios reales, no que sepamos escribir contratos.
2. **Menos riesgo y tiempo:** un contrato propio exige diseño, pruebas y revisión de seguridad, y un error dañaría la confianza que promete el producto.
3. **Encaja con la arquitectura del Blueprint:** prevé un componente en el servidor que se comunica con ACTA y la firma del emisor con su cuenta Stellar.

### Por confirmar

Según el [informe de Gustavo](./Informe_Gus_ACTA_Usabilidad.md), la [documentación de ACTA](https://docs.acta.build/introduction) describe esas funciones y su [sitio](https://acta.build/) anuncia 1 USDC por credencial; revocar implica además tarifas de red en XLM. Falta verificar:
- si ACTA cobra algo adicional por revocar y quién lo paga;
- si la organización podrá revocar como lo pide el producto;
- si la integración será por API o SDK.

### Qué descartamos

- **Contrato propio (opción A).** Solo se reconsideraría si ACTA no cubre una regla indispensable, como la revocación que necesita el producto.
- **Base de datos privada como único registro.** Obliga al verificador a confiar en quien la administra; el Blueprint plantea una referencia pública comprobable por cualquiera.
- **Publicar documentos o datos personales en la red.** Quedan fuera de la cadena; solo va lo necesario para verificar.

---

## 3. Participación del equipo

| Integrante | GitHub | Aporte en este entregable |
| --- | --- | --- |
| Luis Sánchez | [@Lems91](https://github.com/Lems91) | Producto y desarrollo del front (verificación, panel, emisión, detalle y revocación), despliegue en Vercel y limpieza del repositorio |
| Daniela Anaya Rojas | [@DanielaAnayaRojas](https://github.com/DanielaAnayaRojas) | Datos de demostración (credenciales de ejemplo) y documentación grupal |
| Gustavo González | [@gustavoski23](https://github.com/gustavoski23) | Investigación de ACTA, revisión de usabilidad, script de verificación de los datos de demo y README |

---

## 4. Bloqueos y siguiente paso

### Pendiente
- Emitir, verificar y revocar son simulados: no hay conexión con ACTA ni Stellar.
- Sin servidor propio, las credenciales nuevas no se comparten entre dispositivos.
- La firma es una casilla (no una wallet Stellar) y el panel no pide iniciar sesión.
- Falta probar el front en móvil.
- Por decidir en equipo: si «anular una credencial» sigue como historia imprescindible (en el Blueprint quedó «por confirmar»).

### Bloqueos
- Los puntos de ACTA sin verificar (costo de revocar, quién lo paga y alcance de la autorización para revocar), porque condicionan el diseño del servidor.

### Siguiente paso hacia el MVP
1. Resolver con ACTA los puntos pendientes y definir API o SDK, en Testnet.
2. Crear un servidor mínimo que guarde las claves de ACTA y se comunique con ella; el navegador nunca las maneja.
3. Reemplazar la simulación por llamadas a ese servidor y ajustar las pantallas necesarias.
4. Integrar la firma real del emisor con una wallet Stellar en el paso «Firma».
5. Probar el ciclo completo (emitir, verificar, revocar) en Testnet, con el usuario del Problem Brief como caso de aceptación: el profesional que emigra y debe demostrar su título.
