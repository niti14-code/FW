const Rating = require('./ratings.model');
const User = require('../users/users.model');

exports.addRating = async (req, res) => {
  try {
    const { rideId, reviewedUser, rating, comment } = req.body;

    const reviewer = req.user.userId; // match your auth middleware

    // Prevent self-rating
    if (reviewer === reviewedUser) {
      return res.status(400).json({ message: "You cannot rate yourself" });
    }

    const newRating = new Rating({
      rideId,
      reviewer,
      reviewedUser,
      rating,
      comment
    });

    await newRating.save();

    const user = await User.findById(reviewedUser);
    if (!user) return res.status(404).json({ message: "User not found" });

    const totalRatings = user.totalRatings + 1;
    const averageRating =
      ((user.averageRating * user.totalRatings) + rating) / totalRatings;

    user.totalRatings = totalRatings;
    user.averageRating = Number(averageRating.toFixed(2));

    await user.save();

    res.status(201).json({ message: 'Rating added successfully' });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUserRatings = async (req, res) => {
  try {
    const ratings = await Rating.find({
      reviewedUser: req.params.userId
    })
    .populate('reviewer', 'name')
    .sort({ createdAt: -1 });

    res.status(200).json(ratings);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};