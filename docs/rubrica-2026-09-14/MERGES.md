# Integración Git de la rúbrica

Este ciclo usa `test/rubrica-q10-90` hacia `evidencia/sonarqube-comparacion`
en ambos repositorios. No cambia `main` ni los repositorios upstream.

| Repositorio | Pull request | Commit de código y pruebas | Commit inicial de evidencia |
|---|---|---|---|
| Frontend | https://github.com/SantiagoAlcaraz1101/lamorada_front/pull/4 | 1d5eff8 | 7d73b78 |
| Backend | https://github.com/SantiagoAlcaraz1101/la-morada-back/pull/4 | 14d31ff | ec3960b |

El estado y SHA definitivo del merge se consultan en cada PR. La integración
debe usar merge commit (dos padres), no squash, para conservar la secuencia.
Las bases anteriores son frontend `63114e434cd633b80d507b837e0a28042b13e44c`
y backend `7cb440f76da8e2717d939a10c38185dfd30e4c0c`.

El análisis final es `9b976abe-66fc-438b-859a-b1178d16d4fd`. Sus 67 archivos
productivos se verifican contra Sonar antes de publicar y contra el árbol del
merge después. Los commits posteriores de documentación no cambian ese código.
El recibo local del cierre se guarda en
`quality/evidence/rubrica-2026-09-14/MERGES_VERIFICADOS.json` del workspace.

Para la exposición, abrir Files changed y Commits de cada PR; contrastar las
instantáneas JSON antes/después con RESULTADOS.md. Los porcentajes describen
el análisis conjunto, no dos porcentajes independientes de frontend y backend.
