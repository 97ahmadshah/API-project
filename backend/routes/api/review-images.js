const express = require('express');
const router = express.Router();
const { Review, ReviewImage, sequelize } = require('../../db/models');
const { requireAuth } = require('../../utils/auth');
const { validationResult } = require('express-validator')

// DELETE IMAGES FOR A REVIEW
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const { id: imageId } = req.params;
        const currentUserId = req.user.id;
        const reviewImage = await ReviewImage.findByPk(imageId, {
            include: Review,
        });
        if (!reviewImage) {
            return res.status(404).json({ message: 'Review image not found' });
        }
        if (!reviewImage.review || reviewImage.review.userId !== currentUserId) {
            return res.status(403).json({ message: 'Not authorized to delete this review image' });
        }
        await reviewImage.destroy();
        res.status(200).json({ message: 'Review image deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = router;
