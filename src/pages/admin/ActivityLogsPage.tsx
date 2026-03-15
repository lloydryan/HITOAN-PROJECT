import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../../firebase";
import { ActivityLog } from "../../types";
import { dtActivity } from "../../utils/format";

function formatEntityDisplay(log: ActivityLog): string {
  const meta = log.metadata as { orderNumber?: string } | undefined;
  const type = log.entityType?.toLowerCase() ?? "";
  if (type === "orders" && meta?.orderNumber) return `Order #${meta.orderNumber}`;
  if (type === "orders") return "Order";
  if (type === "menu" || type === "menuitems") return "Menu";
  if (type === "payments") return "Payment";
  if (type === "costs") return "Cost";
  if (type === "users") return "User";
  return type ? type.charAt(0).toUpperCase() + type.slice(1).replace(/s$/, "") : "-";
}

function formatActor(log: ActivityLog): { name: string; role: string } {
  const role = (log.actorRole ?? "").charAt(0).toUpperCase() + (log.actorRole ?? "").slice(1);
  return { name: log.actorName ?? "-", role };
}

function formatActionLabel(action: string): string {
  return action.replace(/_/g, " ");
}

function getActionBadgeClass(action: string): string {
  if (/CREATE/.test(action) && !/PAYMENT|ORDER_PAYMENT/.test(action)) return "activity-badge-create";
  if (/DELETE|VOID/.test(action)) return "activity-badge-delete";
  if (/PAYMENT|ORDER_PAYMENT/.test(action)) return "activity-badge-payment";
  return "activity-badge-update";
}

/** Capitalize status words in messages like "Updated order status to ready" -> "Ready" */
function formatMessage(msg: string): string {
  return msg.replace(/\bto\s+(\w+)$/i, (_, word) =>
    `to ${word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()}`
  );
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [action, setAction] = useState("");
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  useEffect(() => {
    const q = query(collection(db, "activityLogs"), orderBy("createdAt", "desc"));
    getDocs(q)
      .then((snap) => setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ActivityLog[]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      logs.filter((log) => {
        const matchAction = action ? log.action === action : true;
        const text = `${formatMessage(log.message)} ${log.actorName} ${log.entityType} ${log.entityId}`.toLowerCase();
        const matchKeyword = keyword ? text.includes(keyword.toLowerCase()) : true;
        return matchAction && matchKeyword;
      }),
    [logs, keyword, action]
  );

  const actions = Array.from(new Set(logs.map((l) => l.action)));

  return (
    <div className="card">
      <div className="card-body">
        <h5>Activity Logs</h5>
        <div className="row g-2 mb-3">
          <div className="col-md-4">
            <input className="form-control" placeholder="Search..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          </div>
          <div className="col-md-3">
            <select className="form-select" value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="">All actions</option>
              {actions.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="spinner-border text-primary" />
        ) : (
          <div className="table-responsive activity-logs-table-wrap">
            <table className="table table-sm activity-logs-table">
              <thead>
                <tr>
                  <th>Date</th><th>Action</th><th>Actor</th><th>Entity</th><th>Message</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => {
                  const actor = formatActor(log);
                  return (
                  <tr
                    key={log.id}
                    className="activity-log-row"
                    onClick={() => setSelectedLog(log)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && setSelectedLog(log)}
                  >
                    <td className="activity-log-date">{dtActivity(log.createdAt?.toDate())}</td>
                    <td><span className={`badge ${getActionBadgeClass(log.action)}`}>{formatActionLabel(log.action)}</span></td>
                    <td><span className="activity-log-actor-name">{actor.name}</span><br /><span className="activity-log-actor-role">{actor.role}</span></td>
                    <td>{formatEntityDisplay(log)}</td>
                    <td>
                      {formatMessage(log.message)}
                      {(log.metadata as { employeeId?: string } | undefined)?.employeeId ? (
                        <div className="small text-muted">
                          Employee ID: {(log.metadata as { employeeId?: string }).employeeId}
                        </div>
                      ) : null}
                      {(log.metadata as { crewEmployeeId?: string } | undefined)?.crewEmployeeId ? (
                        <div className="small text-muted">
                          Crew ID: {(log.metadata as { crewEmployeeId?: string }).crewEmployeeId}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );})}
              </tbody>
            </table>
          </div>
        )}

        {selectedLog && (
          <div className="modal fade show d-block" tabIndex={-1} style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setSelectedLog(null)}>
            <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Activity Log Details</h5>
                  <button type="button" className="btn-close" onClick={() => setSelectedLog(null)} aria-label="Close" />
                </div>
                <div className="modal-body">
                  <dl className="row mb-0">
                    <dt className="col-sm-3">Date</dt>
                    <dd className="col-sm-9">{dtActivity(selectedLog.createdAt?.toDate())}</dd>
                    <dt className="col-sm-3">Action</dt>
                    <dd className="col-sm-9"><span className={`badge ${getActionBadgeClass(selectedLog.action)}`}>{formatActionLabel(selectedLog.action)}</span></dd>
                    <dt className="col-sm-3">Actor</dt>
                    <dd className="col-sm-9"><span className="activity-log-actor-name">{formatActor(selectedLog).name}</span><br /><span className="activity-log-actor-role">{formatActor(selectedLog).role}</span></dd>
                    <dt className="col-sm-3">Entity</dt>
                    <dd className="col-sm-9">{formatEntityDisplay(selectedLog)}</dd>
                    <dt className="col-sm-3">Message</dt>
                    <dd className="col-sm-9">{formatMessage(selectedLog.message)}</dd>
                    {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                      <>
                        <dt className="col-sm-3">Metadata</dt>
                        <dd className="col-sm-9"><pre className="mb-0 small bg-light p-2 rounded">{JSON.stringify(selectedLog.metadata, null, 2)}</pre></dd>
                      </>
                    )}
                  </dl>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setSelectedLog(null)}>Close</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
