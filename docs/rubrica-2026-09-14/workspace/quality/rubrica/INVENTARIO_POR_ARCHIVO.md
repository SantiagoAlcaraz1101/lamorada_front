# Comparación independiente por archivo

Este inventario es un cálculo asistido sobre código Git anterior y código final, no una ejecución manual de cada algoritmo. La revisión razonada está en METRICAS_MANUALES.md. Se incluyen los 51 JS/TS; los 16 HTML/CSS permanecen dentro del análisis Sonar global. V incluye funciones, callbacks, decisiones y cortocircuitos, también a nivel superior.

| Archivo | LOC local antes/después | LOC Sonar antes/después | V local antes/después | V Sonar antes/después | Ce antes/después |
|---|---:|---:|---:|---:|---:|
| backend/src/middlewares/jwt-middleware.js | 37/37 | 37/37 | 6/6 | 6/6 | 3/3 |
| backend/src/middlewares/rate-limit-middleware.js | 8/8 | 8/8 | 2/2 | 2/2 | 1/1 |
| backend/src/middlewares/role-middleware.js | 19/19 | 19/19 | 4/4 | 4/4 | 1/1 |
| backend/src/modules/appointment/appointment-controller.js | 51/51 | 51/51 | 7/7 | 7/7 | 3/3 |
| backend/src/modules/appointment/appointment-routes.js | 10/10 | 10/10 | 0/0 | 0/0 | 4/4 |
| backend/src/modules/appointment/appointment-service.js | 110/110 | 110/110 | 33/33 | 33/33 | 5/5 |
| backend/src/modules/appointment/models/appointment.js | 18/18 | 18/18 | 0/0 | 0/0 | 1/1 |
| backend/src/modules/auth/auth-controller.js | 41/41 | 41/41 | 4/4 | 4/4 | 3/3 |
| backend/src/modules/auth/auth-routes.js | 8/8 | 8/8 | 0/0 | 0/0 | 4/4 |
| backend/src/modules/auth/auth-service.js | 36/36 | 36/36 | 5/5 | 5/5 | 4/4 |
| backend/src/modules/auth/strategies/jwt-strategy.js | 32/32 | 32/32 | 5/5 | 5/5 | 2/2 |
| backend/src/modules/auth/strategies/password-strategy.js | 22/22 | 22/22 | 2/2 | 2/2 | 1/1 |
| backend/src/modules/auth/validators/auth-validator.js | 38/38 | 38/38 | 9/9 | 9/9 | 2/2 |
| backend/src/modules/availability/models/availability.js | 10/10 | 10/10 | 0/0 | 0/0 | 1/1 |
| backend/src/modules/cart/cart-controller.js | 55/55 | 55/55 | 5/5 | 5/5 | 4/4 |
| backend/src/modules/cart/cart-routes.js | 9/9 | 9/9 | 0/0 | 0/0 | 3/3 |
| backend/src/modules/cart/cart-service.js | 56/56 | 56/56 | 15/15 | 15/15 | 3/3 |
| backend/src/modules/cart/models/cart.js | 12/12 | 12/12 | 0/0 | 0/0 | 1/1 |
| backend/src/modules/cart/validators/cart-validator.js | 12/12 | 12/12 | 6/6 | 6/6 | 1/1 |
| backend/src/modules/post/models/post.js | 9/9 | 9/9 | 0/0 | 0/0 | 1/1 |
| backend/src/modules/post/post-controller.js | 60/60 | 60/60 | 5/5 | 5/5 | 4/4 |
| backend/src/modules/post/post-routes.js | 11/11 | 11/11 | 0/0 | 0/0 | 4/4 |
| backend/src/modules/post/post-service.js | 48/48 | 48/48 | 14/14 | 14/14 | 3/3 |
| backend/src/modules/post/validators/post-validator.js | 16/16 | 16/16 | 9/9 | 9/9 | 1/1 |
| backend/src/modules/product/models/product.js | 13/13 | 13/13 | 0/0 | 0/0 | 1/1 |
| backend/src/modules/user/models/user.js | 17/17 | 17/17 | 0/0 | 0/0 | 1/1 |
| backend/src/modules/user/user-controller.js | 81/81 | 81/81 | 13/13 | 13/13 | 3/3 |
| backend/src/modules/user/user-routes.js | 14/14 | 14/14 | 0/0 | 0/0 | 4/4 |
| backend/src/modules/user/user-service.js | 92/92 | 92/92 | 26/26 | 26/26 | 8/8 |
| backend/src/modules/user/validators/user-validator.js | 19/19 | 19/19 | 13/13 | 13/13 | 0/0 |
| frontend/src/app/auth/sign-in/sign-in.component.ts | 60/60 | 60/60 | 17/17 | 17/17 | 7/7 |
| frontend/src/app/auth/sign-up/sign-up.component.ts | 178/178 | 178/178 | 55/55 | 55/55 | 6/6 |
| frontend/src/app/core/interceptors/auth.interceptor.ts | 41/41 | 41/41 | 10/10 | 10/10 | 4/4 |
| frontend/src/app/core/state/auth-state.service.ts | 50/50 | 50/50 | 12/12 | 12/12 | 3/3 |
| frontend/src/app/core/utils/jwt.ts | 20/20 | 20/20 | 6/6 | 6/6 | 0/0 |
| frontend/src/app/guards/auth-role.guard.ts | 32/32 | 32/32 | 13/13 | 13/13 | 3/3 |
| frontend/src/app/guards/client-only.guard.ts | 7/7 | 7/7 | 1/1 | 1/1 | 3/3 |
| frontend/src/app/layout/header/header.component.ts | 36/36 | 36/36 | 5/5 | 5/5 | 6/6 |
| frontend/src/app/models/appointment.model.ts | 11/11 | 11/11 | 0/0 | 0/0 | 0/0 |
| frontend/src/app/models/availability.model.ts | 6/6 | 6/6 | 0/0 | 0/0 | 0/0 |
| frontend/src/app/models/cart.models.ts | 16/16 | 16/16 | 0/0 | 0/0 | 0/0 |
| frontend/src/app/pages/appointment/appointment.component.ts | 326/326 | 326/326 | 133/133 | 133/133 | 8/8 |
| frontend/src/app/pages/cart/cart.component.ts | 101/95 | 101/95 | 47/43 | 47/43 | 4/4 |
| frontend/src/app/pages/post/post-editor.component.ts | 201/201 | 201/201 | 63/63 | 63/63 | 7/7 |
| frontend/src/app/pages/product/product.component.ts | 114/119 | 114/119 | 24/24 | 24/24 | 6/6 |
| frontend/src/app/pages/profile-edit/profile-edit.component.ts | 199/199 | 199/199 | 73/73 | 73/73 | 7/7 |
| frontend/src/app/services/appointment.service.ts | 22/22 | 22/22 | 9/9 | 9/9 | 5/5 |
| frontend/src/app/services/availability.service.ts | 54/54 | 54/54 | 26/26 | 26/26 | 7/7 |
| frontend/src/app/services/cart.service.ts | 70/70 | 70/70 | 17/17 | 17/17 | 5/5 |
| frontend/src/app/services/post-api.service.ts | 55/55 | 55/55 | 19/19 | 19/19 | 6/6 |
| frontend/src/app/services/user.service.ts | 157/157 | 157/157 | 82/82 | 82/82 | 7/7 |

Los recuentos coinciden en este corpus. Esa coincidencia no convierte Ce en una métrica nativa de Sonar ni garantiza que el contador local soporte todos los lenguajes o construcciones posibles. Sonar cuenta también complejidad de código incrustado en plantillas; por eso no se compara la suma JS/TS con todo el proyecto sin separar esos archivos.
