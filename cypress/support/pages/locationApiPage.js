// cypress/support/pages/LocationApiPage.js
// Utilidad POM para stubbear el polling del endpoint de última ubicación
export class LocationApiPage {
  stubPolling({ firstFix, secondFix, switchAfterCalls = 6, delayMs = 150 }) {
    let calls = 0;
    cy.intercept('GET', '/api/location/last*', req => {
      calls += 1;
      const body = calls < switchAfterCalls ? firstFix : secondFix;
      req.reply(res => {
        res.delay = delayMs;      // latencia simulada
        res.send({ statusCode: 200, body });
      });
    }).as('pollLast');
  }
}
