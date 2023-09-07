const express = require('express');
const router = express.Router();
const { Spot, SpotImage, sequelize } = require('../../db/models');
const { requireAuth } = require('../../utils/auth');
const { validationResult } = require('express-validator')

router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const { id: imageId } = req.params;
        const currentUserId = req.user.id;
        // find what we need and neutralize it
        const spotImage = await SpotImage.findByPk(imageId, {
            include: Spot, // Include the associated Spot model
        });
        // just checking to make sure it exists
        if (!spotImage) {
            return res.status(404).json({ message: 'Spot image not found' });
        }
        // are you even the correct user?
        if (spotImage.Spot.ownerId !== currentUserId) {
            return res.status(403).json({ message: 'Not authorized to delete this spot image' });
        }
        // time to go my friend, DELETE
        await spotImage.destroy();
        res.status(200).json({ message: 'Spot image deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


module.exports = router;
