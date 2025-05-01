const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    responses: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        content: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }, // Ensures timestamp for responses
      },
    ],
  },
  { timestamps: true } // Automatically adds createdAt & updatedAt fields
);

module.exports = mongoose.model("Post", PostSchema);
