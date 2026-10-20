# Evaluación UX: Nielsen, accesibilidad, interfaz e IA

## Método y atribución

Recorridos revisados: entrar, fallar al entrar, buscar, no encontrar un libro,
agregar/aumentar/eliminar del carrito, intentar acceder sin sesión y con rol
insuficiente; además inicio, registro, recuperación, perfiles y publicaciones.
Desktop: Chrome 154, 1280×800. Móvil simulado: 375×812. Es viewport emulado,
no prueba en un teléfono físico. Axe-core 4.14.0 para WCAG 2.1 A/AA.

La IA de esta sesión de Codex analizó código, capturas y resultados de ejecución.
No se suministraron datos reales de pacientes. El identificador exacto del modelo
no está exportado en los artefactos. Los resultados de IA son hipótesis/prioridades;
se contrastan abajo con evidencia técnica y quedan pendientes de revisión humana
del equipo. Una segunda revisión automática no se presenta como revisión humana.

Prompt reproducible de la revisión de IA:

> Revisa los recorridos de La Morada y las capturas de inicio, registro, login,
> catálogo y carrito. Evalúa las diez heurísticas de Nielsen y accesibilidad.
> Para cada hallazgo indica ubicación, pasos para reproducir, evidencia,
> severidad 0–4, impacto, recomendación y estado. Distingue lo observado de
> hipótesis; contrasta con código y pruebas. No inventes participantes ni métricas.

Escala del proyecto: 0 sin problema observado; 1 molestia menor; 2 dificulta una
tarea pero existe salida; 3 afecta significativamente un recorrido o acceso;
4 impide una tarea esencial sin alternativa. La severidad es una valoración
propuesta por IA, no una medida objetiva ni el impacto técnico de un CVE.

## Diez heurísticas y hallazgos verificables

| ID / heurística | Hallazgo IA, pasos y evidencia | Severidad propuesta | Revisión técnica y recomendación | Corrección / comprobación | Revisión del equipo |
|---|---|---:|---|---|---|
| H01 Visibilidad del estado | Visitar carrito: el BehaviorSubject vacío marcaba loading=false antes de recibir HTTP. En inicio, la suscripción prometía correos aunque subscribe no llamaba una API. Fuentes cart.component.ts y home.component.ts. | 3 | Confirmado en código. Mantener Cargando hasta respuesta y dar información honesta sobre disponibilidad. | Corregido; COMP-07/08 y REG-05. La newsletter aún no envía correos y ahora lo informa. | Pendiente |
| H02 Correspondencia con lenguaje y contexto | Buscar libro QA: catálogo usaba USD; carrito y checkout usan COP. El atributo lang decía en aunque la UI es española. Fuente product.component.html e index.html, captura A11Y-03 antes. | 2 | Confirmado. Mostrar moneda consistente y declarar idioma correcto. | Catálogo COP e idioma es; UI-02/A11Y-08. | Pendiente |
| H03 Control y libertad | SP-04 permite eliminar y SP-01 salir. Disminuir desde 1 elimina la línea y no ofrece deshacer. Fuente cart.component.ts, dec. | 2 | Confirmado por código y recorrido. Añadir deshacer o advertencia contextual para evitar eliminación accidental. | Eliminar/salir verificados; mejora de deshacer propuesta, no implementada. | Pendiente |
| H04 Consistencia y estándares | La marca visible LaMorada tenía aria-label Ir al inicio que omitía el texto visible. A11Y-01–07/10 antes: label-content-name-mismatch. | 2 | Confirmado por axe. Incluir el nombre de la marca en la etiqueta accesible. | LaMorada: ir al inicio en header/footer; auditorías posteriores. | Pendiente |
| H05 Prevención de errores | El login inválido bloqueaba Entrar sin ayuda explícita. En registro, placeholder del documento tenía contraste insuficiente. A11Y-04 antes: color-contrast. | 2 | Añadir ayuda asociada al correo y contraste; mantener validación frontend/backend. | Ayuda de correo, aria-invalid, selector más oscuro; REG-02/COMP-01 y A11Y-04. Validación detallada de todos los campos de registro: seguimiento. | Pendiente |
| H06 Reconocimiento de controles | Dos botones de contraseña tenían solo iconos aria-hidden. A11Y-04 antes: button-name con dos nodos. | 3 | Confirmado. Asignar nombres que cambien entre Mostrar/Ocultar. | Dos aria-label dinámicos y aria-pressed; A11Y-04. | Pendiente |
| H07 Eficiencia y flexibilidad | Sin salto al contenido ni autocomplete de login. A11Y-08/09 fallaron en before-valid. | 2 | Acceso al contenido, autofill y foco visible reducen esfuerzo repetido. | Skip link, main enfocable, autocomplete y focus-visible; A11Y-08/09. | Pendiente |
| H08 Diseño y lectura | Inicio móvil desbordaba: primero 430 vs clientWidth 360; diagnóstico posterior localizó newsletter y tarjetas destacadas. Capturas UI-01 diagnósticas. | 3 | No ocultar el fallo con overflow:hidden: ajustar mínimos del input, envoltura del formulario y arte decorativo. | Ajustes CSS; UI-01 final: clientWidth=360 y scrollWidth=360, viewport 375×812 con barra de desplazamiento. Captura revisada, sin desbordamiento horizontal del documento. | Pendiente |
| H09 Recuperación de errores | Credenciales incorrectas y HTTP 503 tienen texto visible; recuperación de contraseña no tenía región viva para su resultado. | 2 | Mantener mensajes claros y anunciados; comprobar recuperación real tras error. | role=alert/status; SP-02, REG-03, COMP-03/06. Recuperación: sin envío externo en pruebas. | Pendiente |
| H10 Ayuda y documentación | Footer enlaza privacy/terms sin rutas específicas y la UI no tiene ayuda de uso. Fuente app.routes.ts/footer.component.html. | 2 | Confirmado por inspección de rutas. Añadir ayuda contextual y páginas reales de términos/privacidad revisadas por los responsables. No inventar textos legales. | Recomendación pendiente. La documentación técnica entregada no equivale a ayuda del usuario dentro del sitio. | Pendiente |

## Evidencia de accesibilidad antes/después

`evidence/before-valid/A11Y-*.json` guarda los nodos, selectores, HTML, impacto,
regla y ayuda. Hallazgos automáticos iniciales: button-name (2 controles),
color-contrast (selector de documento), label-content-name-mismatch (marca).
El idioma incorrecto y ausencia de autocomplete/salto son verificaciones
adicionales del código/recorrido; axe no basta para detectarlos todos.

La fase before permite recoger violaciones sin exigir cero; que un audit de
diagnóstico salga passed no significa que la página fuera conforme. A11Y-08/09
fallaron antes. La primera carpeta evidence/before tiene un error del arnés axe
y no constituye evidencia válida de hallazgos del producto.

La fase after exige cero violaciones A/AA detectadas. Los JSON conservan reglas
aprobadas y violaciones, junto a capturas y video. A11Y-10 examina carrito con
producto, y A11Y-09 login con error. Perfiles/publicaciones se evalúan en el estado
que muestre la fixture; no implica cobertura de todos sus posibles contenidos.

Pendiente humano: recorrido íntegro con Tab/Shift+Tab/Enter/Espacio, lector de
pantalla, zoom 200%/400%, reflow a 320 px, foco tras navegación, comprensión,
dispositivo físico y cobertura de otros estados. La prueba automatizada de foco
usa .focus() y activa el enlace; no simula por sí sola una sesión manual de teclado.

## Contraste que debe completar el equipo

1. Un integrante revisa las capturas before/after y reproduce al menos login,
   búsqueda, carrito y móvil. No copiar automáticamente las conclusiones de IA.
2. Para cada H01–H10 registra Acepta/Rechaza/Ajusta y su motivo; si cambia severidad,
   explica impacto y frecuencia observada.
3. Revisa las correcciones y agrega evidencia propia (fecha, responsable, ruta,
   captura/registro). Si detecta otro problema, crea ID nuevo y prueba de reproducción.
4. Completa el acta siguiente. Hasta entonces, la revisión del equipo sigue pendiente
   y este entregable no acredita por sí solo todo el nivel Alto del criterio 3.

| Campo | Registro humano |
|---|---|
| Responsable e integrantes | Pendiente |
| Fecha y navegador/dispositivo | Pendiente |
| Hallazgos aceptados | Pendiente |
| Hallazgos rechazados y motivos | Pendiente |
| Severidades ajustadas y razones | Pendiente |
| Evidencias de teclado, lector, zoom y recorridos | Pendiente |
| Verificación de correcciones y prioridades pendientes | Pendiente |

Referencias: [heurísticas originales de Nielsen](https://www.nngroup.com/articles/ten-usability-heuristics/),
[WCAG 2.1](https://www.w3.org/TR/WCAG21/) y [alcance de axe-core](https://github.com/dequelabs/axe-core).
