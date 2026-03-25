const ServiceService = require('../services/ServiceService');

async function create(req, res, next) {
  try {
    const service = ServiceService.createService(req.body);
    return res.status(201).json(service);
  } catch (error) {
    return next(error);
  }
}

async function list(req, res, next) {
  try {
    const services = ServiceService.listServices();
    return res.status(200).json(services);
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    const updated = ServiceService.editService(Number(req.params.id), req.body);
    return res.status(200).json(updated);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  create,
  list,
  update
};
