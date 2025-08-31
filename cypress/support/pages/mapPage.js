// cypress/support/pages/MapPage.js
export class MapPage {
    selectors = {
        vehicleInput: '#vehicleId',
        showBtn: 'button:contains("Mostrar")',
        marker: '[data-testid="map-marker"]',          // <-- selectores variados de ejemplo
    };

  
    readMarker() {
        return cy.get(this.selectors.marker).should('be.visible').then($el => {
            const lat = parseFloat($el.attr('data-lat') || '');
            const lng = parseFloat($el.attr('data-lng') || '');
            return { lat, lng };
        });
    } // localiza y convierte las coordenadas del marcador

    expectMarkerCloseTo({ lat, lng, tol = 0.0001 }) {
        cy.get(this.selectors.marker).should($el => {
            const gotLat = parseFloat($el.attr('data-lat') || '');
            const gotLng = parseFloat($el.attr('data-lng') || '');
            expect(gotLat).to.be.closeTo(lat, tol);
            expect(gotLng).to.be.closeTo(lng, tol);
        });
    }// localiza y verifica la posición del marcador dentro de la tolerancia tol
}
