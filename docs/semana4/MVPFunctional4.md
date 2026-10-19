# MVP Funcional — Semana 4

**Proyecto:** Stellar-Verify · **Repositorio:** [Stellar-Verify](https://github.com/DanielaAnayaRojas/Stellar-Verify) · **Producto en línea:** [stellar-verify.vercel.app](https://stellar-verify.vercel.app/)

Stellar-Verify busca resolver un problema que Luis vivió: demostrar que un título es auténtico sin esperar meses a que una institución lejana responda. Una institución registra la credencial, y cualquier persona la comprueba sin crear una cuenta.

Hasta la semana 3 era una maqueta. Esta semana la conectamos a **Testnet**, la red de pruebas de Stellar, donde no se usa dinero real. Lo que se emite y se revoca queda registrado de verdad, aunque todavía sin valor legal.

Tres términos para leer con comodidad:
- **Huella:** código de 64 caracteres que el navegador calcula a partir de un archivo. Si el archivo cambia, la huella cambia.
- **ACTA:** plataforma de credenciales sobre Stellar que usamos en lugar de escribir un contrato propio (decisión de la semana 3).
- **Wallet (Freighter):** aplicación donde la institución guarda su clave y firma. La firma prueba que la orden la dio ella.

---

## Evidencia verificable

Todo lo siguiente puede comprobarse sin cuenta.

| Elemento | Enlace |
| --- | --- |
| Producto en línea | [stellar-verify.vercel.app](https://stellar-verify.vercel.app/) |
| Video público | [PENDIENTE: pegar aquí el enlace del video] |
| Contratos propios | No hay. Usamos el contrato de ACTA, ya desplegado en Testnet; su prueba son las transacciones de la tabla. |

El 18 de octubre de 2026 emitimos tres credenciales de demostración, con la firma de la institución activada. Cada una corresponde a un archivo de [`frontend/public/ejemplos/`](../../frontend/public/ejemplos/), y la institución aparece como «Institucion de prueba». Los enlaces de ejemplo de la semana 3 pertenecen a la versión simulada; los vigentes son estos.

| # | Curso | Estado | Huella | Verificación | Transacciones (Stellar Expert) |
| :---: | --- | :---: | --- | --- | --- |
| 1 | Técnico en análisis de datos | Válida | `ba0f8b38…40a5f` | [Abrir](https://stellar-verify.vercel.app/verificar/ba0f8b380ea55ce5a8b53c1a66b38ec5d0fe468dc7a91a890c26d2fafaf40a5f) | [Emisión](https://stellar.expert/explorer/testnet/tx/ded02463e9e3bc96bcfc7ebddd8fbb8da927fe38cf8131d1d35106aabd25c193) |
| 2 | Introducción a la ciberseguridad | Válida | `9e8a0165…bab03` | [Abrir](https://stellar-verify.vercel.app/verificar/9e8a0165c6f069807e87d678b66ded6d8754677fa25b3a974b8da3933eebab03) | [Emisión](https://stellar.expert/explorer/testnet/tx/3dce878e9393e6d9eba02c752c347435567fc1b5a31ff7c0482f467f2536e2e1) |
| 3 | Atención al cliente digital | Revocada | `0e2edd67…f17a` | [Abrir](https://stellar-verify.vercel.app/verificar/0e2edd6751fb77d33784b198fc953fbe592fdeff3dbb1c0bcf152c5d9f39f17a) | [Emisión](https://stellar.expert/explorer/testnet/tx/2ab4cb1516b9a59f3206ef54e2ce7d78b494a284cfcf9f4d1b1a2a4467b427e4) · [Revocación](https://stellar.expert/explorer/testnet/tx/fc945660eb88435ff440e302e2e2f2c92dd2d423db6cbea035cfd814098aad96) |

**Para comprobarlo:** abra un enlace de «Verificación» y lea el estado; suba en la página de inicio el archivo de ejemplo de esa credencial y confirme que la huella coincide; y abra la transacción, donde el explorador público muestra el registro con su fecha.

---

## Aprendizajes y ajustes priorizados

**Del proceso.** Empezamos simulando y fue buena decisión: dejamos las pantallas pidiendo los datos a una sola capa de servicios, para que conectar la red fuera un cambio concentrado y no una reconstrucción. Elegir ACTA en lugar de un contrato propio nos ahorró riesgo, pero nos hizo heredar sus decisiones. Leer su contrato nos mostró dos que no coincidían con el Blueprint: no guarda quién emitió cada credencial, y quien revoca es el dueño de la bóveda (el espacio donde ACTA guarda las credenciales de una institución), no el emisor.

**De Stellar.** Aprendimos tres cosas. Primero, que una firma de wallet es lo único que prueba quién dio una orden; por eso la institución firma en Freighter y nuestro servidor solo envía la transacción ya firmada, sin guardar ninguna clave de Stellar. Segundo, que las transacciones son públicas: el explorador sirve de evidencia independiente de lo que dice nuestra página. Tercero, que los servicios del ecosistema pueden fallar: una respuesta de ACTA llegó a tardar 8 segundos.

**Qué ajustamos, de mayor a menor impacto**
1. Reemplazamos la simulación por emisión, verificación y revocación reales. El panel ahora exige entrar con Freighter.
2. Añadimos la firma del emisor, que la verificación exige, porque el contrato por sí solo no prueba quién emitió.
3. Esperamos 5 segundos a ACTA, reintentamos una vez y, si falla, enviamos la transacción firmada directo a la red.

**Pendiente.** Una bóveda por institución, para que cada una controle sus revocaciones; comprobar que la institución es quien dice ser (historia 5 del Blueprint); y afinar los textos de los resultados con ayuda de los usuarios.

---

## Riesgos y pendientes

**Riesgos**
- **Dependemos de ACTA.** Si su servicio cambia o cae, emitir y revocar se complican. El reintento y el envío directo reducen el problema, pero no lo eliminan.
- **Solo Testnet.** Las credenciales no tienen valor legal. Seguimos sin saber cuánto cuesta revocar en la red real ni quién lo pagaría, la duda abierta desde la semana 3.
- **Contrato sin auditoría externa.** Nuestra revisión del 6 de octubre lo consideró apto para pruebas, no para producción. Además, solo informa si una credencial está vigente o anulada; no demuestra que la institución exista.
- **Control concentrado.** Quien administra la bóveda puede revocar todo lo que contiene. Si esa cuenta se pierde o se compromete, se afectan todas las credenciales de la institución.
- **Lo guardado no se borra.** Aunque se revoque, el contenido permanece en la red; por eso solo debe registrarse lo indispensable, nunca datos personales sensibles.
- **Sin institución real.** No tenemos todavía un emisor piloto confirmado; es el supuesto más frágil del proyecto.

**Pendientes antes del cierre**
- Publicar el video y completar su enlace.
- Integrar en la rama principal el código que conecta con ACTA (hoy está en otra rama) y actualizar el README, que aún describe datos simulados.
- Iniciar la validación con usuarios.

---

## Plan de validación con usuarios

Validaremos el producto con quien vive el problema: el profesional que emigra y debe demostrar su título, como Luis. También con quienes le piden esa prueba (talento humano, entidades evaluadoras) y con una institución dispuesta a emitir como piloto. Con ello probamos los supuestos del Problem Brief: que haya un emisor, que el verificador acepte este registro y que el titular no necesite wallet.

**Cómo.**
1. **Entrevistas** con cinco a ocho migrantes que hayan iniciado o abandonado una convalidación.
2. **Pruebas con el producto.** Daremos a cinco verificadores un enlace y un archivo, y les pediremos decir el estado de la credencial, observando qué hacen y qué entienden mal. A la institución piloto le pediremos emitir y revocar con Freighter.
3. **Métricas del piloto:** credenciales emitidas, consultas públicas y tiempo hasta verificar.

| Hipótesis | La damos por cumplida si… |
| --- | --- |
| Un verificador confirma una credencial sin ayuda ni cuenta. | Al menos 4 de 5 lo logran en menos de 2 minutos. |
| Entiende los tres resultados, sobre todo que «No encontrada» no significa «falsa». | Al menos 4 de 5 los interpretan bien. |
| Quien recibe la credencial no necesita wallet. | Ningún titular ni verificador la necesita. |
| El registro sirve como evidencia complementaria. | Al menos 3 de 5 verificadores lo consultarían antes de escribir a la institución. |
| Una institución puede emitir por sí sola. | Emite y revoca en menos de 10 minutos, incluida la instalación de la wallet. |

**Qué nos haría cambiar de rumbo.** Que las entrevistas muestren que el cuello de botella no es confirmar la autenticidad, sino la lentitud de la evaluación académica. En ese caso el producto no resolvería el problema central y habría que replantearlo.
