const express = require('express');
const router = express.Router();
const { Booking, User, Spot, sequelize, Sequelize } = require('../../db/models');
const { requireAuth } = require('../../utils/auth');
const { route } = require('./bookings');

// GET ALL OF THE CURRENT USER'S BOOKINGS ----------------------------------------------------------------------------------------------------------

router.get('/current', requireAuth, async (req, res) => {
    try {
        const currentUserId = req.user.id;
        // get alla da bookings by user + data
        const userBookings = await Booking.findAll({
            where: {
                userId: currentUserId,
            },
            include: [
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
                        'previewImage',
                    ],
                },
            ],
            attributes: [
                'id',
                'spotId',
                'userId',
                'startDate',
                'endDate',
                'createdAt',
                'updatedAt',
            ],
        });
        // just formatting so i dont get in trouble
        const formattedResponse = {
            Bookings: userBookings.map((booking) => ({
                id: booking.id,
                spotId: booking.spotId,
                userId: booking.userId,
                startDate: booking.startDate,
                endDate: booking.endDate,
                createdAt: booking.createdAt,
                updatedAt: booking.updatedAt,
                Spot: {
                    id: booking.Spot.id,
                    ownerId: booking.Spot.ownerId,
                    address: booking.Spot.address,
                    city: booking.Spot.city,
                    state: booking.Spot.state,
                    country: booking.Spot.country,
                    lat: booking.Spot.lat,
                    lng: booking.Spot.lng,
                    name: booking.Spot.name,
                    price: booking.Spot.price,
                    previewImage: booking.Spot.previewImage || null,
                },
            })),
        };
        res.status(200).json(formattedResponse);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// EDIT A BOOKING

router.put('/:id', requireAuth, async (req, res) => {
    try {
        const { id: bookingId } = req.params;
        const { startDate, endDate } = req.body;
        const currentUserId = req.user.id;

        // Find the booking to be edited
        const booking = await Booking.findByPk(bookingId, {
            include: Spot, // Include the Spot model
        });

        // Check if the booking exists
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Check if the current user is the owner of the booking
        if (booking.userId !== currentUserId) {
            return res.status(403).json({ message: 'Not authorized to edit this booking' });
        }

        // Check if a booking already exists for the spot on the specified dates
        const existingBooking = await Booking.findOne({
            where: {
                spotId: booking.Spot.id, // Access the spot's id property
                startDate: {
                    [sequelize.Op.lte]: endDate,
                },
                endDate: {
                    [sequelize.Op.gte]: startDate,
                },
                id: {
                    [sequelize.Op.not]: bookingId,
                },
            },
        });

        if (existingBooking) {
            return res.status(403).json({ message: 'A booking already exists for these dates' });
        }

        // Update the booking
        booking.startDate = startDate;
        booking.endDate = endDate;
        await booking.save();

        // Format the response
        const formattedResponse = {
            id: booking.id,
            userId: booking.userId,
            spotId: booking.Spot.id, // Access the spot's id property
            startDate: booking.startDate.toISOString().split('T')[0], // Format date as 'yyyy-mm-dd'
            endDate: booking.endDate.toISOString().split('T')[0], // Format date as 'yyyy-mm-dd'
            createdAt: booking.createdAt.toISOString(),
            updatedAt: booking.updatedAt.toISOString(),
        };

        res.status(200).json(formattedResponse);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// DELETE A BOOKING

router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const { id: bookingId } = req.params;
        const currentUserId = req.user.id;
        const booking = await Booking.findByPk(bookingId, {
            include: Spot,
        });
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        if (booking.userId !== currentUserId && booking.Spot.ownerId !== currentUserId) {
            return res.status(403).json({ message: 'Not authorized to delete this booking' });
        }
        const currentDate = new Date();
        if (booking.startDate <= currentDate) {
            return res.status(400).json({ message: "Can't delete current or past bookings" });
        }
        await booking.destroy();
        res.status(200).json({ message: 'Booking deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = router;
