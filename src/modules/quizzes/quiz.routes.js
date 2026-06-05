const express = require("express");
const router = express.Router();
const QuizController = require("./quiz.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

router.use(authMiddleware);

router.get("/", (req, res) => QuizController.getAll(req, res));
router.post("/", (req, res) => QuizController.create(req, res));
router.get("/:id", (req, res) => QuizController.getQuiz(req, res));
router.patch("/:id", (req, res) => QuizController.update(req, res));
router.delete("/:id", (req, res) => QuizController.remove(req, res));

router.post("/question", (req, res) => QuizController.addQuestion(req, res));
router.post("/questions", (req, res) => QuizController.addQuestion(req, res));
router.patch("/question/:id", (req, res) => QuizController.updateQuestion(req, res));
router.patch("/questions/:id", (req, res) => QuizController.updateQuestion(req, res));
router.delete("/question/:id", (req, res) => QuizController.deleteQuestion(req, res));
router.delete("/questions/:id", (req, res) => QuizController.deleteQuestion(req, res));

module.exports = router;
