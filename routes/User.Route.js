const express = require("express");
const UserRouter = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { auth, isAdmin } = require("../middleware/auth");
const UserModel = require("../models/User.Model");
const QuestionModel = require("../models/Question.Model");
const AnswerModel = require("../models/Answer.Model");

const JWT_SECRET = process.env.JWT_SECRET;
const SALT_ROUNDS = 10;

// Registration
UserRouter.post("/signup", async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const newUser = new UserModel({
      username,
      email,
      password: hashedPassword,
      role,
    });
    await newUser.save();
    res.status(201).json({
      msg: "User Registered successfully",
      newUser,
    });
  } catch (error) {
    res.status(500).json(error.message);
  }
});

// Login
UserRouter.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await UserModel.findOne({ username });
  if (user && (await bcrypt.compare(password, user.password))) {
    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: "1h",
    });
    res.json({ msg: "Login Successfully!", token });
  } else {
    res.status(400).json({ message: "Invalid credentials" });
  }
});

// Fetch user details
UserRouter.get("/", auth, async (req, res) => {
  try {
    const user = await UserModel.findById(req.userId);
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update profile
UserRouter.patch("/profile", auth, async (req, res) => {
  try {
    const updatedUser = await UserModel.findByIdAndUpdate(
      req.userId,
      req.body,
      { new: true }
    );
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// Post a new question
UserRouter.post("/questions", auth, async (req, res) => {
  try {
    const { text } = req.body;
    const userId = req.userId;

    const newQuestion = new QuestionModel({
      text,
      userId,
    });

    await newQuestion.save();
    res.status(201).json(newQuestion);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


UserRouter.get("/questions", auth, async (req, res) => {
  try {
    let query = {};
    if (!req.isAdmin) { // Assuming req.isAdmin is set in the isAdmin middleware
      query.approved = true;
    }

    const questions = await QuestionModel.find(query);
    
    if (questions && questions.length > 0) {
      res.json(questions);
    } else {
      res.status(404).json({ message: "Questions not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
UserRouter.get("/answers", auth, async (req, res) => {
  try {
    let query = {};
    if (!req.isAdmin) { 
      query.approved = true;
    }

    const answers = await AnswerModel.find(query)
      .populate('questionId') 
      .populate('userId', 'username email') 
    
    if (answers && answers.length > 0) {
      res.json(answers);
    } else {
      res.status(404).json({ message: "No answers found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
UserRouter.get('/questions/:questionId', async (req, res) => {
  try {
    const questionId = req.params.questionId;

    // Fetch the question by its ID
    const question = await QuestionModel.findById(questionId).populate('userId', 'username'); // I assumed you might want to get the username from the User reference, adjust as needed

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Fetch all answers associated with the question
    const answers = await AnswerModel.find({ questionId: questionId }).populate('userId', 'username'); // Again, populating the username from the User reference, adjust as needed

    res.status(200).json({ question, answers });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});



UserRouter.get("/adminDashboard", auth, isAdmin, async (req, res) => {
  try {
    // Use Promise.all() to run database queries in parallel
    const [pendingQuestions, pendingAnswers, userList] = await Promise.all([
      QuestionModel.find({ approved: false }),
      AnswerModel.find({ approved: false }),
      UserModel.find({ isAdmin: false})
    ]);

    // Send the fetched data as a response
    res.json({
      pendingQuestions,
      pendingAnswers,
      userList
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Post an answer to a specific question
UserRouter.post("/questions/:questionId/answers", auth, async (req, res) => {
  try {
    const { text } = req.body;
    const { questionId } = req.params;
    const userId = req.userId;

    const question = await QuestionModel.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    const newAnswer = new AnswerModel({
      text,
      questionId,
      userId,
    });

    await newAnswer.save();
    res.status(201).json(newAnswer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});





// Rate a specific answer
UserRouter.post("/answers/:answerId/rate", auth, async (req, res) => {
  try {
    const { value } = req.body;
    const { answerId } = req.params;
    const userId = req.userId;

    const answer = await AnswerModel.findById(answerId);
    if (!answer) {
      return res.status(404).json({ message: "Answer not found" });
    }

    // Check if user has already rated the answer
    const existingRating = answer.ratings.find(
      (rating) => rating.userId.toString() === userId
    );
    if (existingRating) {
      existingRating.value = value;
    } else {
      answer.ratings.push({ userId, value });
    }

    await answer.save();
    res.status(200).json(answer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// Admin route to approve a specific answer
UserRouter.patch(
  "/answers/:answerId/approve",
  auth,
  isAdmin,
  async (req, res) => {
    try {
      const { answerId } = req.params;

      const answer = await AnswerModel.findById(answerId);
      if (!answer) {
        return res.status(404).json({ message: "Answer not found" });
      }

      answer.approved = true;

      await answer.save();
      res.status(200).json(answer);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Admin route to approve a specific answer
UserRouter.patch(
  "/questions/:questionId/approve",
  auth,
  isAdmin,
  async (req, res) => {
    try {
      const { questionId } = req.params;

      const question = await QuestionModel.findById(questionId);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      question.approved = true;

      await question.save();
      res.status(200).json(question);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);
// Deleting a specific question
UserRouter.delete("/questions/:questionId", auth, isAdmin, async (req, res) => {
  try {
    const { questionId } = req.params;
    const deletedQuestion = await QuestionModel.findByIdAndDelete(questionId);
    if (!deletedQuestion) {
      return res.status(404).json({ message: "Question not found" });
    }
    res.status(200).json({ message: "Question deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Deleting a specific answer
UserRouter.delete("/answers/:answerId", auth, isAdmin, async (req, res) => {
  try {
    const { answerId } = req.params;
    const deletedAnswer = await AnswerModel.findByIdAndDelete(answerId);
    if (!deletedAnswer) {
      return res.status(404).json({ message: "Answer not found" });
    }
    res.status(200).json({ message: "Answer deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// Banning a specific user
UserRouter.patch("/:userId/ban", auth, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.banned = true;
    await user.save();
    res.status(200).json({ message: "User banned successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Unbanning a specific user (Optional, in case you need to revert the ban)
UserRouter.patch("/:userId/unban", auth, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.banned = false;
    await user.save();
    res.status(200).json({ message: "User unbanned successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = UserRouter;
