// cypress/pages/LoginPage.js
class LoginPage {
  elements = {
    username: () => cy.get('[data-test="username"]'),
    password: () => cy.get('[data-test="password"]'),
    submit:   () => cy.get('[data-test="login-button"]'),
    error:    () => cy.get('[data-test="error"]'),
  };

  visit() {
    cy.visit('/');
  }

  login(username, password) {
    this.elements.username().clear().type(username);
    this.elements.password().clear().type(password);
    this.elements.submit().click();
  }
}

module.exports = new LoginPage();
