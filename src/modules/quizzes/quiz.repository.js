const { supabaseAdmin } = require("../../config/supabase.config");

class QuizRepository {

  // 📌 CREATE QUIZ
  async createQuiz(data) {
    const { data: quiz, error } = await supabaseAdmin
      .from("quizzes")
      .insert([data])
      .select()
      .single();

    if (error) throw error;
    return quiz;
  }

  async updateQuiz(id, updates) {
    const { data, error } = await supabaseAdmin
      .from("quizzes")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteQuiz(id) {
    const { error } = await supabaseAdmin
      .from("quizzes")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return { id };
  }

  // 📌 ADD QUESTION
  async addQuestion(question) {
    const { data, error } = await supabaseAdmin
      .from("questions")
      .insert([question])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateQuestion(id, updates) {
    const { data, error } = await supabaseAdmin
      .from("questions")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteQuestion(id) {
    const { error } = await supabaseAdmin
      .from("questions")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return { id };
  }

  // 📌 GET QUIZ WITH QUESTIONS (IMPORTANT FOR GAME ENGINE)
  async getQuizWithQuestions(quizId) {
    const { data, error } = await supabaseAdmin
      .from("quizzes")
      .select(`
        *,
        questions (*)
      `)
      .eq("id", quizId)
      .single();

    if (error) throw error;
    return data;
  }

  // 📌 GET ALL QUIZZES
  async getAll() {
    const { data, error } = await supabaseAdmin
      .from("quizzes")
      .select("*");

    if (error) throw error;
    return data;
  }
}

module.exports = new QuizRepository();
