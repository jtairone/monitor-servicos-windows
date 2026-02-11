const tbUsers = require('../models/users');

async function getUsers() {
    try {
        const users = await tbUsers.findAll({ raw: true });
        return users;
    } catch (error) {
        console.error('Erro ao obter os usuários:', error);
        throw error;
    }
}

async function setUsers(data) {
    try {
      const user = await tbUsers.create(data);
      return user;
    } catch (error) {
        console.error('Erro ao obter os usuários:', error);
        throw error;
    }
  }


module.exports = { getUsers, setUsers };