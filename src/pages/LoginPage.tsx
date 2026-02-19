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
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-5">
          <div className="card shadow-sm">
            <div className="card-body p-4">
              <h4 className="mb-4">Restaurant Management Login</h4>
              <form onSubmit={handleSubmit(onSubmit)} className="d-grid gap-3">
                <div>
                  <label className="form-label">Email</label>
                  <input className="form-control" type="email" {...register("email")} />
                  <small className="text-danger">{errors.email?.message}</small>
                </div>
                <div>
                  <label className="form-label">Password</label>
                  <input className="form-control" type="password" {...register("password")} />
                  <small className="text-danger">{errors.password?.message}</small>
                </div>
                <button className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Signing in..." : "Login"}
                </button>
              </form>
            </div>
          </div>
          <p className="text-muted small mt-3">Accounts are managed via Firebase Authentication and Firestore users collection.</p>
        </div>
      </div>
    </div>
  );
}
