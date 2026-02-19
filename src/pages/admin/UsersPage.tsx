import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppUser, UserRole } from "../../types";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import {
  createManagedUser,
  listUsers,
  updateUserEmployeeId,
  updateUserRole
} from "../../services/userService";
import { createUserSchema, CreateUserSchema } from "../../schemas/userSchema";
import { dt } from "../../utils/format";

export default function UsersPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, UserRole>>({});
  const [employeeIdDrafts, setEmployeeIdDrafts] = useState<Record<string, string>>({});

  const load = () =>
    listUsers()
      .then((rows) => {
        setUsers(rows);
        const drafts: Record<string, UserRole> = {};
        rows.forEach((u) => {
          drafts[u.id] = u.role;
        });
        setRoleDrafts(drafts);
        const idDrafts: Record<string, string> = {};
        rows.forEach((u) => {
          idDrafts[u.id] = u.employeeId || "";
        });
        setEmployeeIdDrafts(idDrafts);
      })
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<CreateUserSchema>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      displayName: "",
      employeeId: "",
      email: "",
      password: "",
      role: "crew"
    }
  });

  const onCreate = async (values: CreateUserSchema) => {
    if (!user) return;
    try {
      await createManagedUser(user, values);
      showToast("User created", `${values.email} is ready to log in.`);
      reset({ displayName: "", employeeId: "", email: "", password: "", role: "crew" });
      await load();
    } catch (e) {
      showToast("Create failed", (e as Error).message, "danger");
    }
  };

  const onSaveRole = async (targetUser: AppUser) => {
    if (!user) return;
    const nextRole = roleDrafts[targetUser.id];
    if (!nextRole || nextRole === targetUser.role) return;

    try {
      setSavingId(targetUser.id);
      await updateUserRole(user, targetUser.id, nextRole);
      showToast("Role updated", `${targetUser.email} is now ${nextRole}.`);
      await load();
    } catch (e) {
      showToast("Update failed", (e as Error).message, "danger");
    } finally {
      setSavingId(null);
    }
  };

  const onSaveEmployeeId = async (targetUser: AppUser) => {
    if (!user) return;
    const nextEmployeeId = (employeeIdDrafts[targetUser.id] || "").trim();
    if (!nextEmployeeId || nextEmployeeId === (targetUser.employeeId || "")) return;

    try {
      setSavingId(targetUser.id);
      await updateUserEmployeeId(user, targetUser.id, nextEmployeeId);
      showToast("Employee ID updated", `${targetUser.email} is now ${nextEmployeeId}.`);
      await load();
    } catch (e) {
      showToast("Update failed", (e as Error).message, "danger");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="row g-3">
      <div className="col-lg-4">
        <div className="card">
          <div className="card-body">
            <h5>Create User</h5>
            <p className="text-muted small mb-3">
              This creates Firebase Auth credentials and Firestore profile.
            </p>
            <form className="d-grid gap-2" onSubmit={handleSubmit(onCreate)}>
              <div>
                <label className="form-label">Display Name</label>
                <input className="form-control" {...register("displayName")} />
                <small className="text-danger">{errors.displayName?.message}</small>
              </div>
              <div>
                <label className="form-label">Email</label>
                <input className="form-control" type="email" {...register("email")} />
                <small className="text-danger">{errors.email?.message}</small>
              </div>
              <div>
                <label className="form-label">Employee ID</label>
                <input className="form-control" {...register("employeeId")} />
                <small className="text-danger">{errors.employeeId?.message}</small>
              </div>
              <div>
                <label className="form-label">Password</label>
                <input className="form-control" type="password" {...register("password")} />
                <small className="text-danger">{errors.password?.message}</small>
              </div>
              <div>
                <label className="form-label">Role</label>
                <select className="form-select" {...register("role")}>
                  <option value="admin">admin</option>
                  <option value="cashier">cashier</option>
                  <option value="crew">crew</option>
                  <option value="kitchen">kitchen</option>
                </select>
              </div>
              <button className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create User"}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="col-lg-8">
        <div className="card">
          <div className="card-body">
            <h5>User Management</h5>
            {loading ? (
              <div className="spinner-border text-primary" />
            ) : (
              <div className="table-responsive">
                <table className="table table-striped align-middle">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Employee ID</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Created</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>{u.displayName}</td>
                        <td style={{ width: 180 }}>
                          <input
                            className="form-control form-control-sm"
                            value={employeeIdDrafts[u.id] ?? ""}
                            onChange={(e) =>
                              setEmployeeIdDrafts((prev) => ({
                                ...prev,
                                [u.id]: e.target.value
                              }))
                            }
                          />
                        </td>
                        <td>{u.email}</td>
                        <td style={{ width: 170 }}>
                          <select
                            className="form-select form-select-sm"
                            value={roleDrafts[u.id] ?? u.role}
                            onChange={(e) =>
                              setRoleDrafts((prev) => ({
                                ...prev,
                                [u.id]: e.target.value as UserRole
                              }))
                            }
                          >
                            <option value="admin">admin</option>
                            <option value="cashier">cashier</option>
                            <option value="crew">crew</option>
                            <option value="kitchen">kitchen</option>
                          </select>
                        </td>
                        <td>{dt(u.createdAt?.toDate())}</td>
                        <td className="text-end">
                          <button
                            className="btn btn-sm btn-outline-secondary me-2"
                            disabled={savingId === u.id || (employeeIdDrafts[u.id] || "").trim() === (u.employeeId || "")}
                            onClick={() => onSaveEmployeeId(u)}
                          >
                            Save ID
                          </button>
                          <button
                            className="btn btn-sm btn-outline-primary"
                            disabled={savingId === u.id || roleDrafts[u.id] === u.role}
                            onClick={() => onSaveRole(u)}
                          >
                            {savingId === u.id ? "Saving..." : "Save Role"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
