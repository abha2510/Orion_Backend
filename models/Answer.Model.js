const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema({
  text: {
    type:String,
    required: true,
  },
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Question",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  approved: {
    type: Boolean,
    default: false,
  },
  ratings: {
    type: Number,
    default:0
  }
});

const AnswerModel = mongoose.model("Answer", answerSchema);
module.exports = AnswerModel;
