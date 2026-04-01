import { useEffect, useMemo, useState } from "react";
import { MenuItem } from "../../types";
import { createMenuItem, deleteMenuItem, getMenuItems, updateMenuItem } from "../../services/menuService";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MenuSchema, menuSchema } from "../../schemas/menuSchema";
import { currency } from "../../utils/format";

async function closeMenuModal() {
  const modal = document.getElementById("menuModal");
  if (!modal) return;

  const dismissBtn = modal.querySelector<HTMLButtonElement>('[data-bs-dismiss="modal"]');
  if (dismissBtn) {
    dismissBtn.click();
    return;
  }

  const bootstrapFromWindow = (window as any)?.bootstrap?.Modal;
  if (bootstrapFromWindow) {
    bootstrapFromWindow.getOrCreateInstance(modal).hide();
    return;
  }

  const bootstrapModule = await import("bootstrap");
  bootstrapModule.Modal.getOrCreateInstance(modal).hide();
}

export default function MenuPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [selected, setSelected] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState("");

  const load = () => getMenuItems().then(setItems).finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const existingCategories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category).filter(Boolean))).sort(),
    [items],
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<MenuSchema>({
    resolver: zodResolver(menuSchema),
    defaultValues: { name: "", category: "", price: 0, isAvailable: true, newCategory: "" }
  });

  const openCreate = () => {
    setSelected(null);
    setIsAddingNewCategory(false);
    setNewCategoryInput("");
    reset({ name: "", category: "", price: 0, isAvailable: true, newCategory: "" });
  };

  const openEdit = (item: MenuItem) => {
    setSelected(item);
    const catInList = existingCategories.includes(item.category);
    setIsAddingNewCategory(!catInList);
    setNewCategoryInput(catInList ? "" : item.category);
    reset({
      name: item.name,
      category: catInList ? item.category : "__new__",
      price: item.price,
      isAvailable: item.isAvailable,
      newCategory: catInList ? "" : item.category
    });
  };

  const onSubmit = async (values: MenuSchema) => {
    if (!user) return;
    const resolvedCategory =
      values.category === "__new__" ? newCategoryInput.trim() : values.category;
    if (isAddingNewCategory && !resolvedCategory) {
      showToast("Validation", "Please type a category name", "warning");
      return;
    }
    const toSave = { ...values, category: resolvedCategory };
    if (!toSave.category || toSave.category.length < 2) {
      showToast("Validation", "Category must be at least 2 characters", "warning");
      return;
    }
    try {
      if (selected) {
        await updateMenuItem(user, selected.id, toSave);
        showToast("Success", "Menu item updated");
      } else {
        await createMenuItem(user, toSave);
        showToast("Success", "Menu item created");
      }

      await closeMenuModal();

      await load();
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
            <table className="table table-sm app-table">
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

      <div
        className="modal fade"
        id="menuModal"
        tabIndex={-1}
        data-bs-backdrop="static"
        data-bs-keyboard="false"
      >
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
                  <select
                    className="form-select"
                    {...register("category", {
                    onChange: (e) => {
                      const isNew = e.target.value === "__new__";
                      setIsAddingNewCategory(isNew);
                      if (!isNew) {
                        setNewCategoryInput("");
                        setValue("newCategory", "");
                      }
                    }
                  })}
                    aria-label="Category"
                  >
                    <option value="">— Select category —</option>
                    {existingCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="__new__">➕ Add new category</option>
                  </select>
                  {isAddingNewCategory && (
                    <input
                      type="text"
                      className="form-control mt-2"
                      placeholder="Type new category name"
                      value={newCategoryInput}
                      onChange={(e) => {
                        const v = e.target.value;
                        setNewCategoryInput(v);
                        setValue("newCategory", v, { shouldValidate: true });
                      }}
                      aria-label="New category name"
                    />
                  )}
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
