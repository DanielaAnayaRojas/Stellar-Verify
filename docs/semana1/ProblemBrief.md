Problem Brief
Decisión del problema
Problema elegido

El problema ganador en una frase, sin mencionar blockchain, y quién lo propuso.

Un profesional que emigra no puede demostrar rápidamente que su credencial (título, certificación o curso) es auténtica ante quien se lo exige, y debe pasar meses entre certificaciones, apostillas y costos en dos países antes de poder ejercer o acreditarse. Propuesto por Luis.

Por qué elegimos este

Qué inclinó al equipo por este problema frente a los demás, según los criterios de la Sesión 1.

Las tres señales de la Sesión 1 (partes que no confían entre sí, histórico inalterable, eliminar un intermediario que concentra la confianza) aplican con la misma fuerza a este problema y al de créditos de carbono que investigó Daniela. Elegimos credenciales porque:

Tenía un desarrollo más avanzado (arquitectura, contrato definido) al momento de la reunión, lo que reduce el riesgo de tiempo frente al Functional Proof del 11 de octubre.
Su solución requiere un contrato Soroban propiamente dicho (registro con revocación y control de emisores), lo que la alinea directamente con lo que enseña la Sesión 6. El enfoque de créditos de carbono, tal como está prototipado, usa activos clásicos de Stellar y no necesita Soroban — es válido, pero no ejercita la parte del programa que se evalúa en el Functional Proof.
Tiene un primer emisor piloto alcanzable en 5 semanas (BAF/Ruta N emitiendo constancias de BB101), mientras que un emisor piloto de carbono (una finca o certificadora real) es una dependencia externa más difícil de cerrar a tiempo.

El trabajo de Daniela no se descarta: se documenta como extensión de nivel 2/roadmap, porque valida que el mismo patrón de problema se repite en otro dominio.

Propuestas descartadas

Cada propuesta considerada, quién la propuso y el motivo del descarte.

Créditos de carbono (Daniela): los compradores no pueden verificar por sí mismos la evidencia detrás de cada crédito (verificador, consentimiento de la comunidad, pago), lo que encarece demostrar calidad y es barrera para proyectos pequeños. No se descarta por ser mala — se pospone como extensión del mismo patrón de problema, con MVP propio ya funcional en testnet, porque construir ambas a fondo en 5 semanas dispersaría el esfuerzo del equipo.

Rampas de pago para builders (Gus): los builders que venden productos o servicios a nivel global enfrentan alta fricción para recibir pagos internacionales, porque hoy deben integrar una rampa de pago distinta por cada país o mercado, cada una costosa desde el inicio y limitada a una región. Se descarta como problema principal porque es, en esencia, un problema de infraestructura de pagos más que de confianza entre partes que no se conocen — encaja menos directamente con los tres criterios de la Sesión 1 que la propuesta de credenciales. Queda como posible extensión de roadmap si el equipo decide ampliar el alcance del proyecto hacia pagos.

Cómo tomamos la decisión

Cómo llegó el equipo al acuerdo: votación, consenso tras debate u otro.

Consenso en la reunión de equipo del 27 de septiembre. La grabación planeada con una herramienta de IA no se guardó por una falla técnica, así que esta sección resume el acuerdo alcanzado sin acta textual de la discusión.

Problem Brief
Encabezado

Nombre del proyecto y una frase que describa el problema. Extensión: breve.

Stellar-Verify — un registro verificable, reutilizable entre distintos ámbitos (credenciales académicas, y a futuro otros casos como créditos de carbono), para que ninguna evidencia dependa de la burocracia o de un intermediario para demostrar que es real.

Equipo y roles

Integrantes con su usuario de GitHub, rol asumido por cada persona, responsable de las entregas y canal de coordinación interna. Extensión: breve.

Luis (@Lems91) — producto, pitch, frontend dirigido con IA, coordinación general de entregas.
Gus (@Gustavoski23) — contrato Soroban, integración con Freighter, arquitectura sobre Stellar.
Daniela (@DanielaAnayaRojas) — modelo de datos de la credencial, validación con usuarios, extensión del caso a créditos de carbono.

Problema y evidencia

Enunciado del problema en una frase, sin mencionar blockchain. Contexto, frecuencia y alcance. Evidencia mínima de que el problema existe: observación directa, experiencia propia, conversaciones o fuentes consultadas, con enlace o cita cuando aplique. Extensión: 150–300 palabras.

Un profesional que emigra no puede demostrar rápidamente que su credencial es auténtica ante quien se lo exige, y debe pasar meses entre certificaciones, apostillas y costos en dos países antes de poder ejercer.

El contexto no es marginal: según el tablero oficial de Migración Colombia, con corte a febrero de 2026 hay 2.841.389 migrantes venezolanos registrados en Colombia, uno de los corredores migratorios más grandes de la región (fuente: portal.migracioncolombia.gov.co, Respuesta PQRSDF No. 179895). Cada persona de ese grupo que trae una formación de su país de origen enfrenta, en algún grado, esta misma fricción. Y el problema no es exclusivo de este corredor: el mismo trámite ocurre en cualquier dirección entre cualquier par de países.

La evidencia mínima es experiencia propia: Luis se graduó en Venezuela, emigró a Colombia, y nunca llegó a ejercer su profesión porque el proceso de convalidación —certificación en origen, apostilla, traducción, radicación ante el Ministerio de Educación Nacional y espera de resolución— resultó demasiado largo, costoso y burocrático para completarlo.

Como evidencia adicional de que el patrón se repite en otros dominios, la investigación paralela de Daniela sobre créditos de carbono encontró el mismo tipo de fricción: quien compra un crédito no puede verificar por sí mismo la evidencia que lo respalda, y depende de procesos manuales de un tercero para confiar en él.

Usuario y actores

Quién sufre el problema y qué necesita resolver. Cómo lo resuelve hoy y qué le cuesta en dinero, tiempo o esfuerzo. Demás actores que intervienen en el flujo, con el papel que cumple cada uno. Extensión: 150–300 palabras.

Quien sufre el problema es el profesional migrante que necesita demostrar su credencial en otro país para ejercer o acreditarse. Necesita que un tercero (empleador, entidad evaluadora, institución) confíe en que su título o certificación es real, sin tener que esperar meses.

Hoy lo resuelve iniciando un trámite de convalidación: reúne los documentos del país de origen, los apostilla, los traduce si aplica, y los radica ante la entidad evaluadora del país destino para esperar una resolución. Le cuesta tiempo (meses de espera en ambos lados), dinero (apostillas, traducciones oficiales, trámites en dos países) y esfuerzo (coordinar gestiones a distancia con instituciones que a veces no responden o han cambiado de sistema). En el caso de Luis, el costo acumulado de estas tres cosas fue suficiente para abandonar el proceso sin completarlo.

Otros actores del flujo:

La institución emisora (universidad, instituto, programa de formación), que certificó originalmente la credencial y es quien podría confirmar su autenticidad, pero a la que rara vez se puede consultar rápido.
La entidad evaluadora del país destino (en Colombia, el Ministerio de Educación Nacional), que decide si la credencial se reconoce, y que hoy no tiene forma directa de verificar autenticidad sin pasar por el trámite completo.
El empleador o entidad que exige la credencial, que en la práctica confía en el resultado del trámite oficial, no en el documento por sí solo.
Flujo actual de valor

Recorrido paso a paso de cómo se mueve hoy el dinero, la información o el activo, desde el origen hasta el destino. Diagrama o secuencia numerada, con los intermediarios explícitos. Señalar si algún paso responde a una obligación normativa. Extensión: 150–300 palabras.

Emisión original: la institución en el país de origen emite el título o certificado en papel.
Certificación/legalización en origen: el migrante gestiona la certificación oficial del documento ante la propia institución o la autoridad educativa de su país.
Apostilla: el documento se apostilla ante la autoridad competente del país de origen (paso normativo, exigido por el Convenio de La Haya de la Apostilla, del que Colombia y Venezuela son parte).
Traducción oficial: si el documento no está en español, se traduce por un traductor oficialmente reconocido (paso normativo cuando aplica).
Radicación: el migrante presenta el paquete completo ante la entidad evaluadora del país destino —en Colombia, el Ministerio de Educación Nacional— (paso normativo, es el trámite de convalidación en sí).
Espera de resolución: la entidad evaluadora revisa el contenido académico y, en paralelo, puede necesitar confirmar la autenticidad del documento contactando directamente a la institución de origen.
Resolución final: se emite (o se niega) el reconocimiento, y solo entonces el profesional puede ejercer o acreditarse formalmente.

El intermediario explícito en cada paso es distinto (institución de origen, autoridad de apostilla, traductor oficial, Ministerio de Educación), y no hay ningún punto del flujo donde el destinatario final pueda confirmar autenticidad por sí mismo sin pasar por alguno de ellos.

Fricciones identificadas

Puntos concretos donde el flujo falla, se encarece o se demora. Cada fricción indica en qué paso ocurre, qué la causa y a quién afecta. Extensión: 150–300 palabras.

Fricción principal — paso 6 (espera de resolución): cuando la entidad evaluadora necesita confirmar que el documento es auténtico, su única vía es contactar directamente a la institución de origen y esperar respuesta. La causa es que no existe ningún registro que la institución haya dejado, verificable por un tercero, al momento de emitir el título. Esto afecta directamente al migrante, que ve extenderse la espera por semanas o meses adicionales sin control sobre el tiempo de respuesta de una institución que no depende de él.

Fricción secundaria — pasos 2 a 4 (certificación, apostilla, traducción): cada uno de estos pasos exige coordinar con una entidad distinta, a menudo a distancia y en el país de origen, lo que implica costos repetidos (tarifas de apostilla, honorarios de traducción oficial) y tiempo de gestión que no está bajo el control del migrante. Afecta especialmente a quien ya no tiene contactos o presencia física en su país de origen para agilizar estos trámites.

Fricción de fondo: si la institución de origen cierra, cambia de sistema o deja de responder solicitudes —una situación real en contextos de inestabilidad institucional como el de Venezuela—, el paso 6 puede no resolverse nunca, dejando al migrante sin forma de demostrar su credencial.

Oportunidad e hipótesis

Oportunidad priorizada entre las fricciones identificadas, con el motivo de la elección. Hipótesis inicial de por qué blockchain podría mejorar ese punto, expresada en términos de qué cambiaría para el usuario. Extensión: 150–300 palabras.

La oportunidad priorizada es la fricción principal: la dependencia de que la entidad evaluadora contacte directamente a la institución de origen para confirmar autenticidad (paso 6). Se elige esta y no las de apostilla o traducción porque es el único punto del flujo donde la demora no tiene un tiempo definido —puede ser una respuesta en días o nunca llegar—, y porque es el paso donde un registro verificable puede reemplazar por completo la necesidad de contacto directo.

Hipótesis: si la institución que emite la credencial dejara, al momento de emitirla, un registro verificable de su autenticidad, la entidad evaluadora podría confirmar en minutos que el documento es real, sin tener que iniciar ni esperar una comunicación directa con la institución.

Lo que cambiaría para el usuario: hoy el migrante no tiene ningún control sobre cuánto tarda la confirmación de autenticidad de su documento —depende enteramente de un tercero que puede tardar semanas, no responder, o incluso haber desaparecido. Con un registro verificable, esa confirmación deja de depender del tiempo de respuesta de la institución y pasa a estar disponible de forma inmediata y permanente, incluso si la institución original cierra o cambia de sistema en el futuro.

Criterio de pertinencia

Justificación de por qué el caso requiere un registro distribuido y no una base de datos tradicional o una integración entre sistemas existentes. Debe apoyarse en al menos uno de los criterios de la Sesión 1: varias partes que no confían entre sí necesitan compartir un mismo registro, el histórico no puede alterarse, o se elimina un intermediario que hoy concentra la confianza. Extensión: 150–300 palabras.

Este caso cumple los tres criterios de la Sesión 1, no solo uno:

Varias partes que no confían entre sí necesitan compartir un mismo registro: la institución emisora, el migrante y la entidad evaluadora están en países distintos, bajo jurisdicciones distintas, y ninguna confía directamente en las otras dos sin pasar por el trámite completo. Una base de datos tradicional no resuelve esto, porque tendría que ser administrada por una sola de las partes, y las otras dos no tendrían razón para confiar en que esa parte no la alteró a su conveniencia.

El histórico no puede alterarse, ni por quien lo administra: ni siquiera la institución emisora debería poder cambiar retroactivamente qué credencial emitió. Una base de datos convencional, controlada por la propia institución, no ofrece esa garantía —la institución técnicamente siempre podría editar su propio registro.

Se elimina un intermediario que hoy concentra la confianza: el proceso completo de apostilla y verificación manual (pasos 3 a 6 del flujo) existe precisamente porque hoy nadie confía en el documento por sí solo, y ese rol de "intermediario de confianza" está repartido entre varias entidades que no se comunican entre sí. Un registro público y verificable permite que cualquier tercero confirme autenticidad directamente, sin necesitar ese intermediario en cada consulta.

Una integración entre sistemas existentes tampoco serviría, porque supondría que todas las instituciones emisoras del mundo adoptaran el mismo sistema centralizado — exactamente lo que no ha ocurrido en décadas de este problema.

Supuestos y riesgos

Dos o tres supuestos que tendrían que ser ciertos para que la hipótesis funcione, y qué podría invalidarla. Extensión: 150–300 palabras.

Supuesto 1: que exista al menos una institución (o programa, como el propio BB101) dispuesta a actuar como emisor y registrar credenciales en el sistema. Es el supuesto más frágil: si ninguna institución real coopera dentro de las 5 semanas, el MVP tendrá que demostrarse con un emisor de prueba simulado, lo cual sigue siendo válido para el Functional Proof pero reduce el peso de la evidencia de adopción real en el Demo Day.

Supuesto 2: que la entidad evaluadora (o, en una etapa temprana, un empleador) acepte un registro verificable como evidencia complementaria útil, aunque no sea aún un reemplazo legal del trámite de convalidación oficial. Se invalidaría si el mercado objetivo insiste en que solo cuenta el papel sellado, sin ningún valor a una verificación digital adicional.

Supuesto 3: que el profesional migrante no necesite gestionar una wallet cripto para beneficiarse del sistema — el diseño actual solo exige wallet al emisor, no al titular ni al verificador. Se invalidaría si, al validar con usuarios reales en la semana 4, se descubre que el titular sí necesita alguna interacción directa con la red que no habíamos anticipado.

Lo que podría invalidar la hipótesis completa: que las entrevistas de la semana 4 muestren que el problema real no es la falta de un registro verificable, sino la lentitud de la evaluación de equivalencia académica en sí —algo que ningún registro en blockchain puede resolver, y que quedaría fuera del alcance de este proyecto.
