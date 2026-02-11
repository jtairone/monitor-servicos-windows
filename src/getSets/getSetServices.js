const tbServices = require('../models/services');

async function getServicesAll() {
    try {
        const services = await tbServices.findAll({ raw: true });
        return services;
    } catch (error) {
        console.error('Erro ao obter os usuários:', error);
        throw error;
    }
}

async function getService(serviceName) {
    try {
        const service = await tbServices.findOne({ where: { name: serviceName }, raw: true }); 
        return service;
    } catch (error) {
        console.error('Erro ao obter os usuários:', error);
        throw error;
    }
}

async function delService(serviceName) {
    try {
        const result = await tbServices.destroy({ where: { name: serviceName } });
        return result;
    } catch (error) {
        console.error('Erro ao obter os usuários:', error);
        throw error;
    } 
}

async function setService(data) {
    try {
      const service = await tbServices.create(data);
      return service;
    } catch (error) {
        console.error('Erro ao obter os usuários:', error);
        throw error;
    }
  }


module.exports = { getServicesAll, getService, setService, delService };