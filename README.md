# Cypress 

**Tema**: Implementación de Pruebas Automatizadas para Plataforma de Seguimiento GPS
    Dentro de este proyecto se contiene toda la informacion generada para la Prueba 
    tecnica y esta Organizada de la sigueinte manera

## Estructura
```
cypress-tech-avl/
├─ cypress.config.js
├─ package.json
├─ README.md
└─ cypress/
   ├─ e2e/
   │  └─ auth/
   │     └─ login.cy.js
   │     └─ map001.cy.js
   │     └─ map002.cy.js
   │     └─ map002.cy.js
   ├─ fixtures/
   │  └─ users.json
   ├─ pages/
   │  └─ LoginPage.js
   │  └─ DashboardPage.js
   └─ support/
      ├─ pages/
      │  └─ locationApiPage.js
      │  └─ mapPage.js
      ├─ commands.js
      └─ e2e.js
└─ doc/
   └─ planPruebas.md
└─ jmeter/
   └─ techAVL-perf.jmx
└─ postman/
   └─ collection.json
   └─ environment.json
```

## Ejecución
```
cypress
  npx cypress run
  npx cypress run --spec "cypress/e2e/auth/login.cy.js"  // solo es funcional este caso, los demas son solo estructuracion
  start cypress\\reports\\html\\index.html

Postman
  \postman> newman run techavl_collection.json -e techavl_environment.json -r htmlextra
  Reporte en /postman/newman

jmeter
  \jmeter> jmeter -n -t techAVL-perf.jmx -l results.jtl -e -o ./report
  Reporte jmeter/report

casandra: Cree un mock con el fin de explicar el funcionamiento
  \cassandra> python kafka_cassandra_sim.py --mock --limit 20 --vehicle-id 123ABC 
```










