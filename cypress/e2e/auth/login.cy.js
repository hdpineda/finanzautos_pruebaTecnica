// cypress/e2e/auth/login.cy.js
const loginPage = require('../../pages/LoginPage');

//the-internet.herokuapp.com pagina web de prueba que permite validar diferentes funcionalidades
describe('Login', () => {

  it('Login exitoso con credenciales válidas', () => {
    cy.fixture('users').then(users => {
      loginPage.visit();
      loginPage.login(users.User.username, users.User.password);
    });

    // Verifica que llegamos al inventario
    cy.url().should('include', '/inventory.html');
    cy.get('.inventory_list').should('be.visible');
  });

  it('Muestra error con credenciales inválidas', () => {
    cy.fixture('users').then(users => {
      loginPage.visit();
      loginPage.login(users.invalidUser.username, users.invalidUser.password);
      loginPage.elements.error().should('be.visible')
        .and('contain.text', 'Username and password do not match');
    });
  });

});
