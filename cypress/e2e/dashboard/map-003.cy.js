// cypress/e2e/dashboard/map-001.cy.js
const loginPage = require('../../pages/LoginPage');
const dashboardPage = require('../../pages/DashboardPage');

//the-internet.herokuapp.com pagina web de prueba que permite validar diferentes funcionalidades
describe('Validación de vehicleId inválido', () => {

  it('datos erróneos', () => {

    cy.fixture('users').then(users => {
      loginPage.visit();
      loginPage.login(users.User.username, users.User.password);
    }); // ingresar a la página de login con credenciales válidas
    dashboardPage.IngresarDatos('1A');// ingresar datos erroneos del vehículo
    dashboardPage.ValidarMensajeError(); // validar que se muestre el mensaje de error
  });
});