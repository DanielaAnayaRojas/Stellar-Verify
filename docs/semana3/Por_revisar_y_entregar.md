# Por revisar y entregar — Semana 3

Notas internas del equipo. No hacen parte de la documentación del entregable ([Documentacion.md](./Documentacion.md)); son los puntos que hay que aclarar o cerrar antes de entregar y en las próximas semanas.

## Antes de entregar

- [ ] Cada integrante tiene al menos un commit propio esta semana (Luis, Daniela y Gustavo).
- [ ] Cargar el repositorio en Apex (se hace una sola carga) y poner el enlace de Vercel en el campo Website del proyecto: https://stellar-verify.vercel.app/
- [ ] **Confirmar la fecha límite.** El enunciado dice en un lugar «domingo 11 de octubre, 8:00 p.m. hora Colombia» y en la lista de verificación «10:00 a.m.». Mientras se aclara, conviene entregar antes de las 10:00 a.m.
- [ ] **Recortar el README.** El enunciado pide solo requisitos, instalación y cómo correrlo, «nada más». Hoy el [README](../../README.md) además tiene una nota «Importante», el recorrido de demostración, el enlace al Blueprint y la lista del equipo, y dice que la documentación de la semana 3 «será incorporada por Daniela», que ya no es cierto.
- [ ] Revisar que el commit de Daniela quede asociado a su cuenta de GitHub (los commits salen como «DaniAnaya» con el correo da.anaya.ro@gmail.com; si ese correo no está agregado a @DanielaAnayaRojas, GitHub no lo cuenta como suyo).
- [ ] Confirmar que `npm install` y `npm run dev` funcionan desde cero en un clon limpio.

## Por aclarar sobre ACTA

Según las revisiones que hicimos sobre ACTA ([informe de usabilidad](./Informe_Gus_ACTA_Usabilidad.md)), su [documentación](https://docs.acta.build/introduction) describe emisión, verificación, revocación y emisores autorizados, y su [sitio](https://acta.build/) anuncia 1 USDC por credencial; revocar implica además tarifas de red en XLM. Falta confirmar:

- [ ] Si ACTA cobra algo adicional por revocar y quién lo paga.
- [ ] Si la organización podrá revocar como lo pide el producto.
- [ ] Si la integración será por API o SDK.

Estos puntos condicionan el diseño del servidor de la próxima semana.

## Por decidir en equipo

- [ ] Si «anular una credencial» sigue como historia imprescindible (en el Blueprint quedó «por confirmar»).
- [ ] Si la historia 5 del Blueprint (confirmar que la institución es quien dice ser) entra al MVP o queda para después.
