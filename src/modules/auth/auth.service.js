const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { supabaseAdmin } = require("../../config/supabase.config");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

class AuthService {

  //  SIGN UP - HOST ONLY
  async signup(email, password, username) {
    // Validate input
    if (!email || !password || !username) {
      throw new Error("Email, password, and username are required");
    }

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from("users")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    if (existingUser) {
      throw new Error("Email already registered");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user in database
    const { data, error } = await supabaseAdmin
      .from("users")
      .insert([
        {
          email,
          username: username.trim(),
          password_hash: hashedPassword,
          role: "host" // Host-specific role
        }
      ])
      .select()
      .single();

    if (error) throw new Error(`Signup failed: ${error.message}`);

    // Generate JWT token
    const token = this.generateToken(data.id, data.email);

    return {
      user: {
        id: data.id,
        email: data.email,
        username: data.username,
        role: data.role
      },
      token,
      message: "Signup successful"
    };
  }

  //  LOGIN - HOST ONLY
  async login(email, password) {
    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    // Get user from database
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (!user || error) {
      throw new Error("Invalid email or password");
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      throw new Error("Invalid email or password");
    }

    // Generate JWT token
    const token = this.generateToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role || "host"
      },
      token,
      message: "Login successful"
    };
  }

  //  GET USER FROM TOKEN
  async getUser(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const { data: user, error } = await supabaseAdmin
        .from("users")
        .select("id, email, username, role")
        .eq("id", decoded.userId)
        .single();

      if (error || !user) throw new Error("User not found");
      return user;
    } catch (err) {
      throw new Error("Invalid or expired token");
    }
  }

  //  VERIFY TOKEN (for middleware)
  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (err) {
      throw new Error("Invalid or expired token");
    }
  }

  // LOGOUT (invalidate token - handled by client)
  logout() {
    // Token-based auth: client should discard token
    return { message: "Logout successful" };
  }

  // Helper: Generate JWT
  generateToken(userId, email) {
    return jwt.sign(
      { userId, email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
  }

  // Helper: Ensure user profile
  async ensureUserProfile(user) {
    const username = user.user_metadata?.username
      || user.email?.split("@")[0]
      || "User";

    const { error } = await supabaseAdmin
      .from("users")
      .upsert({
        id: user.id,
        email: user.email,
        username,
        role: "host"
      }, { onConflict: "id" });

    if (error) throw error;
  }
}

module.exports = new AuthService();
