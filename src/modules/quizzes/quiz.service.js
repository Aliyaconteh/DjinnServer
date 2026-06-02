const QuizRepository = require("./quiz.repository");

class QuizService {

  async createQuiz(data) {
    return await QuizRepository.createQuiz(data);
  }

  async updateQuiz(id, updates) {
    if (!id) throw new Error("Quiz ID is required");
    return await QuizRepository.updateQuiz(id, updates);
  }

  async deleteQuiz(id) {
    if (!id) throw new Error("Quiz ID is required");
    return await QuizRepository.deleteQuiz(id);
  }

  async addQuestion(question) {
    const sanitizedQuestion = this.sanitizeQuestion(question);
    this.validateQuestion(sanitizedQuestion);
    return await QuizRepository.addQuestion(sanitizedQuestion);
  }

  async updateQuestion(id, updates) {
    if (!id) throw new Error("Question ID is required");
    return await QuizRepository.updateQuestion(id, updates);
  }

  async deleteQuestion(id) {
    if (!id) throw new Error("Question ID is required");
    return await QuizRepository.deleteQuestion(id);
  }

  async getQuiz(id) {
    return await QuizRepository.getQuizWithQuestions(id);
  }

  async getAllQuizzes() {
    return await QuizRepository.getAll();
  }

  validateQuestion(question) {
    if (!Array.isArray(question.options) || question.options.length < 2) {
      throw new Error("Question options must contain at least two choices");
    }

    if (!question.options.includes(question.correct_answer)) {
      throw new Error("correct_answer must match one of the provided options");
    }

    if (question.time_limit && Number(question.time_limit) < 5) {
      throw new Error("time_limit must be at least 5 seconds");
    }
  }

  sanitizeQuestion(question) {
    return {
      ...question,
      question: typeof question.question === "string" ? question.question.trim() : question.question,
      options: Array.isArray(question.options)
        ? question.options.map((option) => (typeof option === "string" ? option.trim() : option))
        : question.options,
      correct_answer:
        typeof question.correct_answer === "string" ? question.correct_answer.trim() : question.correct_answer
    };
  }
}

module.exports = new QuizService();
