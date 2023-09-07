const express = require('express');
const router = express.Router();
const { Review, User, Spot, ReviewImage, sequelize } = require('../../db/models');
const { requireAuth } = require('../../utils/auth');
const { route } = require('./reviews');
const { validationResult } = require('express-validator')

// ADD AN IMAGE TO A REVIEW BASED ON THE REVIEW'S ID -----------------------------------------------------------------------------------------------------------

router.post('/:id/images', requireAuth, async (req, res) => {
    try {
        // do the roar, make him do the roar daddy
        const reviewId = req.params.id;
        // finding review by reviewId
        const review = await Review.findOne({
            where: { id: reviewId },
        });
        // if we can't find ya god damn review, we handle it
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }
        // just checks if you're actually the owner
        if (req.user.id !== review.userId) {
            return res.status(403).json({ message: 'Not authorized to add an image to this review' });
        }
        // maximum number requirement !!!
        const imageCount = await ReviewImage.count({ where: { reviewId } });
        if (imageCount >= maxImageCount) {
            return res.status(403).json({ message: 'Maximum number of images reached for this review' });
        }
        // extract image data from req.body
        const { url } = req.body;
        // new image time baby
        const newImage = await ReviewImage.create({
            reviewId: review.id,
            url,
        });
        // now we gonna need that information
        res.status(201).json({
            id: newImage.id,
            url: newImage.url,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// GET ALL REVIEWS OF THE CURRENT USER -----------------------------------------------------------------------------------------------------------

router.get('/current', requireAuth, async (req, res) => {
    try {
        const currentUserId = req.user.id;
        // get all the god dang reviews written by the user/include its data
        const userReviews = await Review.findAll({
            where: {
                userId: currentUserId,
            },
            include: [
                {
                    model: User,
                    attributes: ['id', 'firstName', 'lastName'],
                },
                {
                    model: Spot,
                    attributes: [
                        'id',
                        'ownerId',
                        'address',
                        'city',
                        'state',
                        'country',
                        'lat',
                        'lng',
                        'name',
                        'price',
                        'previewImage', // Include previewImage directly
                    ],
                },
                {
                    model: ReviewImage,
                    attributes: ['id', 'url'],
                },
            ],
            attributes: [
                'id',
                'userId',
                'spotId',
                'review',
                'stars',
                'createdAt',
                'updatedAt',
            ],
        });
        // this si just formatting the way the api docs wanted it to be returned in the req.body
        const formattedResponse = {
            Reviews: userReviews.map((review) => ({
                id: review.id,
                userId: review.userId,
                spotId: review.spotId,
                review: review.review,
                stars: review.stars,
                createdAt: review.createdAt,
                updatedAt: review.updatedAt,
                User: {
                    id: review.User.id,
                    firstName: review.User.firstName,
                    lastName: review.User.lastName,
                },
                Spot: {
                    id: review.Spot.id,
                    ownerId: review.Spot.ownerId,
                    address: review.Spot.address,
                    city: review.Spot.city,
                    state: review.Spot.state,
                    country: review.Spot.country,
                    lat: review.Spot.lat,
                    lng: review.Spot.lng,
                    name: review.Spot.name,
                    price: review.Spot.price,
                    previewImage: review.Spot.previewImage || null,
                },
                ReviewImages: (review.ReviewImages || []).map((image) => ({
                    id: image.id,
                    url: image.url,
                })),
            })),
        };
        // finally finally we return
        res.status(200).json(formattedResponse);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// EDIT A REVIEW -----------------------------------------------------------------------------------------------------------

router.put('/:id', requireAuth, async (req, res) => {
    try {
        const { review, stars } = req.body;
        const currentUserId = req.user.id;
        const reviewId = req.params.id;
        // do the checkity check
        const existingReview = await Review.findOne({
            where: {
                id: reviewId,
                userId: currentUserId, // Check if the current user is the owner
            },
        });
        // 404 if non existent
        if (!existingReview) {
            return res.status(404).json({ message: 'Review not found' });
        }
        // making sure the request body is validated
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        // updates
        await existingReview.update({
            review,
            stars,
        });
        // gets the review after updating
        const updatedReview = await Review.findOne({
            where: { id: reviewId },
            attributes: [
                'id',
                'userId',
                'spotId',
                'review',
                'stars',
                'createdAt',
                'updatedAt',
            ],
        });
        res.status(200).json(updatedReview);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// DELETE A REVIEW --------------------------------------------------------------------------------------------------------------------------------------------------

router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const reviewId = req.params.id;
        const existingReview = await Review.findOne({
            where: {
                id: reviewId,
                userId: currentUserId,
            },
        });
        if (!existingReview) {
            return res.status(404).json({ message: 'Review not found' });
        }
        await existingReview.destroy();
        res.status(200).json({ message: 'Review deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = router;
