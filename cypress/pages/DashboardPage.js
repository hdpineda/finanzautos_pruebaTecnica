// cypress/pages/DashboardPage.js
class DashboardPage {
  elements = {
    placaVeiculo: () => cy.get('.title'),
    mostrarDatos: () => cy.get('.mostrar-datos'),
    mensajeError: () => cy.get('.error-message')
  }; // elementos de la página

  IngresarDatos(placaVeiculo) {
    cy.get('#placaVeiculo').type(placaVeiculo);
    this.elements.mostrarDatos().click();

  } // ingresar datos del vehículo

  ValidarDatos() {
    this.elements.placaVeiculo().should('have.value', 'ABC123');
  } // validar que se muestren los datos del vehículo

  ValidarMensajeError() {
    this.elements.mensajeError().should('be.visible');
  } // validar que se muestre el mensaje de error
}
module.exports = new DashboardPage();