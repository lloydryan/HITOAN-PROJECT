import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../../firebase";
import { ActivityLog } from "../../types";
import { dt } from "../../utils/format";

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [action, setAction] = useState("");

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
        const text = `${log.message} ${log.actorName} ${log.entityType} ${log.entityId}`.toLowerCase();
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
          <div className="table-responsive">
            <table className="table table-striped table-sm">
              <thead>
                <tr>
                  <th>Date</th><th>Action</th><th>Actor</th><th>Entity</th><th>Message</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log.id}>
                    <td>{dt(log.createdAt?.toDate())}</td>
                    <td><span className="badge bg-dark">{log.action}</span></td>
                    <td>{log.actorName} ({log.actorRole})</td>
                    <td>{log.entityType}/{log.entityId}</td>
                    <td>
                      {log.message}
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
