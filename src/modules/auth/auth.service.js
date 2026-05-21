const { supabase, supabaseAdmin } = require("../../config/supabase.config");

class AuthService {

  // 🟢 SIGN UP
  async signup(email, password, username) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username
        }
      }
    });

    if (error) throw error;

    if (data.user) {
      await this.ensureUserProfile(data.user);
    }

    return data;
  }

  // 🟢 LOGIN
  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    if (data.user) {
      await this.ensureUserProfile(data.user);
    }

    return data;
  }

  // 🟢 GET USER FROM TOKEN
  async getUser(token) {
    const { data, error } = await supabase.auth.getUser(token);

    if (error) throw error;
    return data.user;
  }

  async ensureUserProfile(user) {
    const username = user.user_metadata?.username
      || user.email?.split("@")[0]
      || "User";

    const { error } = await supabaseAdmin
      .from("users")
      .upsert({
        id: user.id,
        email: user.email,
        username
      }, { onConflict: "id" });

    if (error) throw error;
  }
}

module.exports = new AuthService();
