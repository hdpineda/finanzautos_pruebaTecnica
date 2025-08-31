Plan de Pruebas – TechAVL

Plataforma: Seguimiento GPS en tiempo real (web React + API .NET + data lake Kafka/Cassandra)
Entorno de trabajo: VSCode + Cypress (frontend), Postman/Newman y JMeter (backend), Python (kafka-python, cassandra-driver) para datos.
Fuente del caso y lineamientos generales:

1) Alcance y objetivos

    Objetivo: validar end-to-end que TechAVL muestra ubicación en tiempo real, persiste datos de telemetría y responde a reglas de negocio (ej. velocidad) con calidad, rapidez (<1s en API crítica) y confiabilidad de datos.

    Componentes cubiertos: Frontend web (React), API /api/location, canal Kafka “telemetry”, Cassandra (keyspace techavl_tracking).

    Fuera de alcance: seguridad avanzada, pruebas móviles profundas (solo se documenta regla de velocidad), estrés masivo. (Se deja base en JMeter para 50–200 RPS).

2) Supuestos y entornos

    URLs de prueba (staging)

    Web: https://staging.techavl.com

    API: https://api-staging.techavl.com

    Endpoint crítico: POST /api/location (body: { "vehicleId":"123ABC","lat":40.41,"lng":-3.70 }, SLI: status=200, esquema JSON válido, SLO: p95 < 1s).

    Datos de ejemplo: vehicleId alfanumérico (6–10), coordenadas válidas (WGS84), timestamps ISO-8601.

    Kafka: tópico telemetry.gps.raw (clave: vehicleId).

    Cassandra: keyspace techavl_tracking, tabla gps_points(vehicle_id, ts, lat, lng) con PK (vehicle_id, ts).

3) Estrategia de pruebas

    Capas y herramientas

    Frontend (Cypress): smoke + regresión ligera + UI/UX crítica del mapa; stubbing opcional de /api/location y pruebas con datos reales en staging.

    API (Postman/Newman + JMeter): funcional/contrato, validaciones de esquema, límites, idempotencia básica; rendimiento p95 con JMeter (rampa 1→50 RPS, 5 min).

    Datos (Python + kafka-python + cassandra-driver): integración E2E de ingesta → persistencia; consistencia y orden temporal; reconciliación básica (conteo y últimas coordenadas por vehicleId).

    Tipos de pruebas: Smoke, Funcionales, Integración (UI-API-Kafka-Cassandra), Datos, No-funcionales (tiempo de respuesta, throughput básico).

    Criterio de “Definition of Ready”: endpoints de staging accesibles, credenciales/ACL de Kafka/Cassandra, datos semilla.

    Criterio de “Definition of Done”: suites verdes (≥95%), p95 API <1s en endpoint crítico, ≥99% de puntos escritos en Cassandra para batch de prueba.

4) Priorización (riesgo x impacto)

    P0 (bloqueante): flujo crítico mapa en tiempo real; API /api/location happy-path; persistencia Kafka→Cassandra.

    P1 (alto): validación de esquema/errores 4xx/5xx; reglas de negocio (exceso de velocidad); tolerancia a duplicados.

    P2 (medio): resiliencia ante datos límite, UI secundaria (filtros, paginación histórico), métricas y logs.

    ID	Funcionalidad crítica	                                Motivo	                                                    Prioridad
    F1	Visualizar ubicación en tiempo real en el mapa	        Es la propuesta de valor del producto y cara al usuario    	P0
    F2	API /api/location responde 200, JSON válido, p95<1s	    Punto de entrada de la telemetría; SLO de rendimiento	    P0
    F3	Almacenar datos GPS en Cassandra tras Kafka	            Garantiza reportes/consultas; evita pérdida de datos	    P0
    F4	Regla: alerta por exceso de velocidad	                Cumplimiento de negocio y seguridad	                        P1



5) Casos de prueba (resumen ejecutivo)
    5.1 Frontend (Cypress, VSCode)

        MAP-001 (P0) – Mostrar marcador al buscar vehicleId

            Dado app en staging.techavl.com

            Cuando ingreso 123ABC y presiono “Mostrar”

            Entonces se dibuja un marcador y el panel lateral muestra lat/lng recientes (±5s del server time).

            Criterios de aceptación: marcador visible, coordenadas formateadas, no hay errores en consola.

        MAP-002 (P1) – Actualización en tiempo real

            Inyecto dos ubicaciones (API) con 5s de diferencia.

            Expectativa: el marcador se mueve en ≤2s tras cada publicación (polling/websocket según app). p95 ≤2s.

        MAP-003 (P2) – Validación de vehicleId inválido

            con caracteres no permitidos o inexistente → mensaje “Vehículo no encontrado” (sin marcador).

    5.2 API (Postman/Newman + JMeter)

        API-001 (P0) – Happy path /api/location

            POST con body válido.

            Aceptación: 200, Content-Type: application/json, body con status:"ok", responseTime < 1000 ms (p95).

        API-002 (P1) – Validación de esquema

            Faltan lat o lng → 400 y mensaje claro.

            Rango inválido lat>90 → 422.

        API-003 (P1) – Idempotencia básica

            Reenvío del mismo payload (mismo ts) → 200 y no crea duplicado lógico en DB (verificación por Python).

        PERF-001 (P1) – Carga moderada

            JMeter 1→50 RPS, 5 min, think time 100–300 ms.

            Aceptación: error rate <1%, p95 <1s, p99 <1.5s.

    5.3 Datos (Python + Kafka + Cassandra)

        DATA-001 (P0) – Publicación en Kafka y consumo

            Producer publica 100 mensajes para 123ABC.

            Consumer (grupo qa_e2e) los lee en ≤5s.

            Aceptación: 100/100 consumidos, orden por ts no descendente.

        DATA-002 (P0) – Persistencia en Cassandra

            Inserción/Upsert en gps_points.

            Aceptación: conteo=100 para vehicle_id="123ABC", última coordenada coincide con la más reciente del tópico.

        DATA-003 (P1) – Reconciliación UI-DB

            Coordenada mostrada en mapa = última fila en Cassandra ± tolerancia temporal; si no, fallo.

        BUS-001 (P1) – Regla de exceso de velocidad

            Serie con velocidades: 30, 85, 40 km/h.

            Aceptación: se marca evento “speeding=true” (flag en mensaje/DB o alerta mockeada).

            

6) Criterios de aceptación (globales)

    Funcional:

    Mapa muestra marcador y se actualiza con la última ubicación disponible del vehículo.

    API /api/location: 200 + JSON válido para payloads correctos; errores claros para inválidos.

    Kafka→Cassandra: eventos íntegros (sin pérdida) y consistentes con últimos datos en UI.

    Rendimiento: /api/location p95 < 1s bajo 50 RPS sostenidos (staging).

    Calidad de datos: 100% de mensajes de prueba llegan a Cassandra; sin duplicados por (vehicle_id, ts).

    Observabilidad: logs sin errores críticos; métricas básicas (latencias p50/p95, tasa de consumo).

7) Criterios de entrada/salida

    Entrada: endpoints accesibles, credenciales Kafka/Cassandra, dataset semilla, variables .env configuradas.

    Salida: suites verdes (≥95%), métricas de JMeter adjuntas, reporte de ejecución (HTML) y video 3–5 min.

8) Matriz de trazabilidad (resumen)
    Requisito	                Caso(s)	                Evidencia
    Mapa muestra ubicación	    MAP-001, MAP-002	    screenshot Cypress
    API responde y es rápida	API-001, PERF-001	    Reporte Newman/JMeter
    Persistencia de datos	    DATA-001, DATA-002	    Logs consumer + query Cassandra
    Regla velocidad	            BUS-001	                Log de evento/flag en DB

9) Entregables (según solicitud)

Repositorio Git público: con scripts y README para reproducir.

