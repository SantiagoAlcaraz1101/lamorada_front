# La Morada — frontend local

Aplicación web Angular de La Morada, conectada a la API local para el proyecto educativo de validación y verificación de software.

## Requisitos

- Node.js 20 o superior
- Backend La Morada activo en `http://localhost:3000`

## Inicio rápido

1. En el backend, inicia la infraestructura, carga los datos y levanta la API.
2. En esta carpeta, ejecuta `npm install`.
3. Inicia la aplicación con `npm start`.
4. Abre `http://localhost:4200`.

Las configuraciones de desarrollo y producción local usan `http://localhost:3000` como `API_BASE`. No se mantienen copias paralelas del carrito en el navegador: el backend es la fuente de verdad.

## Usuarios de demostración

| Rol | Correo | Contraseña |
|---|---|---|
| Psicóloga | `psicologa@lamorada.test` | `Morada123!` |
| Paciente | `paciente@lamorada.test` | `Morada123!` |

## Verificación

- `npm test -- --watch=false --browsers=ChromeHeadless`: ejecuta las 24 pruebas del frontend.
- `npm run build`: genera la aplicación SPA optimizada en `dist/front-lamorada`.
- `npm audit --omit=dev`: revisa las dependencias utilizadas en producción.

El flujo de pago es deliberadamente simulado para uso educativo. La interfaz solo presenta la marca y los últimos cuatro dígitos de la tarjeta guardada.