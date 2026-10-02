# Product Blueprint

**Nombre del proyecto:** Stellar-Verify

**Repositorio (enlace obligatorio):** [Stellar-Verify] https://github.com/DanielaAnayaRojas/Stellar-Verify/tree/main

> Los campos marcados como _enlace obligatorio_ deben ir como enlace en Markdown, con este formato: `[texto del enlace](https://...)`. Reemplacen el texto y la dirección de ejemplo.

---

## Contenido

1. Priorización de historias
2. Propuesta de valor
3. Flujo de usuario
4. Alcance del MVP
5. Lean Canvas
6. Backlog priorizado (Kanban)
7. Arquitectura inicial
8. Uso de Stellar y justificación

---

## 1. Priorización de historias

Historias elegidas entre las que propuso el equipo y criterio con que se priorizaron. Son las que pasan al backlog. Extensión: breve.

Criterio de priorización: imprescindible / debería / podría / queda fuera. La pregunta para cada historia es: ¿el producto sigue resolviendo el problema sin ella? Si no, es imprescindible.

Prioridad Historia Propuesta por Por qué entra al backlog
1 Como institución emisora quiero registrar la credencial de cada persona que termina mi programa para que pueda demostrar su formación sin depender de mí después. Luis Imprescindible. Sin registro no hay nada que verificar.
2 Como verificador quiero comprobar una credencial sin crear una cuenta para decidir sobre la persona sin esperar a que alguien me responda. Luis Imprescindible. Es el resultado que promete la propuesta de valor.
3 Como verificador quiero ver qué institución emitió la credencial y en qué fecha para saber si puedo confiar en ella. Luis Imprescindible. Sin institución visible no hay confianza.
4 Como institución emisora quiero anular una credencial emitida por error para que no siga apareciendo como válida. Luis Imprescindible (por confirmar con el equipo). Protege la confianza y nos diferencia de lo que ya existe.
5 Como verificador quiero confirmar que la institución emisora es realmente quien dice ser para no aceptar credenciales de una institución falsa. Luis Debería. Sube la confianza; entra si el núcleo funciona.
6 Como titular quiero compartir mi credencial con un enlace o código QR para que quien me la pide la revise sin tener que escribirme. Luis Debería. El producto funciona sin esto, pero mejora la experiencia.

(La historia «como titular quiero demostrar mi formación aunque la institución haya cerrado» no es una tarjeta aparte: se cumple con las tarjetas 1 y 2 y se comprueba como criterio de aceptación.)

## 2. Propuesta de valor

Qué resultado obtiene el usuario y por qué elegiría esta solución. En qué se diferencia de cómo resuelve hoy. Conecta con el usuario del Problem Brief. Extensión: 150–300 palabras en total.

Usuario (del Problem Brief): el profesional que emigra y no puede demostrar rápido que su título o certificación es auténtico. Lo encarna Luis: graduado en Venezuela, vive en Colombia y nunca pudo ejercer su profesión por el costo y la demora del trámite.

Resultado que obtiene: demuestra en minutos que su credencial es real y se acredita ante quien se lo pida, sin depender de que una institución de otro país responda.

Por qué elegiría esta solución: hoy se apoya en lo que ya conoce: cartas, correos a la institución de origen, contactos personales y el trámite de certificación y apostilla. Funciona, pero es lento, caro y depende de terceros. La solución no le pide aprender nada nuevo: su institución registra la credencial y quien la necesita la comprueba sin crear una cuenta. Además, su prueba sigue vigente aunque la institución cierre o cambie de sistema, algo real en contextos de inestabilidad institucional.

En qué se diferencia de cómo lo resuelve hoy: en el punto exacto donde hoy se afirma y se espera. Antes, la autenticidad se afirmaba con papeles y había que esperar a que la institución la confirmara; ahora se comprueba al instante, sin esperar una respuesta. No reemplaza la convalidación académica: demuestra autenticidad.

## 3. Flujo de usuario

Recorrido de la persona por la solución de principio a fin, roles y puntos de interacción. Diagrama o secuencia numerada. Extensión: 150–300 palabras.

Paso Rol Qué hace Punto de interacción
1 Institución emisora Registra la credencial de la persona que terminó su programa. Panel de la institución (con su billetera)
2 Titular Recibe su credencial de la institución y la guarda. Entrega de la institución (correo)
3 Titular Entrega su credencial a quien se la pide, sea empleador o entidad. Correo o mensajería
4 Verificador Carga la credencial que recibió en la página de verificación. Página de verificación, sin cuenta
5 Verificador Ve si la credencial es válida, qué institución la emitió y en qué fecha. Página de verificación

Entrada: la institución tiene la credencial de quien terminó su programa. La persona tiene un celular o computador con internet y sabe abrir un enlace o cargar un archivo.

Salida: el titular queda con una credencial que cualquiera puede comprobar en segundos, y quien verifica confirma sin llamar a nadie.

Puntos de interacción clave: el paso 1, cuando la institución deja el registro, y los pasos 4 y 5, cuando el verificador consulta.

Fuera del camino principal (anotadas): anular una credencial (camino alterno de la institución, dentro del MVP), credencial no encontrada y titular que pierde su archivo.

---

## 4. Alcance del MVP

> Funcionalidad central separada de la deseable que queda fuera. Justificación de por qué el recorte sigue entregando valor. Extensión: 150–300 palabras en total.

| Dentro del MVP (funcionalidad central) | Fuera del MVP (deseable, para después) |
| -------------------------------------- | -------------------------------------- |
| Escriban aquí su respuesta.            | Escriban aquí su respuesta.            |
| Escriban aquí su respuesta.            | Escriban aquí su respuesta.            |
| Escriban aquí su respuesta.            | Escriban aquí su respuesta.            |

**Por qué el recorte sigue entregando valor:** Escriban aquí su respuesta.

---

## 5. Lean Canvas

> Lienzo de una página con el modelo del producto. Extensión: enlace (obligatorio).

**Enlace al Lean Canvas (obligatorio):** [Lean Canvas del proyecto](https://escriban-aqui-el-enlace)

El lienzo debe cubrir: problema, segmento de usuarios, propuesta de valor única, solución, canales, métricas clave, ventaja diferencial y estructura de costos e ingresos.

---

## 6. Backlog priorizado (Kanban)

> Enlace al tablero en GitHub Projects, construido con las historias priorizadas, en columnas y con criterios de aceptación por tarjeta. Extensión: enlace al tablero (obligatorio).

**Enlace al tablero (obligatorio):** [Tablero Kanban en GitHub Projects](https://github.com/users/usuario/projects/1)

---

## 7. Arquitectura inicial

> Cómo se conectan las partes (interfaz, lógica, Stellar) y en qué punto entra la red. Diagrama simple en imagen. Extensión: 150–300 palabras en total.

**Diagrama (imagen o enlace):** Escriban aquí el enlace o inserten la imagen.

|   Capa   | Componente                  | Qué hace                    |
| :------: | --------------------------- | --------------------------- |
| Interfaz | Escriban aquí su respuesta. | Escriban aquí su respuesta. |
|  Lógica  | Escriban aquí su respuesta. | Escriban aquí su respuesta. |
| Stellar  | Escriban aquí su respuesta. | Escriban aquí su respuesta. |

**En qué punto entra la red:** Escriban aquí su respuesta.

---

## 8. Uso de Stellar y justificación

> Qué componentes de Stellar usaría y por qué cada uno. Apoyado en el criterio de pertinencia del Problem Brief. Extensión: 150–300 palabras en total.

**Criterio de pertinencia (del Problem Brief):** Escriban aquí el criterio en el que se apoyan.

| Componente de Stellar       | Para qué lo usamos          | Por qué ese y no otra alternativa |
| --------------------------- | --------------------------- | --------------------------------- |
| Escriban aquí su respuesta. | Escriban aquí su respuesta. | Escriban aquí su respuesta.       |
| Escriban aquí su respuesta. | Escriban aquí su respuesta. | Escriban aquí su respuesta.       |
