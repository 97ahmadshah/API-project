const express = require('express');
const router = express.Router();
const { Spot, Review, sequelize } = require('../../db/models');
const { requireAuth } = require('../../utils/auth');


router.get('/', async (req, res) => {
    const spots = await Spot.findAll({
        attributes: {
            where: ['name']
        }
    })
})
