import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginSchema } from "../schemas/loginSchema";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useToast } from "../hooks/useToast";
import { useEffect } from "react";

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (values: LoginSchema) => {
    try {
      await login(values.email, values.password);
    } catch {
      showToast("Login Failed", "Invalid credentials or missing Firestore user profile", "danger");
    }
  };

  useEffect(() => {
    if (!loading && user) {
      navigate("/", { replace: true });
    }
  }, [loading, user, navigate]);

  return (
    <div className="login-page">
      <div className="login-bg" aria-hidden />
      <div className="login-card-wrap">
        <div className="login-card">
          <div className="login-brand">
            <img src="/logo.jpg" alt="J. LIMBAGA'S HITOAN & BBQ - Restaurant POS" className="login-logo" />
          </div>

          <div className="login-form-wrap">
            <h2 className="login-heading">Welcome Back</h2>
            <p className="login-subtitle">Sign in to continue · Restaurant POS System</p>

            <form onSubmit={handleSubmit(onSubmit)} className="login-form">
              <div className="login-field">
                <label className="login-label">Email</label>
                <input
                  className="login-input"
                  type="email"
                  placeholder="you@example.com"
                  {...register("email")}
                />
                {errors.email?.message && (
                  <span className="login-error">{errors.email.message}</span>
                )}
              </div>
              <div className="login-field">
                <label className="login-label">Password</label>
                <input
                  className="login-input"
                  type="password"
                  placeholder="••••••••"
                  {...register("password")}
                />
                {errors.password?.message && (
                  <span className="login-error">{errors.password.message}</span>
                )}
              </div>
              <button
                type="submit"
                className="login-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Signing in..." : "Sign In"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
