const express = require('express');
const router = express.Router();
const { Spot, Review, User, SpotImage, Booking, ReviewImage, sequelize } = require('../../db/models');
const { requireAuth } = require('../../utils/auth');
const { route } = require('./spots');



// GET ALL SPOTS -----------------------------------------------------------------------------------------------------------

router.get('/', async (req, res) => {
    const getSpots = await Spot.findAll({
        include: [
            {
                model: SpotImage
            },
            {
                model: Review
            }
        ]
    })
    res.json(getSpots)
})

// CREATE NEW SPOT -----------------------------------------------------------------------------------------------------------

router.post('/', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { address, city, state, country, lat, lng, name, description, price } = req.body;
        // checks to see if all data is inserted correctly
        if (!address || !city || !state || !country || !lat || !lng || !name || !description || !price) {
            return res.status(400).json({ message: 'Missing required fields' })
        }
        // create new spot
        const spot = await Spot.create({ address, city, state, country, lat, lng, name, description, price, ownerId: userId });
        // configure res.status to take in new data
        res.status(201).json({
            id: spot.id,
            ownerId: spot.ownerId,
            address: spot.address,
            city: spot.city,
            state: spot.state,
            country: spot.country,
            lat: spot.lat,
            lng: spot.lng,
            name: spot.name,
            description: spot.description,
            price: spot.price,
            createdAt: spot.createdAt,
            updatedAt: spot.updatedAt,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// ADD AN IMAGE TO A SPOT BASED ON THE SPOT'S ID -----------------------------------------------------------------------------------------------------------

router.post('/:id/images', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        // Get spot id from route's parameter
        const spotId = req.params.id;
        // Find the spot by the id
        const spot = await Spot.findOne({
            where: { id: spotId },
        });
        // Error handler for checking if the spot exists in the database
        if (!spot) {
            return res.status(404).json({ message: 'Spot not found' });
        }
        // Checking if the authenticated user is the owner of the spot
        if (userId !== spot.ownerId) {
            return res.status(403).json({ message: 'Not authorized to add an image to this spot' });
        }
        // Extracting the image data from the req body
        const { url, preview } = req.body;
        // Creating a new image in the database
        const newImage = await SpotImage.create({
            spotId: spot.id,
            url,
            preview,
        });
        // Set the status to the newly created image in the spot
        res.status(201).json({
            id: newImage.id,
            url: newImage.url,
            preview: newImage.preview,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


// GET ALL SPOTS OWNED BY THE CURRENT USER -----------------------------------------------------------------------------------------------------------

router.get('/current', requireAuth, async (req, res) => {
    try {
        // You can access req.user here because the middleware sets it
        const currentUserId = req.user.id;
        // Find all spots owned by the current user
        const ownedSpots = await Spot.findAll({
            where: { ownerId: currentUserId },
            include: [
                {
                    model: SpotImage,
                },
            ],
        });
        // Constructing the response
        const response = {
            Spots: ownedSpots.map((spot) => ({
                id: spot.id,
                ownerId: spot.ownerId,
                address: spot.address,
                city: spot.city,
                state: spot.state,
                country: spot.country,
                lat: spot.lat,
                lng: spot.lng,
                name: spot.name,
                description: spot.description,
                price: spot.price,
                createdAt: spot.createdAt,
                updatedAt: spot.updatedAt,
                previewImage: spot.SpotImages[0]?.url || null,
                avgRating: spot.avgRating,
            })),
        };
        res.status(200).json(response);
    } catch (error) {
        // Error handling 500
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


// GET DETAILS FOR A SPOT FROM AN ID -----------------------------------------------------------------------------------------------------------

router.get('/:id', requireAuth, async (req, res) => {
    try {
        // grabs the spotId from req.params
        const spotId = req.params.id;

        // finds the spot by the ID
        const spot = await Spot.findOne({
            where: { id: spotId },
            include: [
                {
                    model: SpotImage,
                    attributes: ['id', 'url', 'preview'],
                },
                {
                    model: User,
                    attributes: ['id', 'firstName', 'lastName'],
                },
                {
                    model: Review,
                    attributes: [
                        [sequelize.fn('COUNT', sequelize.col('*')), 'numReviews'],
                        [sequelize.fn('AVG', sequelize.col('avgRating')), 'avgStarRating'],
                    ],
                },
            ],
        });

        // checking if the spot exists, if not, error 404 please
        if (!spot) {
            return res.status(404).json({ message: 'Spot not found' });
        }

        // just constructing the required response
        const response = {
            id: spot.id,
            ownerId: spot.ownerId,
            address: spot.address,
            city: spot.city,
            state: spot.state,
            country: spot.country,
            lat: spot.lat,
            lng: spot.lng,
            name: spot.name,
            description: spot.description,
            price: spot.price,
            createdAt: spot.createdAt,
            updatedAt: spot.updatedAt,
            numReviews: spot.Reviews?.numReviews || 0,
            avgStarRating: spot.Reviews?.avgStarRating || 0,
            SpotImages: spot.SpotImages || [],
            Owner: spot.Owner || {},
        };

        // finally respond with the details of the asked for spot
        res.status(200).json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


// EDIT A SPOT -----------------------------------------------------------------------------------------------------------

router.put('/:id', requireAuth, async (req, res) => {
    try {
        //gets the spot id from the route params
        const spotId = req.params.id;

        // gets the spot by the id given
        const spot = await Spot.findOne({
            where: { id: spotId },
        });
        // error handler for if spot does not exist, expects 404
        if (!spot) {
            return res.status(404).json({ message: 'Spot not found' });
        }
        // this just checks if the authenticated user is editing the spot
        if (req.user.id !== spot.ownerId) {
            return res.status(403).json({ message: 'Not authorized to edit this spot' });
        }
        // takes the updated data from the req.body
        const { address, city, state, country, lat, lng, name, description, price } = req.body;
        // jsut checking if the data is present
        if (!address || !city || !state || !country || !lat || !lng || !name || !description || !price) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        // just updating
        await spot.update({
            address,
            city,
            state,
            country,
            lat,
            lng,
            name,
            description,
            price,
        });
        // constructs response json with new information
        const response = {
            id: spot.id,
            ownerId: spot.ownerId,
            address: spot.address,
            city: spot.city,
            state: spot.state,
            country: spot.country,
            lat: spot.lat,
            lng: spot.lng,
            name: spot.name,
            description: spot.description,
            price: spot.price,
            createdAt: spot.createdAt,
            updatedAt: spot.updatedAt,
        };
        res.status(200).json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// DELETE A SPOT -----------------------------------------------------------------------------------------------------------

router.delete('/:id', requireAuth, async (req, res) => {
    try {
        // grabbing the yabba dabba doo
        const spotId = req.params.id;
        const spot = await Spot.findOne({
            where: {
                id: spotId
            },
        });
        if (!spot) {
            return res.status(404).json({ message: 'Spot not foundd' });
        }
        if (req.user.id !== spot.ownerId) {
            return res.status(403).json({ message: 'Not authenticated to delete this spot' })
        }
        await spot.destroy();
        res.status(200).json({ message: 'Spot deleted successfulyl' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// CREATE A NEW REVIEW FOR A SPOT BASED ON THE SPOT'S ID --------------------------------------------------------------------------------

router.post('/:id/reviews', requireAuth, async (req, res) => {
    try {
        // Get spot id
        const spotId = req.params.id;

        // Check if the spot with the spotId exists
        const spot = await Spot.findOne({
            where: { id: spotId },
        });

        // Return 404 if spot doesn't exist
        if (!spot) {
            return res.status(404).json({ message: 'Spot not found in the database' });
        }

        // Check if the user has already reviewed this spot before
        const existingReview = await Review.findOne({
            where: {
                spotId: spot.id,
                userId: req.user.id,
            }
        });

        // If a review already exists, return a 403 error
        if (existingReview) {
            return res.status(403).json({ message: 'This spot has already been reviewed by you' });
        }

        // Get review and stars from the request body
        const { review, stars } = req.body;

        // Ensure necessary inputs are not null
        if (!review || !stars) {
            return res.status(400).json({ message: 'Please provide both review and stars' });
        }

        // Create a new review
        const newReview = await Review.create({
            userId: req.user.id,
            spotId: spot.id,
            review,
            stars
        });

        // Construct JSON response with new review info
        const response = {
            id: newReview.id,
            userId: newReview.userId,
            spotId: newReview.spotId,
            review: newReview.review,
            stars: newReview.stars,
            createdAt: newReview.createdAt,
            updatedAt: newReview.updatedAt,
        };

        // Respond with the newly created review
        res.status(201).json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// GET ALL REVIEWS BY A SPOT'S ID

router.get('/:id/reviews', async (req, res) => {
    try {
        const spotId = req.params.id;

        // does your spot even exist
        const spot = await Spot.findOne({
            where: { id: spotId },
        });

        // if you're lying, 404
        if (!spot) {
            return res.status(404).json({ message: 'Spot not found' });
        }

        // just grabbing all the reviews that are associated with the spot + data
        const spotReviews = await Review.findAll({
            where: {
                spotId,
            },
            include: [
                {
                    model: User,
                    attributes: ['id', 'firstName', 'lastName'],
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

        // here i am formatting how the req.body is expected
        const formattedResponse = {
            Reviews: spotReviews.map((review) => ({
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
                ReviewImages: (review.ReviewImages || []).map((image) => ({
                    id: image.id,
                    url: image.url,
                })),
            })),
        };
        res.status(200).json(formattedResponse);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


module.exports = router;
