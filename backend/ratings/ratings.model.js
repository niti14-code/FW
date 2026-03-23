const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema(
  {
    rideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ride',
      required: false,   // optional — not all reviews are tied to a tracked ride
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reviewedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

// Index for fast lookup of all ratings for a user (keep this one)
ratingSchema.index({ reviewedUser: 1, createdAt: -1 });

const Rating = mongoose.model('Rating', ratingSchema);

// Drop the old unique index (rideId_1_reviewer_1) that was blocking multiple
// reviews from the same user. Safe to re-run — silently ignores if already gone.
Rating.collection.dropIndex('rideId_1_reviewer_1')
  .then(() => console.log('✅ Ratings: dropped old rideId_1_reviewer_1 index'))
  .catch(() => {}); // index doesn't exist — that's fine

module.exports = Rating;