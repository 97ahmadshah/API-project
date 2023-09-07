const express = require('express');
const router = express.Router();
const { Review, User, Spot, ReviewImage, sequelize } = require('../../db/models');
const { requireAuth } = require('../../utils/auth');
const { route } = require('./reviews');

// ADD AN IMAGE TO A REVIEW BASED ON THE REVIEW'S ID -----------------------------------------------------------------------------------------------------------

router.post('/:id/images', requireAuth, async (req, res) => {
    try {
        // Get the review id from the route's parameter
        const reviewId = req.params.id;

        // Find the review by the id
        const review = await Review.findOne({
            where: { id: reviewId },
        });

        // Return 404 if the review does not exist
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        // Check if the authenticated user is the owner of the review
        if (req.user.id !== review.userId) {
            return res.status(403).json({ message: 'Not authorized to add an image to this review' });
        }

        // Check if the maximum number of images has been added for the review
        const imageCount = await ReviewImage.count({ where: { reviewId } });
        if (imageCount >= maxImageCount) {
            return res.status(403).json({ message: 'Maximum number of images reached for this review' });
        }

        // Extract the image data from the request body
        const { url } = req.body;

        // Create a new image in the database for the review
        const newImage = await ReviewImage.create({
            reviewId: review.id,
            url,
        });

        // Return the id and url of the newly created image
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

        // Retrieve reviews written by the current user and include associated data
        const userReviews = await Review.findAll({
            where: {
                userId: currentUserId,
            },
            include: [
                {
                    model: User, // Include User data
                    attributes: ['id', 'firstName', 'lastName'],
                },
                {
                    model: Spot, // Include Spot data
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
                    ],
                    include: [
                        {
                            model: ReviewImage, // Include ReviewImages
                            attributes: ['id', 'url'],
                        },
                    ],
                },
                {
                    model: ReviewImage, // Include ReviewImages
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

        // Format the response as per the specified structure
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
                    previewImage: review.Spot.ReviewImages[0]?.url || null,
                },
                ReviewImages: review.ReviewImages.map((image) => ({
                    id: image.id,
                    url: image.url,
                })),
            })),
        };

        // Return the formatted response
        res.status(200).json(formattedResponse);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

//

module.exports = router;
