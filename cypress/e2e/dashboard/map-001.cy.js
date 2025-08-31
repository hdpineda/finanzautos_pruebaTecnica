// cypress/e2e/dashboard/map-001.cy.js
const loginPage = require('../../pages/LoginPage');
const dashboardPage = require('../../pages/DashboardPage');


describe('Mostrar marcador al buscar vehicleId', () => {

  it('ingresar vehicleId y mostrar marcador', () => {
    
    cy.fixture('users').then(users => { 
      loginPage.visit();
      loginPage.login(users.User.username, users.User.password);
    }); // ingresar a la página de login con credenciales válidas
    dashboardPage.IngresarDatos('ABC123'); // ingresar datos del vehículo
    dashboardPage.ValidarDatos(); // validar que se muestren los datos del vehículo
  });
});