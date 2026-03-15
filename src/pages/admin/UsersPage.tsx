import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AppUser } from "../../types";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import {
  createManagedUser,
  listUsers,
  updateManagedUser
} from "../../services/userService";
import {
  createUserSchema,
  CreateUserSchema,
  editUserSchema,
  EditUserSchema
} from "../../schemas/userSchema";

export default function UsersPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  const load = () =>
    listUsers()
      .then((rows) => {
        setUsers(rows);
      })
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const createForm = useForm<CreateUserSchema>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      displayName: "",
      employeeId: "",
      email: "",
      password: "",
      role: "crew"
    }
  });

  const editForm = useForm<EditUserSchema>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      displayName: "",
      employeeId: "",
      role: "crew"
    }
  });

  const onCreate = async (values: CreateUserSchema) => {
    if (!user) return;
    try {
      await createManagedUser(user, values);
      showToast("User created", `${values.email} is ready to log in.`);
      createForm.reset({ displayName: "", employeeId: "", email: "", password: "", role: "crew" });
      setShowCreateModal(false);
      await load();
    } catch (e) {
      showToast("Create failed", (e as Error).message, "danger");
    }
  };

  const openEditModal = (targetUser: AppUser) => {
    setEditingUser(targetUser);
    editForm.reset({
      displayName: targetUser.displayName || "",
      employeeId: targetUser.employeeId || "",
      role: targetUser.role
    });
    setShowEditModal(true);
  };

  const onEditUser = async (values: EditUserSchema) => {
    if (!editingUser) return;
    if (!user) return;

    try {
      setSavingId(editingUser.id);
      await updateManagedUser(user, editingUser.id, values);
      showToast("User updated", `${editingUser.email} was updated.`);
      setShowEditModal(false);
      setEditingUser(null);
      await load();
    } catch (e) {
      showToast("Update failed", (e as Error).message, "danger");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <>
      <div className="row g-3">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">User Management</h5>
                <button type="button" className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                  Add User
                </button>
              </div>
              {loading ? (
                <div className="spinner-border text-primary" />
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm app-table align-middle">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Employee ID</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id}>
                          <td>{u.displayName}</td>
                          <td>{u.employeeId || "-"}</td>
                          <td>{u.email}</td>
                          <td>{u.role}</td>
                          <td className="text-end">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              disabled={savingId === u.id}
                              onClick={() => openEditModal(u)}
                            >
                              Edit
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

      {showCreateModal && (
        <>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Add User</h5>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={() => setShowCreateModal(false)}
                  />
                </div>
                <form className="modal-body d-grid gap-2" onSubmit={createForm.handleSubmit(onCreate)}>
                  <div>
                    <label className="form-label">Display Name</label>
                    <input className="form-control" {...createForm.register("displayName")} />
                    <small className="text-danger">{createForm.formState.errors.displayName?.message}</small>
                  </div>
                  <div>
                    <label className="form-label">Email</label>
                    <input className="form-control" type="email" {...createForm.register("email")} />
                    <small className="text-danger">{createForm.formState.errors.email?.message}</small>
                  </div>
                  <div>
                    <label className="form-label">Employee ID</label>
                    <input className="form-control" {...createForm.register("employeeId")} />
                    <small className="text-danger">{createForm.formState.errors.employeeId?.message}</small>
                  </div>
                  <div>
                    <label className="form-label">Password</label>
                    <input className="form-control" type="password" {...createForm.register("password")} />
                    <small className="text-danger">{createForm.formState.errors.password?.message}</small>
                  </div>
                  <div>
                    <label className="form-label">Role</label>
                    <select className="form-select" {...createForm.register("role")}>
                      <option value="admin">admin</option>
                      <option value="cashier">cashier</option>
                      <option value="crew">crew</option>
                      <option value="kitchen">kitchen</option>
                    </select>
                  </div>
                  <div className="modal-footer px-0 pb-0">
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setShowCreateModal(false)}>
                      Cancel
                    </button>
                    <button className="btn btn-primary" disabled={createForm.formState.isSubmitting}>
                      {createForm.formState.isSubmitting ? "Creating..." : "Add User"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setShowCreateModal(false)} />
        </>
      )}

      {showEditModal && editingUser && (
        <>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Edit User</h5>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingUser(null);
                    }}
                  />
                </div>
                <form className="modal-body d-grid gap-2" onSubmit={editForm.handleSubmit(onEditUser)}>
                  <div>
                    <label className="form-label">Display Name</label>
                    <input className="form-control" {...editForm.register("displayName")} />
                    <small className="text-danger">{editForm.formState.errors.displayName?.message}</small>
                  </div>
                  <div>
                    <label className="form-label">Employee ID</label>
                    <input className="form-control" {...editForm.register("employeeId")} />
                    <small className="text-danger">{editForm.formState.errors.employeeId?.message}</small>
                  </div>
                  <div>
                    <label className="form-label">Role</label>
                    <select className="form-select" {...editForm.register("role")}>
                      <option value="admin">admin</option>
                      <option value="cashier">cashier</option>
                      <option value="crew">crew</option>
                      <option value="kitchen">kitchen</option>
                    </select>
                  </div>
                  <div className="modal-footer px-0 pb-0">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => {
                        setShowEditModal(false);
                        setEditingUser(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button className="btn btn-primary" disabled={editForm.formState.isSubmitting || savingId === editingUser.id}>
                      {editForm.formState.isSubmitting || savingId === editingUser.id ? "Saving..." : "Update User"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div
            className="modal-backdrop fade show"
            onClick={() => {
              setShowEditModal(false);
              setEditingUser(null);
            }}
          />
        </>
      )}
    </>
  );
}
