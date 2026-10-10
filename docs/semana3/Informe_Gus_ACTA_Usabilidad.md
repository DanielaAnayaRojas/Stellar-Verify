# Informe de Gustavo — ACTA, datos de prueba y revisión de usabilidad

**Proyecto:** Stellar Verify · **Entregable:** 3 · **Fecha:** 10 de octubre de 2026 (Colombia)
**Alcance:** revisión estática del repositorio `DanielaAnayaRojas/Stellar-Verify`, rama `main`, commit observado `134e82f1` (10 oct., 17:52 Colombia), más comprobación independiente de los tres archivos de ejemplo. **No es una auditoría de producción ni una prueba visual del despliegue.**

## 1. ACTA: información útil para la decisión del equipo

- En el chat del viernes 9, a las 9:31, Gustavo ya explicó a Luis que el cobro en USDC es por **emisión**, y que la revocación implica tarifas de red en XLM. Luis acusó recibo a las 11:12. No hay que volver a enviar la misma respuesta como si estuviera pendiente.
- La **documentación de ACTA** especifica emisión/verificación, revocación y control de autorizaciones de emisores **por vault**. Fuente: https://docs.acta.build/introduction
- La **web de ACTA** anuncia **1 USDC por credencial**. Fuente: https://acta.build/
- Las transacciones de contratos en Stellar requieren tarifas de red y recursos. Fuente: https://stellar.org/es/faq
- **No verificado de manera independiente:** si ACTA factura un concepto adicional por revocación, quién paga en el flujo de API elegido y si la organización tendrá autorización de revocar exactamente como quiere el producto. Se necesita validación técnica con API/SDK y, si corresponde, con ACTA.

## 2. Repositorio: lo confirmado

| Área | Observación | Evaluación |
|---|---|---|
| Código React | Existen `Verificar.jsx`, `Panel.jsx`, `Emitir.jsx` y `Detalle.jsx`; el flujo de emisión tiene cinco pasos. | Implementado en código; sin revisión visual. |
| Datos simulados | `credenciales.json` contiene dos credenciales válidas y una revocada con `fechaRevocacion`. | Presente. |
| Textos | `frontend/src/content/textos.json` existe y es importado en la interfaz; los commits observados de este archivo son de Luis. | Presente; falta commit propio de Gustavo esta semana. |
| Verificación | Calcula SHA-256 en el navegador; acepta archivo, huella y enlace. | Presente en código. |
| QR | Se genera desde el enlace `/verificar/:huella`. | Presente en código. |
| Revocación | Hay diálogo de confirmación y actualización del estado simulado. | Presente en código. |
| Persistencia | Usa `localStorage` de cada navegador. | **Limitación importante:** las emisiones y revocaciones nuevas NO se comparten entre dispositivos. |
| Roles | No hay autenticación real en panel; toda la funcionalidad es demo. | No confundir con un producto seguro listo para usar. |
| Vercel | Existe `frontend/vercel.json` con reescritura a `/index.html`; también `package.json` y `vite.config.js`. | Preparado para desplegar, **no prueba que ya esté desplegado**. |
| Documentación | No existe `docs/semana3/Documentacion.md` en el commit observado. | **Pendiente crítico de la entrega.** |
| README | El `README.md` de la raíz aún contiene la plantilla original. | **Pendiente crítico de la entrega.** |
| Limpieza | La raíz contiene un `.DS_Store` versionado. | Conviene retirarlo y añadir `.gitignore` en raíz. |

## 3. Prueba de integridad de credenciales de ejemplo

La huella SHA-256 de **los bytes exactos** de cada ejemplo coincide con una credencial registrada:

| Archivo | Estado esperado | Comprobación |
|---|---|---|
| `diploma-ejemplo-1.txt` | Válida | Coincide |
| `certificado-ejemplo-2.txt` | Válida | Coincide |
| `constancia-ejemplo-3.txt` | Revocada | Coincide |

Se preparó el script independiente `frontend/scripts/verificar-integridad.mjs`, que comprueba las huellas, campos requeridos, emisores, fechas, duplicados y revocación. Se ejecutó con éxito contra una copia de las credenciales adjuntas y el contenido exacto de los tres ejemplos consultados en GitHub. **No se ha ejecutado todavía un `npm run build` del repositorio completo.**

## 4. Checklist de usabilidad por ejecutar en navegador

1. En `/`, comprobar que el usuario entiende «Verifica un diploma o certificado en segundos» y ve que es una demostración.
2. Seleccionar `diploma-ejemplo-1.txt`: resultado **Válida**, titular y logro correctos.
3. Seleccionar `constancia-ejemplo-3.txt`: resultado **Revocada**, fecha y explicación visibles.
4. Subir un archivo nuevo: resultado **No encontrada**, sin afirmar automáticamente que sea falso.
5. Pegar huella mal formada: mensaje de error claro que permita recuperarse.
6. Entrar a `/panel`, verificar listado, estados y acceso a los detalles.
7. Entrar a `/panel/emitir`, completar el flujo de cinco pasos, recibir enlace y QR.
8. Abrir enlace/QR en **otro navegador**: comprobar qué credenciales se pueden consultar y documentar la limitación de `localStorage`.
9. Revocar una credencial de demostración y comprobar que el estado cambia en el **mismo navegador**.
10. Recargar páginas con rutas directas (`/panel`, `/verificar/<huella>`) en Vercel, probar desde móvil y revisar accesibilidad de botones, textos y foco de teclado.

No marcar estas pruebas como completadas hasta disponer de la URL o ejecución local.

## 5. Recomendaciones prioritarias para Luis y Daniela

1. **Antes de Apex:** terminar `docs/semana3/Documentacion.md`, corregir `README.md`, limpiar `.DS_Store` y comprobar `npm ci && npm run build` dentro de `frontend/`.
2. Desplegar con **Root Directory = `frontend`**, framework **Vite**, build `npm run build` y salida `dist`; `vercel.json` ya maneja las rutas de React Router.
3. No presentar la simulación con almacenamiento local como credenciales reales verificadas en Stellar/ACTA; mantener avisos de demo visibles.
4. Acordar con Gustavo el archivo de prueba preparado para un commit individual sin editar componentes que Luis está cambiando.
5. Copiar el enlace Vercel confirmado en el campo **Website** de Apex cuando el equipo cierre la revisión.

## 6. Evidencia de contribución propuesta de Gustavo

- Investigación y aclaración de las capacidades de ACTA (chat 9/10 + fuentes oficiales).
- Revisión del lenguaje de `textos.json` y del funcionamiento esperado en siete estados/pasos del producto.
- Preparación de la prueba automatizada `frontend/scripts/verificar-integridad.mjs`, sin dependencias externas.
- Revisión de usabilidad **estática**; revisión visual pendiente del despliegue.

**Coordinación:** Luis escribió el 10/10 a las 16:39 que Gustavo **no hiciera pull ni push por ahora** y que después tendría otra sección para un commit independiente. Respetar esa instrucción o pedir autorización explícita antes de subir cambios.
