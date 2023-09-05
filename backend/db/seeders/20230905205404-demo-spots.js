'use strict';

const { Spot } = require('../models');

let options = {};
if (process.env.NODE_ENV === 'production') {
  options.schema = process.env.SCHEMA;  // define your schema in options object
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await Spot.bulkCreate([
      {
        ownerId: 1,
        address: '123 Main St',
        city: 'Example City',
        state: 'CA',
        country: 'USA',
        lat: 34.12345,
        lng: -118.56789,
        name: 'Sample Spot 1',
        description: 'A cozy place to stay',
        price: 100.00,
      },
      {
        ownerId: 2,
        address: '456 Elm St',
        city: 'Another City',
        state: 'NY',
        country: 'USA',
        lat: 40.98765,
        lng: -73.43210,
        name: 'Sample Spot 2',
        description: 'Spacious apartment',
        price: 150.00,
      },
    ], { validate: true });
  },

  async down(queryInterface, Sequelize) {
    options.tableName = 'Spots';
    const Op = Sequelize.Op;
    return queryInterface.bulkDelete(options, {
      name: { [Op.in]: ['Sample Spot 1', 'Sample Spot 2'] }
    }, {});
  }
};
