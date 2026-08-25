import { ObjectId } from "mongodb";
import { ZodSchema } from "zod";

import { ModelBase } from "@/models/ModelBase";
import { reviewSchema, type Review } from "@/schemas/reviewSchema";

class ReviewModel extends ModelBase<Review> {
  protected collectionName = "reviews";
  protected schema: ZodSchema<Review> = reviewSchema;

  async findByBookingId(bookingId: string): Promise<Review | null> {
    return this.findOne({ bookingId });
  }

  async findByFreelancerUserId(
    freelancerUserId: string,
    limit = 50
  ): Promise<Review[]> {
    return this.find(
      { freelancerUserId },
      { sort: { created_at: -1 }, limit }
    );
  }

  async ensureIndexes() {
    const collection = await this.getCollection();
    try {
      // Migrate from non-sparse unique index if present
      await collection.dropIndex("bookingId_1");
    } catch {
      // Index may not exist yet
    }
    await collection.createIndex(
      { bookingId: 1 },
      { unique: true, sparse: true, name: "bookingId_1_sparse" }
    );
    await collection.createIndex({ freelancerUserId: 1, created_at: -1 });
  }
}

export const reviewModel = new ReviewModel();

export type CreateReviewInput = Omit<Review, "_id">;

export async function createReview(data: CreateReviewInput) {
  await reviewModel.ensureIndexes().catch(() => {
    // Index may already exist with a different options set
  });
  return reviewModel.create({
    _id: new ObjectId(),
    ...data,
  } as Review);
}
