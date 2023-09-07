const express = require('express');
const router = express.Router();
const { Spot, Review, User, SpotImage, Booking, ReviewImage, sequelize, Sequelize } = require('../../db/models');
const { requireAuth } = require('../../utils/auth');
const { route } = require('./spots');



// GET ALL SPOTS -----------------------------------------------------------------------------------------------------------

router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const size = parseInt(req.query.size) || 10;
        const minLat = parseFloat(req.query.minLat);
        const maxLat = parseFloat(req.query.maxLat);
        const minLng = parseFloat(req.query.minLng);
        const maxLng = parseFloat(req.query.maxLng);
        const minPrice = parseFloat(req.query.minPrice);
        const maxPrice = parseFloat(req.query.maxPrice);
        if (
            isNaN(page) || isNaN(size) ||
            (minLat && isNaN(minLat)) || (maxLat && isNaN(maxLat)) ||
            (minLng && isNaN(minLng)) || (maxLng && isNaN(maxLng)) ||
            (minPrice && isNaN(minPrice)) || (maxPrice && isNaN(maxPrice))
        ) {
            return res.status(400).json({ message: 'Invalid query parameters' });
        }
        const filter = {
            where: {},
            offset: (page - 1) * size,
            limit: size,
            include: [
                { model: SpotImage },
                { model: Review },
            ],
        };
        if (minLat && maxLat) filter.where.lat = { [Sequelize.Op.between]: [minLat, maxLat] };
        if (minLng && maxLng) filter.where.lng = { [Sequelize.Op.between]: [minLng, maxLng] };
        if (minPrice && maxPrice) filter.where.price = { [Sequelize.Op.between]: [minPrice, maxPrice] };
        const spots = await Spot.findAll(filter);
        const total = await Spot.count();
        const response = { spots, page, size, total };
        res.json(response);
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
        const userId = req.user.id;
        // get the good ole thang
        const spotId = req.params.id;
        const spot = await Spot.findOne({
            where: { id: spotId },
        });
        // does this thing already exist, answer me this
        if (!spot) {
            return res.status(404).json({ message: 'Spot not found' });
        }
        // are you even the real owner
        if (userId !== spot.ownerId) {
            return res.status(403).json({ message: 'Not authorized to add an image to this spot' });
        }
        // taking data from req.body
        const { url, preview } = req.body;
        // create the new image here
        const newImage = await SpotImage.create({
            spotId: spot.id,
            url,
            preview,
        });
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
        const currentUserId = req.user.id;
        // find all the spottitos
        const ownedSpots = await Spot.findAll({
            where: { ownerId: currentUserId },
            include: [
                {
                    model: SpotImage,
                },
            ],
        });
        // formatting response so i dont get fined
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
        const spotId = req.params.id;
        // does this spot already friggin exist?? (checks if it does)
        const spot = await Spot.findOne({
            where: { id: spotId },
        });
        // if it doesnt, big error time
        if (!spot) {
            return res.status(404).json({ message: 'Spot not found in the database' });
        }
        // this just checks to see why you are reviewing something again. pls dont
        const existingReview = await Review.findOne({
            where: {
                spotId: spot.id,
                userId: req.user.id,
            }
        });
        // if it does, big 404 for u buddy
        if (existingReview) {
            return res.status(403).json({ message: 'This spot has already been reviewed by you' });
        }
        // grabbing review, stars for req.body
        const { review, stars } = req.body;
        // just checking emptyness for null constraint
        if (!review || !stars) {
            return res.status(400).json({ message: 'Please provide both review and stars' });
        }
        // make a new one yo
        const newReview = await Review.create({
            userId: req.user.id,
            spotId: spot.id,
            review,
            stars
        });
        // formatttttting
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

        // do the check we been doing
        const spot = await Spot.findByPk(spotId);
        if (!spot) {
            return res.status(404).json({ message: 'Spot not found' });
        }
        // is current user the owner??
        const isOwner = spot.ownerId === currentUserId;
        // Find bookings for the specified spot
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
        // just formatting so i don't get fined
        const formattedResponse = {
            Bookings: bookings.map((booking) => ({
                User: {
                    id: booking.User.id,
                    firstName: booking.User.firstName,
                    lastName: booking.User.lastName,
                },
                id: booking.id,
                spotId: booking.spotId,
                userId: booking.userId,
                startDate: booking.startDate.toISOString().split('T')[0], // Format date as 'yyyy-mm-dd'
                endDate: booking.endDate.toISOString().split('T')[0], // Format date as 'yyyy-mm-dd'
                createdAt: booking.createdAt.toISOString(),
                updatedAt: booking.updatedAt.toISOString(),
            })),
        };
        res.status(200).json(formattedResponse);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = router;
