const express = require('express');
const router = express.Router();
const { Spot, Review, User, SpotImage, Booking, ReviewImage, sequelize } = require('../../db/models');
const { requireAuth } = require('../../utils/auth');
const { route } = require('./spots');



// GET ALL SPOTS -----------------------------------------------------------------------------------------------------------

router.get('/', async (req, res) => {
    try {
        const spots = await Spot.findAll({
            include: [
                {
                    model: SpotImage,
                },
                {
                    model: Review,
                },
            ],
        });
        const formattedSpots = spots.map((spot) => ({
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
            previewImage: spot.previewImage,
            avgRating: spot.avgRating,
        }));
        res.status(200).json(formattedSpots);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

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
        // Now, you can access req.user here because the middleware sets it
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
        const spotId = req.params.id;
        // looking for spot by id handler
        const spot = await Spot.findOne({
            where: { id: spotId },
        });
        if (!spot) {
            return res.status(404).json({ message: 'Spot not found' });
        }
        // find spot image
        const spotImages = await SpotImage.findAll({
            where: { spotId },
            attributes: ['id', 'url', 'preview'],
        });
        // find them reviews
        const reviews = await Review.findAll({
            where: { spotId },
            attributes: ['review', 'stars', 'createdAt', 'updatedAt'],
            include: [
                {
                    model: User,
                    attributes: ['id', 'firstName', 'lastName'],
                },
            ],
        });
        // calculating reviews and stars, wow ternarys
        const numReviews = reviews.length;
        const totalStars = reviews.reduce((sum, review) => sum + review.stars, 0);
        const avgStarRating = numReviews > 0 ? totalStars / numReviews : 0;
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
            numReviews,
            avgStarRating,
            SpotImages: spotImages || [],
            Reviews: reviews || [],
            Owner: spot.User || [],
        };
        res.status(200).json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error on Server Side' });
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
        const response = {
            id: newReview.id,
            userId: newReview.userId,
            spotId: newReview.spotId,
            review: newReview.review,
            stars: newReview.stars,
            createdAt: newReview.createdAt,
            updatedAt: newReview.updatedAt,
        };
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

// CREATE A BOOKING FROM A SPOT BASED ON THE SPOT'S ID

router.post('/:id/bookings', requireAuth, async (req, res) => {
    try {
        const { id } = req.params; // Change this to id
        const { startDate, endDate } = req.body;
        const currentUserId = req.user.id;
        // do the checkity check
        const spot = await Spot.findByPk(id);
        if (!spot) {
            return res.status(404).json({ message: 'Spot not found' });
        }
        // do you own this spot?? if not error
        if (spot.ownerId === currentUserId) {
            return res.status(403).json({ message: 'You cannot book your own spot' });
        }
        // just checking to see if the booking already exists on the given dates
        const existingBooking = await Booking.findOne({
            where: {
                spotId: id,
                startDate: {
                    [Sequelize.Op.lte]: endDate,
                },
                endDate: {
                    [Sequelize.Op.gte]: startDate,
                },
            },
        });
        if (existingBooking) {
            return res.status(403).json({ message: 'A booking already exists for these dates' });
        }
        // create a new booking
        const newBooking = await Booking.create({
            spotId: id, // Use id instead of spotId
            userId: currentUserId,
            startDate,
            endDate,
        });
        res.status(201).json({
            id: newBooking.id,
            userId: newBooking.userId,
            spotId: newBooking.spotId,
            startDate: newBooking.startDate,
            endDate: newBooking.endDate,
            createdAt: newBooking.createdAt,
            updatedAt: newBooking.updatedAt,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// GET ALL BOOKINGS FOR A SPOT BASED ON THE SPOT'S ID

router.get('/:id/bookings', requireAuth, async (req, res) => {
    try {
        const { id: spotId } = req.params;
        const currentUserId = req.user.id;
        const spot = await Spot.findByPk(spotId);
        if (!spot) {
            return res.status(404).json({ message: "Spot couldn't be found" });
        }
        const isOwner = spot.ownerId === currentUserId;
        const bookings = await Booking.findAll({
            where: { spotId },
            include: {
                model: User,
                attributes: ['id', 'firstName', 'lastName'],
            },
            attributes: isOwner
                ? ['id', 'spotId', 'userId', 'startDate', 'endDate', 'createdAt', 'updatedAt']
                : ['spotId', 'startDate', 'endDate'],
        });
        const formattedBookings = bookings.map((booking) => {
            const formattedBooking = {
                spotId: booking.spotId,
                startDate: booking.startDate.toISOString().split('T')[0],
                endDate: booking.endDate.toISOString().split('T')[0],
            };
            if (isOwner) {
                formattedBooking.User = {
                    id: booking.User.id,
                    firstName: booking.User.firstName,
                    lastName: booking.User.lastName,
                };
                formattedBooking.id = booking.id;
                formattedBooking.userId = booking.userId;
                formattedBooking.createdAt = booking.createdAt.toISOString();
                formattedBooking.updatedAt = booking.updatedAt.toISOString();
            }
            return formattedBooking;
        });
        const responseBody = isOwner
            ? { Bookings: formattedBookings }
            : { Bookings: formattedBookings.map((booking) => ({ spotId: booking.spotId, startDate: booking.startDate, endDate: booking.endDate })) };
        res.status(200).json(responseBody);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = router;
