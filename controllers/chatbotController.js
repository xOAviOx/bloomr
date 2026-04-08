const { GoogleGenerativeAI } = require("@google/generative-ai");
const Post = require("../models/postModel");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/// Embed a text query using Gemini text-embedding-004
async function embedText(text) {
  const model = genAI.getGenerativeModel({ model: "models/gemini-embedding-001" });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

/// Retrieve top-k relevant posts using Atlas Vector Search
async function retrieveRelevantPosts(queryEmbedding, topK = 5) {
  const docs = await Post.aggregate([
    {
      $vectorSearch: {
        index: "post_embeddings",
        path: "embedding",
        queryVector: queryEmbedding,
        numCandidates: 100,
        limit: topK,
      },
    },
    {
      $project: {
        content: 1,
        userID: 1,
        createdAt: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "userID",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: { path: "$user", preserveNullAndEmptyArrays: true },
    },
    {
      $project: {
        content: 1,
        userName: "$user.name",
        createdAt: 1,
        score: 1,
        comments: 1,
      },
    },
    {
      $facet: {
        withComments: [
          {
            $match: {
              comments: { $exists: true, $ne: null },
              "comments.0": { $exists: true },
            },
          },
          { $unwind: "$comments" },
          {
            $lookup: {
              from: "users",
              localField: "comments.userID",
              foreignField: "_id",
              as: "commentAuthor",
            },
          },
          {
            $unwind: {
              path: "$commentAuthor",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              content: 1,
              userName: 1,
              createdAt: 1,
              score: 1,
              "comments.content": 1,
              "comments.createdAt": 1,
              commentAuthorName: "$commentAuthor.name",
            },
          },
          {
            $group: {
              _id: "$_id",
              content: { $first: "$content" },
              userName: { $first: "$userName" },
              createdAt: { $first: "$createdAt" },
              score: { $first: "$score" },
              comments: {
                $push: {
                  content: "$comments.content",
                  createdAt: "$comments.createdAt",
                  authorName: "$commentAuthorName",
                },
              },
            },
          },
        ],
        withoutComments: [
          {
            $match: {
              $or: [
                { comments: { $exists: false } },
                { comments: { $size: 0 } },
                { comments: { $eq: null } },
              ],
            },
          },
          {
            $project: {
              content: 1,
              userName: 1,
              createdAt: 1,
              score: 1,
              comments: { $literal: [] },
            },
          },
        ],
      },
    },
  ]);

  const withComments = docs[0].withComments || [];
  const withoutComments = docs[0].withoutComments || [];

  return [...withComments, ...withoutComments].sort((a, b) => b.score - a.score);
}

// Build a context string from retrieved posts and their comments
function buildContext(posts) {
  if (!posts.length) return "No relevant posts found.";

  return posts
    .map((post, i) => {
      const content = post.content.join(" ");
      const commentStr = post.comments
        .map(
          (c) =>
            `  - Comment by ${c.authorName || "user"}: "${c.content}"`,
        )
        .join("\n");
      return `--- Post ${i + 1} (by ${post.userName || "unknown"}, relevance: ${post.score?.toFixed(2)}) ---\n${content}\nComments:\n${commentStr || "  (none)"}`;
    })
    .join("\n\n");
}

// Main chatbot handler
exports.chatbot = async (req, res, next) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== "string") {
      return res.status(400).json({
        status: "fail",
        message: "A 'question' field is required in the request body.",
      });
    }

    // 1. Embed the user's question
    const queryEmbedding = await embedText(question);

    // 2. Retrieve relevant posts + comments from vector DB
    const relevantPosts = await retrieveRelevantPosts(queryEmbedding, 5);

    // 3. Build context string for Gemini
    const context = buildContext(relevantPosts);

    // 4. Generate answer using Gemini
    const model = genAI.getGenerativeModel({ model: "models/gemini-2.5-flash" });
    const prompt = `
You are a helpful assistant for a social media app called Bloomr.
Use the context below (posts + comments from the platform) to answer the user's question.
If the context doesn't contain enough information, say so honestly.

--- Context ---
${context}
--- End Context ---

User question: ${question}
`;
    const result = await model.generateContent(prompt);
    const answer = result.response.text();

    res.status(200).json({
      status: "success",
      data: {
        question,
        answer,
        sources: relevantPosts.map((p) => ({
          id: p._id,
          preview: p.content[0]?.slice(0, 80) + "...",
          score: p.score,
        })),
      },
    });
  } catch (err) {
    console.error("Chatbot error:", err);
    next(err);
  }
};
