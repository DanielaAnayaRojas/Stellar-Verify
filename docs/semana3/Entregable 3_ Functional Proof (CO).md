**Entregable 3: Functional Proof**

**Descripción del entregable**

Esta semana el equipo construye el front (la parte visual) de su producto, es decir, cómo se ve y cómo la persona recorre la solución que diseñaron en el Product Blueprint. El trabajo es conjunto, vive en el mismo repositorio de GitHub de las semanas anteriores y debe quedar documentado para que cualquiera entienda cómo funciona.

Además, el equipo debe decidir esta semana cómo va a manejar la parte de contratos; ya sea creando contratos propios o usar una herramienta que ya ofrezca el ecosistema de Stellar. Esa decisión se registra en la documentación.

**Fecha límite: Domingo 11 de octubre, 8:00 p.m. hora Colombia, mediante la carga del repositorio a la plataforma Apex.**

**Qué tiene que hacer el equipo**

| Paso | Qué se hace |
| :---: | ----- |
| **1** | Construir el front del producto que es equivalente a las pantallas del flujo principal del MVP definido en el Blueprint. Se hace de manera conjunta y se organiza fuera de la carpeta de documentos del repositorio. |
| **2** | Decidir si van a crear contratos propios o a usar una herramienta del ecosistema, y dejarlo escrito (ver "Decisión técnica"). |
| **3** | Escribir la documentación grupal en docs/semana3/Documentacion.md explicando cómo funciona el front. |
| **4** | Dejar el README del repositorio con lo necesario para ejecutar el proyecto. |
| **5** | Verificar que cada integrante tiene al menos un commit propio en el repositorio esta semana. |
| **6** | Tener el repositorio en Apex antes de la fecha límite (solo se hace una carga) |

**Qué se entrega**

| Elemento | Qué se pide |
| :---: | ----- |
| **Front en el repositorio** | La interfaz del producto. Debe poder ejecutarse y verse, y mostrar el flujo principal del MVP del Blueprint. Es trabajo conjunto del equipo. |
| **Commit individual** | El mínimo es un commit propio por integrante dentro del repositorio, hecho durante la entrega. Es la evidencia de que cada persona participó. |
| **Documentación grupal (docs/semana3)** | Un único archivo del equipo, docs/semana3/Documentacion.md, que explica cómo funciona el front y registra la decisión técnica. No es un archivo por persona. |
| **README del repositorio** | Solo lo necesario para ejecutar el proyecto: requisitos, instalación y cómo correrlo. NADA MAS |

**Decisión técnica: contratos**

Esta semana el equipo solo deja escrito cómo lo va a hacer; elige una de las dos opciones y explica por qué en la documentación. No se escribe ni se despliega ningún contrato todavía, eso se hace la próxima semana

No hay una opción correcta, lo que se evalúa es que la decisión esté tomada y justificada.

| Opción | Qué significa | Qué debe quedar escrito en la documentación |
| :---: | ----- | ----- |
| **A. Contrato propio** | El equipo creará su propio contrato para la lógica de su producto. | Qué haría el contrato (qué necesita registrar o ejecutar en la red) y por qué hace falta uno propio. No se escribe código esta semana. |
| **B. Solución existente del ecosistema** | El equipo usará una plataforma, herramienta o servicio que ya ofrece el ecosistema de Stellar, sin crear un contrato propio. | Cuál usará, para qué lo necesita y por qué descartó crear un contrato propio. |

Esta decisión debe apoyarse en el uso de Stellar que el equipo definió en el Product Blueprint

**Contenido de docs/semana3/Documentacion.md**

El archivo se organiza en estas secciones, en este orden, para que la revisión sea comparable entre todos los equipos:

| Sección | Qué se pide | Extensión |
| :---: | ----- | ----- |
| **Front construido** | Qué pantallas o vistas se implementaron y cómo se conectan con el MVP del Blueprint. Incluir capturas de pantalla o un enlace al front funcionando en caso de estar hosteado el proyecto. | 400–2000 palabras |
| **Decisión técnica** | Opción elegida (A o B), por qué se decidió así y qué se descartó. Apoyado en el uso de Stellar del Blueprint. | 200–500 palabras |
| **Participación  del equipo** | Cada integrante con su usuario de GitHub y explicación de su aporte/responsabilidad en el entregable. | Breve |
| **Bloqueos y siguiente paso** | Qué quedó pendiente y cuál es el próximo paso hacia el MVP. | Breve |

**Contenido del README**

| Sección | Qué se pide |
| :---: | ----- |
| **Requisitos** | Qué se necesita tener instalado para correr el proyecto. |
| **Instalación** | Pasos para instalar las dependencias. |
| **Cómo correrlo** | Comando(s) para ejecutar el front y verlo funcionando. |

**Árbol de estructura**

| nombre-del-repo/ ├── docs/ │   ├── semana1/          ← Problem Brief (Módulo 1\) │   ├── semana2/          ← Product Blueprint (Módulo 2\) │   └── semana3/ │       └── Documentacion.md  ← documentación grupal (semana 3\) ├── frontend              ← front del producto (trabajo conjunto) └── README.md             ← solo cómo ejecutar el proyecto |
| :---- |

**Lista de verificación antes de entregar**

| Listo | Verificar |
| :---: | ----- |
| **☐** | El front está, se puede ejecutar y ver. |
| **☐** | Cada integrante tiene al menos un commit propio esta semana. |
| **☐** | docs/semana3/Documentacion.md tiene las cuatro secciones completas. |
| **☐** | La documentación dice qué opción de contratos se eligió (A o B) y por qué. |
| **☐** | El README explica requisitos, instalación y cómo correrlo. |
| **☐** | El repositorio está cargado en Apex antes del domingo 11 de octubre, 10:00 a.m. |

**Aclaraciones:** 

1. El entregable se evalúa como trabajo conjunto del equipo. El commit individual es el mínimo que muestra la participación de cada integrante.  
2. Si el front está hospedado en Vercel o en una plataforma similar, es necesario colocar ese enlace en el campo Website de Apex dentro del proyecto creado (ver imagen de abajo)

![][image1]

3. Recuerden que únicamente utilizaremos la red de testnet

4. Si el equipo considera que puede ir comenzando la implementación de los contratos para aligerar la entrega de la próxima semana, tiene la libertad de hacerlo. Sin embargo, no es obligatorio ni se evalúa esta semana. Además, recuerden que el martes tendremos una sesión donde terminaremos de ver cómo armarlos.

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAoMAAACXCAYAAAButlEqAAALYUlEQVR4Xu3b/7NXdZ3A8f4D7zX5dt2C0Q00uIApoMm3VTBYaQcDUghxW3MmXU1ZVhvXbWecWmu33Wwai5qyNN11pdA0zRRTywUl0DBE/LKKpobJ90kM2PK9vd/MOZ3P53A/94ssOPf9+OEx531e73PO58Nvzzmfy7uOOOKIAABAnt7VPAAAIB9iEAAgY2IQACBjYhAAIGNiEAAgY2IQACBjYhAAIGM9jsH29vqscGR7W20GAMA7X7cxuGXt9LD36ZmlCxe+r9xbd/eUhr3rrh6b5mNHDkrny5eOL6895cQh4cPT3xtGv3//3oHE6665fFRtXuz97aLhab3kguPK58bzdx/Zlr5X8z3RjnVn1P5NAADs1zIGN9w7tQyxaOh73l2ef+kfR3e5V8Rgdb+Iwerz7/vuKeGxOyc3zIoYrM4KMQbfeHJGw34Rg9Xrdm+YUbsXAIC6ljEYQytGXnW2/Gv73/bFveobuuiR5ZNSmBUx+MqqaeGhW05NewcrBl99ZFra/+c/Xld8DzEIANA33cZg86y6N/zYAQ2zqy5+fwq+IgaPOqqtfEZvYzBGZFQNzhiDezbODOPGDimfKwYBAPrubcXge44+smH2d58YEebMHFbGYJytv2dK+tvCE0YN6lUMXvLXw5Npk/6s3Cv+ZjCuf7v+Q+X3EIMAAH3TbQwuPn9EbRaPv3tqRvkTcGHXE/sDrRqDxT3xDV9vYrA6K1RjMHpzw/6/HxSDAAB90zIGLz5vf3zFN3QxuO6/+YNljI0cMTCtP7tkVNq7/RsTyr3mGJz6waPTeW9i8KTRgxvEveYYjGsxCADQdy1jMDprxtAyuh5eNjG0tf1p78Q/RloMr7gX/7PIoIHtad4cg1F8k9ibGGwW95pjMEaqGAQA6LtuYxAAgP5LDAIAZEwMAgBkTAwCAGRMDAIAZEwMAgBkTAwCAGRMDAIAZEwMAgBkTAwCAGRMDAIAZEwMAgBkTAwCAGRMDAIAZEwMAgBkTAwCAGRMDAIAZEwMAgBkTAwCAGRMDAIAZOyQxuCJHzihNgMA4PBpGYP/+vnPpuNbe3em45WfXhKu/bfPp/NnNjzWIO4vWjg/rZ996vF0zU/uvbN8Vjy/bdnN6fiZq65Is46OjnR99XlxXqy3v/5SuR48eHD4+HkLw5u7Xqt9LgAAfdMyBu//8Z0p2F596elwwtgxYdktN4b558wr47BZjMFi3dbWVl4X56//+oVyr/n+5vPC0uuubTiPMfjzVQ/WrgMAoG9axmB8M3fZpy4Knzj/vPCFa65Ob/yOPeaYFG+jO0eViutj9MU3eDEgv3/rTeHJdY+m+cABA9I9s86cUfuMqDcxuG7tytrnAgDQNy1jMEbaji2/Sus/7NlRRltX8VZ9M3jG9NMPeN0dt/1Xbd58XjhQDHozCACw39w5s8Oicxf0yKSJp9buj7qNwWoA9iYGq9d9dN5HwoP3312bd3VeEIMAAP+/uo3Bfbu3pvUbOzY3xODjax5uEOcxBovzeE013OJzbvz2N9IbxlU/W5Fm8efk4trqcwoHisH4PZo/FwCAvmkZgwfbKSdPqM0AADh8DmkMAgDwziIGAQAyJgYBADImBgEAMiYGAQAy1jIGOztHAgDQjzT3XssYBACgfxODAAAZE4MAABkTgwAAGRODAAAZE4MAABkTgwAAGRODAAAZE4MAABkTgwAAGRODAAAZE4MAABkTgwAAGRODAAAZE4MAABkTgwAAGRODAAAZO6QxOH78SbUZAACHT8sYfGvvznQcNmxoePF/ngwbnljdMG/2H9/9Vnjh2V+m9bq1K8vrThg7plx/5qorwq5tr9TuBQDg0OtRDDafN88Lq1c+0HBNsX5508bw4Vkza88BAODw6lUM/n7P9jBl8sQy9KrBF237zYvhf3+3Pa33vrElOdBzXnv5uTB3zuza5wEA0HOTJ00MZ0w/vUfGjO6s3R/1Kgbj+ZAhQ2rz6v53vvW1FIxLr7s2bHpufRg+/H1p/ufHHtNw3XHHjajdDwBAz8WXa4vOXdAjkyaeWrs/6nEMxv/8UZy3isGTJ4wPG9evSfW56mcrwl/O/FC4+87vhRX33HHA5wIAcPh0G4OPr3k47Nu9Na2L14vFvKqYV4/Lb70pXHrJhWkdf2JedsuNaW/hgrNrnwUAwKHXMgYPtqlTJoW2trbaHACAw+OQxiAAAO8sYhAAIGNiEAAgY2IQACBjYhAAIGMtY7CzcyQAAP1Ic++1jEEAAPo3MQgAkDExCACQMTEIAJAxMQgAkDExCACQMTEIAJAxMQgAkDExCACQMTEIAJAxMQgAkDExCACQMTEIAJAxMQgAkDExCACQMTEIAJAxMQgAkLFuY/Deu28Pb+3dGZ5+cm1ob29Ps907NydxXqyr86qOjo5w27Kbw+LLLi6fWVz/8qaN4bS/mFKbf2z+2eX9//3QvWHAgKNq3wsAgLevZQy+9PyGcNMN30zrGG0x/qr7zeddze+6Y1m44u8vq+1v2bwpTDttam2+aOH8sHb1T9P6yk8vqT0PAICDo2UMNkfYl7/0L2HggAFd7nc1fzsxOGjQoNrzAAA4OFrG4M6tL5friz55QXL00R3lrKtIa57HGIyzqjhvFYPVa4cOfW/tMwAAcjd50sRwxvTTe2TM6M7a/VHLGGyOuvg3fGPHjO5yv6t5V28G161dGRYuOLs2r74ZPNDzAAA4OFrG4OuvPh9uuP7raR3/88gf9uwIxx9/XLnfVaQ1z7uKwblzZod9u7em9by5Zx0wBmedOaP2PAAADo6WMRitXvlAirH4n0nGjTsxzao/4Raq9zSfdxWD0aWXXJjO1z76pzeB1Z+Jf3LfDxv+ThEAgIOn2xgEAKD/EoMAABkTgwAAGRODAAAZE4MAABkTgwAAGWsZg52dIwEA6Eeae69lDAIA0L+JQQCAjIlBAICMiUEAgIyJQQCAjIlBAICMiUEAgIyJQQCAjIlBAICMiUEAgIyJQQCAjIlBAICMiUEAgIyJQQCAjIlBAICMiUEAgIyJQQCAjLWMwbf27gzPbHgs/H7P9rQeOfL4NJ/9V7PS+Q9/sCwdPzrvIw33/Piu28Ke374eHlhxV5pt2bwpTDttasM18fiVL3+xXH/7m18t1x8/b2F4c9dr6bMLcb781pvKa6rPKa7Z/vpLYdtvXkzrwYMHN/xbAACo6zYGi/WECePK83hsa2urXffVr/x7GDJkSMO8vb29yxi8567lKRzjet+b2xpi8OerHmz4LlGMwRX33BFWr3yg4TmFpdddmwKz+T4AAA6sxzFYnMfYO9B8xIjhYffOzbVnRF3F4HNP/SLMOnNGOavG4Lq1K8PozlFJcV+MwfnnzCtjtPl7iEEAgN7pVQzGn4snTzo1/RRbnf/6V8+kn4qbry90FYPxefEYw27toz9N1w0YcFSKwfgZt3//P5PivhiDF33ygiT+FNz8eWIQAMjJFZcvDtd87uoemTtndu3+qFcxWJx3NV/zyEMN8xhy4076QHrLt3DB2bXri+MXv/C5cP7fLArrf/FoOHnC+JY/E8cQLO5t/h5iEACgd3oUgx0dHeGFZ38ZNq5fk853bXslXHXl5Wm9ZPGnwhs79v88PGzY0PCd65emdYzA4v5Yovt2b03reXPPqsVgcbzvRz8I537snB7FYPGfWKr7YhAAoHe6jcHouY3rwuLLLm7Ye/apx9Pe88880TB/5OH7y/mggQPL+aWXXJjm8efg6vOrxxuu/3q4+p/+IcVg8dmFuF+Nwep9BTEIANA7LWMQAID+TQwCAGRMDAIAZEwMAgBkTAwCAGRMDAIAZKxlDHZ2jgQAoB9p7r2WMQgAQP8mBgEAMiYGAQAyJgYBADImBgEAMiYGAQAyJgYBADL2f/nsRbyoBtETAAAAAElFTkSuQmCC>