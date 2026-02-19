import { useEffect, useState } from "react";
import { MenuItem } from "../../types";
import { createMenuItem, deleteMenuItem, getMenuItems, updateMenuItem } from "../../services/menuService";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MenuSchema, menuSchema } from "../../schemas/menuSchema";
import { currency } from "../../utils/format";

export default function MenuPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [selected, setSelected] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => getMenuItems().then(setItems).finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<MenuSchema>({
    resolver: zodResolver(menuSchema),
    defaultValues: { name: "", category: "", price: 0, isAvailable: true }
  });

  const openCreate = () => {
    setSelected(null);
    reset({ name: "", category: "", price: 0, isAvailable: true });
  };

  const openEdit = (item: MenuItem) => {
    setSelected(item);
    reset({
      name: item.name,
      category: item.category,
      price: item.price,
      isAvailable: item.isAvailable
    });
  };

  const onSubmit = async (values: MenuSchema) => {
    if (!user) return;
    try {
      if (selected) {
        await updateMenuItem(user, selected.id, values);
        showToast("Success", "Menu item updated");
      } else {
        await createMenuItem(user, values);
        showToast("Success", "Menu item created");
      }
      await load();
      const modal = document.getElementById("menuModal");
      if (modal) (window as any).bootstrap.Modal.getInstance(modal)?.hide();
    } catch (e) {
      showToast("Error", (e as Error).message, "danger");
    }
  };

  const remove = async (id: string) => {
    if (!user || !confirm("Delete this item?")) return;
    try {
      await deleteMenuItem(user, id);
      showToast("Deleted", "Menu item deleted");
      await load();
    } catch (e) {
      showToast("Error", (e as Error).message, "danger");
    }
  };

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">Menu Items</h5>
          <button className="btn btn-primary" data-bs-toggle="modal" data-bs-target="#menuModal" onClick={openCreate}>
            Add Item
          </button>
        </div>

        {loading ? (
          <div className="spinner-border text-primary" />
        ) : (
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Name</th><th>Category</th><th>Price</th><th>Availability</th><th />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.category}</td>
                    <td>{currency(item.price)}</td>
                    <td>
                      <span className={`badge ${item.isAvailable ? "bg-success" : "bg-secondary"}`}>
                        {item.isAvailable ? "Available" : "Unavailable"}
                      </span>
                    </td>
                    <td className="text-end">
                      <button className="btn btn-sm btn-outline-primary me-2" data-bs-toggle="modal" data-bs-target="#menuModal" onClick={() => openEdit(item)}>Edit</button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => remove(item.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="modal fade" id="menuModal" tabIndex={-1}>
        <div className="modal-dialog">
          <div className="modal-content">
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="modal-header">
                <h5 className="modal-title">{selected ? "Edit Menu Item" : "Create Menu Item"}</h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" />
              </div>
              <div className="modal-body d-grid gap-3">
                <div>
                  <label className="form-label">Name</label>
                  <input className="form-control" {...register("name")} />
                  <small className="text-danger">{errors.name?.message}</small>
                </div>
                <div>
                  <label className="form-label">Category</label>
                  <input className="form-control" {...register("category")} />
                  <small className="text-danger">{errors.category?.message}</small>
                </div>
                <div>
                  <label className="form-label">Price</label>
                  <input className="form-control" type="number" step="0.01" {...register("price")} />
                  <small className="text-danger">{errors.price?.message}</small>
                </div>
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" {...register("isAvailable")} />
                  <label className="form-check-label">Available</label>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" type="button" data-bs-dismiss="modal">Close</button>
                <button className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
