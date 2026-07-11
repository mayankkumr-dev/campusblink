/**
 * feedControllerMongo.js — Hybrid Recommendation Feed Controller (MongoDB Aggregation Pipeline)
 *
 * Architecture & Algorithmic Logic:
 *   1. Graph Filtering (Base Layer):
 *      Filters posts to include those belonging to the user's `collegeId` OR authored
 *      by accounts the user explicitly follows (`followedUserIds`).
 *
 *   2. Engagement Scoring (Weighting):
 *      Calculates raw engagement score weighted toward active participation:
 *        RawEngagement = (likesCount * 1) + (commentsCount * 3) + (repostsCount * 2)
 *
 *   3. Mathematical Time-Decay Function:
 *      Applies a continuous Newtonian/gravity time decay so newer posts retain higher multipliers.
 *      Posts older than 48 hours suffer an additional explicit freshness penalty:
 *        AgeInHours = (NOW - createdAt) / 3600000
 *        TimeDecayMultiplier = 1 / ((1 + (AgeInHours / 6)) ^ 1.5)
 *        Penalty = AgeInHours > 48 ? 0.35 : 1.0
 *
 *   4. Randomization for Discovery (Serendipity & Echo-Chamber Breaker):
 *      Uses MongoDB `$rand` to inject a controlled serendipity jitter (+/- 15% noise or additive boost)
 *      so emerging posts with lower scores can surface organically.
 *
 *   5. High-Performance Pagination:
 *      Supports both Cursor-based pagination (`cursorScore` + `cursorId`) and fast `$skip`/`$limit`.
 */

const mongoose = require('mongoose');

// Example Post Model reference (assuming standard Mongoose model)
// const Post = mongoose.model('Post');

/**
 * GET /api/feed/recommendations
 * Controller to generate the hybrid recommendation feed using MongoDB Aggregation.
 */
async function getRecommendationFeed(req, res) {
  try {
    const userId = req.user?.id || req.query.userId;
    const collegeId = req.user?.collegeId || req.query.collegeId;

    // Pagination params
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const skip = Math.max(parseInt(req.query.skip, 10) || 0, 0);
    const cursorScore = req.query.cursorScore ? parseFloat(req.query.cursorScore) : null;
    const cursorId = req.query.cursorId || null;

    // Followed user IDs passed or fetched from user graph
    // In production, this can either be looked up prior or passed in req.user.following
    const followedUserIds = Array.isArray(req.user?.following)
      ? req.user.following.map(id => new mongoose.Types.ObjectId(id))
      : [];

    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    // Build base match stage (Graph Filtering)
    const baseMatch = {
      $or: [
        { collegeId: collegeId },
        { authorId: { $in: followedUserIds } }
      ],
      isDeleted: { $ne: true }
    };

    // Construct the Aggregation Pipeline
    const pipeline = [
      // ───────────────────────────────────────────────────────────────────────
      // STAGE 1: Graph Filtering (Base Layer)
      // Leverage compound index { collegeId: 1, createdAt: -1 } & { authorId: 1 }
      // ───────────────────────────────────────────────────────────────────────
      { $match: baseMatch },

      // ───────────────────────────────────────────────────────────────────────
      // STAGE 2: Author Lookup (Optional lightweight join for author details)
      // ───────────────────────────────────────────────────────────────────────
      {
        $lookup: {
          from: 'users',
          localField: 'authorId',
          foreignField: '_id',
          as: 'author'
        }
      },
      {
        $unwind: {
          path: '$author',
          preserveNullAndEmptyArrays: true
        }
      },

      // ───────────────────────────────────────────────────────────────────────
      // STAGE 3: Engagement Scoring & Time-Decay Calculation ($addFields)
      // ───────────────────────────────────────────────────────────────────────
      {
        $addFields: {
          // 1. Calculate age in hours: (NOW - createdAt) / 3,600,000 ms
          ageInHours: {
            $divide: [
              { $subtract: [now, '$createdAt'] },
              3600000
            ]
          },
          // 2. Weighted engagement score: likes * 1 + comments * 3 + reposts * 2
          rawEngagementScore: {
            $add: [
              { $multiply: [{ $ifNull: ['$likesCount', 0] }, 1] },
              { $multiply: [{ $ifNull: ['$commentsCount', 0] }, 3] },
              { $multiply: [{ $ifNull: ['$repostsCount', 0] }, 2] }
            ]
          },
          // 3. Discovery Jitter: uniform random number [0.0, 1.0] generated per document
          discoveryRand: { $rand: {} }
        }
      },

      // ───────────────────────────────────────────────────────────────────────
      // STAGE 4: Trending Score & Time-Decay Multiplier
      // Formula:
      //   TimeDecay = 1 / ((1 + ageInHours / 6) ^ 1.5)
      //   StalePenalty = ageInHours > 48 ? 0.35 : 1.0
      //   DiscoveryBoost = discoveryRand * 5  (breaks echo chamber)
      //   finalScore = (rawEngagement + 10) * TimeDecay * StalePenalty + DiscoveryBoost
      // ───────────────────────────────────────────────────────────────────────
      {
        $addFields: {
          timeDecayMultiplier: {
            $divide: [
              1,
              {
                $pow: [
                  { $add: [1, { $divide: ['$ageInHours', 6] }] },
                  1.5
                ]
              }
            ]
          },
          stalePenalty: {
            $cond: {
              if: { $gt: ['$ageInHours', 48] },
              then: 0.35, // 65% decay penalty for posts > 48 hrs old
              else: 1.0
            }
          }
        }
      },
      {
        $addFields: {
          trendingScore: {
            $add: [
              {
                $multiply: [
                  { $add: ['$rawEngagementScore', 10] }, // Base weight ensures new 0-engagement posts have non-zero score
                  '$timeDecayMultiplier',
                  '$stalePenalty'
                ]
              },
              // Inject controlled discovery serendipity factor
              { $multiply: ['$discoveryRand', 4.5] }
            ]
          }
        }
      }
    ];

    // ─────────────────────────────────────────────────────────────────────────
    // STAGE 5: Cursor-Based or Offset Pagination Match
    // ─────────────────────────────────────────────────────────────────────────
    if (cursorScore !== null && cursorId) {
      pipeline.push({
        $match: {
          $or: [
            { trendingScore: { $lt: cursorScore } },
            {
              trendingScore: cursorScore,
              _id: { $lt: new mongoose.Types.ObjectId(cursorId) }
            }
          ]
        }
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STAGE 6: Sort, Skip, Limit & Projection
    // ─────────────────────────────────────────────────────────────────────────
    pipeline.push(
      {
        $sort: {
          trendingScore: -1,
          _id: -1
        }
      },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          content: 1,
          mediaUrls: 1,
          collegeId: 1,
          authorId: 1,
          author: {
            _id: '$author._id',
            name: '$author.name',
            username: '$author.username',
            avatarUrl: '$author.avatarUrl'
          },
          likesCount: 1,
          commentsCount: 1,
          repostsCount: 1,
          createdAt: 1,
          trendingScore: 1,
          ageInHours: 1
        }
      }
    );

    // Execute the aggregation pipeline
    // Replace `mongoose.connection.collection('posts')` with your model `Post.aggregate(pipeline)`
    const postsCollection = mongoose.connection.collection('posts');
    const feedResults = await postsCollection.aggregate(pipeline).toArray();

    // Construct next cursor for the client
    const lastItem = feedResults[feedResults.length - 1];
    const nextCursor = lastItem
      ? {
          cursorScore: lastItem.trendingScore,
          cursorId: lastItem._id.toString()
        }
      : null;

    return res.status(200).json({
      success: true,
      count: feedResults.length,
      nextCursor,
      data: feedResults
    });
  } catch (error) {
    console.error('[RecommendationFeed] Error generating feed:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate recommendation feed.'
    });
  }
}

module.exports = {
  getRecommendationFeed
};
