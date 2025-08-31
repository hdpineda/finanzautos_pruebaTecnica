// cypress/e2e/dashboard/map-001.cy.js
const loginPage = require('../../pages/LoginPage');
const dashboardPage = require('../../pages/DashboardPage');
import { MapPage } from '../support/pages/mapPage';
import { LocationApiPage } from '../support/pages/locationApiPage';

//the-internet.herokuapp.com pagina web de prueba que permite validar diferentes funcionalidades
describe('Actualización en tiempo real', () => {
    const map = new MapPage();
    const api = new LocationApiPage();
    const firstFix = { vehicleId: '123ABC', lat: 40.4100, lng: -3.7000, ts: '2025-08-31T12:00:00Z' };
    const secondFix = { vehicleId: '123ABC', lat: 40.4150, lng: -3.6950, ts: '2025-08-31T12:00:05Z' };
    // definir los fixes simulados

    beforeEach(() => {
        cy.clock(); // congelar timers (polling de 1s, etc.)
        api.stubPolling({
        firstFix,
        secondFix,
        switchAfterCalls: 6, // 5s con polling de 1s => en la 6ª respuesta cambia
        delayMs: 150
        });
    }); // configurar el stub de la API

  it('simulacion de movimiento', () => {
    // Login y búsqueda inicial
    cy.fixture('users').then(users => {
      loginPage.visit();
      loginPage.login(users.User.username, users.User.password);
    });
    dashboardPage.IngresarDatos('ABC123');
    dashboardPage.ValidarDatos();
    
    // Primer ciclo de polling: dibuja primer fix
    cy.tick(1000);          // avanza 1s simulados
    cy.wait('@pollLast');
    map.expectMarkerCloseTo({ lat: firstFix.lat, lng: firstFix.lng });

    // Dejar pasar "5s" (simulados) para que el backend ya tenga el segundo fix
    cy.tick(4000);          // +4s = 5s total desde el primer tick
    cy.wait('@pollLast');   // habrá varias llamadas; con esta basta

    // SLO: dentro de 2s desde que cambió el dato, el marcador debe actualizarse
    cy.tick(2000);          // ventana permitida de actualización (≤2s)
    cy.wait('@pollLast');

    // Verificación de nueva posición
    map.expectMarkerCloseTo({ lat: secondFix.lat, lng: secondFix.lng });


  });
});