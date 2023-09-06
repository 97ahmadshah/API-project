'use strict';

const { urlencoded } = require('express');
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
        previewImage: 'fakeurl.com',
        avgRating: 1
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
        previewImage: 'fakeurltwo.com',
        avgRating: 2
      },
      {
        ownerId: 3,
        address: '400 Post St',
        city: 'Big City',
        state: 'NY',
        country: 'USA',
        lat: 92.98765,
        lng: -44.43210,
        name: 'Sample Spot 3',
        description: 'Spacious house',
        price: 200.00,
        previewImage: 'fakeurlthree.com',
        avgRating: 3
      }
    ], { validate: true });
  },

  async down(queryInterface, Sequelize) {
    options.tableName = "Spots";
    return queryInterface.dropTable(options);
  }
};
