'use strict';

let options = {};
if (process.env.NODE_ENV === 'production') {
  options.schema = process.env.SCHEMA;  // define your schema in options object
}

const { Review } = require('../models');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await Review.bulkCreate([
      {
        spotId: 1,
        userId: 1,
        review: "This place is fuego",
        stars: 5,
      },
      {
        spotId: 2,
        userId: 2,
        review: "This place is aighttt",
        stars: 3,
      },
      {
        spotId: 3,
        userId: 3,
        review: "What in God's green earth",
        stars: 4,
      }
    ], { validate: true })
  },

  async down(queryInterface, Sequelize) {
    options.tableName = "Reviews";
    return queryInterface.dropTable(options);
  }
};
