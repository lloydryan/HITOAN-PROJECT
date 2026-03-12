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
    <div className="container py-5 login-page">
      <div className="row justify-content-center align-items-center">
        <div className="col-12 col-md-10 col-lg-8 col-xl-7">
          <div className="card shadow-sm login-card">
            <div className="card-body p-0">
              <div className="login-shell">
                <div className="login-brand-pane">
                  <img src="/logo.jpg" alt="HITOAN" className="login-brand-logo" />
                  <h2 className="login-brand-title mb-2">HITOAN</h2>
                  <p className="login-brand-subtitle mb-0">
                    Restaurant POS System
                  </p>
                </div>

                <div className="login-form-pane">
                  <h4 className="mb-1 login-title">Welcome Back</h4>
                  <p className="login-subtitle mb-4">
                    Sign in to continue.
                  </p>

                  <form onSubmit={handleSubmit(onSubmit)} className="d-grid gap-3">
                <div>
                  <label className="form-label">Email</label>
                  <input className="form-control login-input" type="email" {...register("email")} />
                  <small className="text-danger">{errors.email?.message}</small>
                </div>
                <div>
                  <label className="form-label">Password</label>
                  <input className="form-control login-input" type="password" {...register("password")} />
                  <small className="text-danger">{errors.password?.message}</small>
                </div>
                    <button className="btn btn-primary login-btn" disabled={isSubmitting}>
                      {isSubmitting ? "Signing in..." : "Login"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
