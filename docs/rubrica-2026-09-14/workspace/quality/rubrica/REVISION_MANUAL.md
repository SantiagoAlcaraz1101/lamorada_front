# Registro de revisión manual y visual

Revisión asistida realizada el 14 de septiembre de 2026 en el navegador integrado, sobre el frontend local en http://127.0.0.1:4201. No se atribuye ejecución a los estudiantes ni al profesor. Solo se registran aquí observaciones realmente efectuadas; las suites automáticas tienen su propia evidencia.

## Observaciones ejecutadas

| ID | Pasos y condición | Esperado | Observado | Estado |
|---|---|---|---|---|
| M01 | Abrir /product e identificar el campo de búsqueda | Etiqueta asociada y nombre accesible | El navegador identifica textbox «Buscar por título», asociado al label | Verificado |
| M02 | Inspeccionar control Buscar después del cambio de estilo | Texto distinguible sobre fondo morado oscuro | Se cambió el gradiente; la regla de contraste de Sonar ya no informa issue | Verificación estática complementaria; no auditoría WCAG completa |
| M03 | Con API localhost:3000 no disponible, cargar catálogo e intentar buscar un texto sintético | El fallo asíncrono debe verse sin otro clic | Antes: consola registraba fallo y no aparecía el mensaje. Después de añadir markForCheck y recargar: se muestra «Failed to fetch» y estado sin productos | Corregido y reobservado; prueba de plantilla añadida |
| M04 | Navegar mediante Entrar y observar formulario vacío | No enviar credenciales vacías | Botón Entrar deshabilitado, isEnabled=false | Verificado |
| M05 | Abrir panel Sonar desde navegador sin sesión | Pedir autenticación, sin acceso anónimo no autorizado | Formulario de inicio de sesión de Sonar | Verificado; captura autenticada pendiente |

Las capturas catalogo-error-visible.png y login-vacio.png están en la carpeta manual. M03 conserva un mensaje en inglés procedente del transporte; no se afirma que la redacción final de todos los mensajes sea adecuada. La prueba se hizo con API no disponible y no certifica búsqueda integrada exitosa.

## Revisión de código y cálculos

METRICAS_MANUALES.md contiene el grafo, aristas, fórmulas, conteos, comparación y conclusiones. El script manual-metrics.cjs se etiqueta como comprobación asistida; no representa a un humano contando todas las líneas. El inventario permite que el equipo repita los cálculos y contraste las convenciones con el profesor.

## Recorridos preparados para aceptación del equipo

Estos casos NO se marcan como ejecutados manualmente en este ciclo. Deben realizarse con API y datos sintéticos de un ambiente aislado, anotando fecha, ejecutor y captura. Algunas de sus reglas ya tienen cobertura automática, lo cual no reemplaza el recorrido completo.

| Caso | Pasos resumidos | Resultado a contrastar | Estado |
|---|---|---|---|
| A01 Identidad | Registrar paciente, entrar y salir; intentar reutilizar sesión | Identidad correcta y token revocado | Pendiente manual; API cubierta |
| A02 Registro profesional | Solicitar registro como psicólogo y revisar rol persistido | Acordar flujo autorizado para crear profesionales | Brecha conocida: se almacena patient |
| A03 Perfil paciente | Cambiar campos permitidos y consultar de nuevo | Datos conservados, sin cambio de identidad | Pendiente manual; API y componente cubiertos |
| A04 Perfil profesional | Guardar formulario con especialidad | Resolver contrato de specialty entre UI y API | Brecha conocida; no se declara aceptado |
| A05 Citas | Crear, listar, cambiar estado y cancelar; repetir con usuario ajeno | Acceso limitado a los participantes y estados autorizados | Pendiente manual; regresión automática conservada |
| A06 Publicaciones | Crear como psicólogo, consultar; actualizar/eliminar solo como autor | Persistencia y autorización; aclarar reglas de longitud | Pendiente manual; pruebas de servicios/API/componentes según alcance |
| A07 Carrito | Agregar, consultar, disminuir, retirar y vaciar | Total y contenido coherentes; mensaje ante fallo | Pendiente manual; componentes y persistencia cubiertos |

## Cómo presentar evidencia sin confusiones

No registrar una captura nueva como si fuera de antes. La instantánea anterior está preservada en JSON con su análisis y revisiones Git; la comparación visual de Sonar requiere iniciar sesión. No se generaron imágenes ficticias de su dashboard. No usar datos reales de pacientes ni eliminar cuentas reales para la demostración.
