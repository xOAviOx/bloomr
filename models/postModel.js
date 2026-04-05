const mongoose = require("mongoose");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const postSchema = new mongoose.Schema(
  {
    userID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Post must belong to a user"],
    },
    content: {
      type: [String],
      required: [true, "Post content is required"],
      maxlength: [500, "Post cannot exceed 500 characters"],
      trim: true,
    },
    imageUrl: {
      type: String,
      default: "",
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    comments: [
      {
        userID: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        content: {
          type: String,
          required: true,
          maxlength: 300,
          trim: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Vector embedding of content — used by Atlas Vector Search for RAG chatbot
    // 768 dimensions for Gemini text-embedding-004
    embedding: {
      type: [Number],
      default: undefined, // omit field if not yet embedded
      select: false, // never returned in normal queries (too large)
    },
  },
  {
    timestamps: true,
  },
);

// Auto-generate embedding whenever post content is created or changed
postSchema.pre("save", async function () {
  if (!this.isModified("content")) return;

  try {
    const model = genAI.getGenerativeModel({ model: "models/gemini-embedding-001" });
    // Join array content into a single string for embedding
    const contentText = this.content.join(" ");
    const result = await model.embedContent(contentText);
    this.embedding = result.embedding.values; // 768 dimensions
  } catch (err) {
    // Embedding failure should not block the post from saving
    console.error("Embedding generation failed:", err.message);
  }
});

// Instance method: check if a user has liked this post
postSchema.methods.isLikedBy = function (userId) {
  return this.likes.some((id) => id.equals(userId));
};

// Virtual: like count
postSchema.virtual("likeCount").get(function () {
  return this.likes.length;
});

postSchema.set("toJSON", { virtuals: true });

// Index for fast user feed queries (fetch all posts by followed users, newest first)
postSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Post", postSchema);
