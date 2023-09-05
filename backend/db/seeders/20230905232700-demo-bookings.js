'use strict';

const { Booking } = require('../models');

let options = {};
if (process.env.NODE_ENV === 'production') {
  options.schema = process.env.SCHEMA;  // define your schema in options object
}


/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await Booking.bulkCreate([
      {
        spotId: 1,
        userId: 1,
        startDate: "2022/10/29",
        endDate: "2022/11/29"
      },
      {
        spotId: 2,
        userId: 2,
        startDate: "2021/08/26",
        endDate: "2021/09/26"
      },
      {
        spotId: 3,
        userId: 3,
        startDate: "2022/10/30",
        endDate: "2022/11/30"
      }
    ], { validate: true })
  },

  async down(queryInterface, Sequelize) {
    options.tableName = "Bookings";
    return queryInterface.dropTable(options);
  }
};
